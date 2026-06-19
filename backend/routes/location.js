// /**
//  * I won't put this into controllers nor models folder since it's just reading from JSON files and returning the data. No database interaction, no complex logic, just simple filtering and mapping. 
//  * So I think it's fine to just keep it as a single router file for now. If we end up adding more location-related endpoints or if the logic gets more complex, then we can consider refactoring into controllers and models. 
//  * But for now, this is straightforward enough to not require that level of abstraction.
//  */

// import express from 'express';
// import { readFileSync } from 'fs'; // => file system module to read JSON files, needed in ES modules since I don't use commonJS.
// import { fileURLToPath } from 'url'; // => path utility functions for working with file paths 
// import { dirname, join } from 'path';

// const __filename = fileURLToPath(import.meta.url); // => Get current file's full path
// const __dirname = dirname(__filename); // => current directory path from the filename

// // => Load location data from JSON files on the backend folder. No database setup needed. 
// const regions  = JSON.parse(readFileSync(join(__dirname, '../regions.json'), 'utf-8'));
// const provinces = JSON.parse(readFileSync(join(__dirname, '../provinces.json'), 'utf-8'));
// const cities   = JSON.parse(readFileSync(join(__dirname, '../cities-municipalities.json'), 'utf-8'));


// const router = express.Router(); // => Express router to handle location-related API endpoints

// // GET /regions => returns list of all regions with their codes and names
// router.get('/regions', (req, res) => {
//   res.json(regions.map(r => ({ code: r.code, name: r.regionName })));
// });

// // GET /provinces/:regionCode => returns list of provinces in the specified region to ensure correctness of data alright! 
// router.get('/provinces/:regionCode', (req, res) => {
//   const filtered = provinces
//     .filter(p => p.regionCode === req.params.regionCode)
//     .map(p => ({ code: p.code, name: p.name }));
//   res.json(filtered);
// });

// // GET /cities/:provinceCode => returns list of cities/municipalities in the specified province
// router.get('/cities/:provinceCode', (req, res) => {
//   const filtered = cities
//     .filter(c => c.provinceCode === req.params.provinceCode)
//     .map(c => ({ code: c.code, name: c.name }));
//   res.json(filtered);
// });

// // => For regions with no provinces (e.g. NCR), fetch cities directly by regionCode
// router.get('/cities-by-region/:regionCode', (req, res) => {
//   const filtered = cities
//     .filter(c => c.regionCode === req.params.regionCode)
//     .map(c => ({ code: c.code, name: c.name }));
//   res.json(filtered);
// });

// // => Load barangays - kept separate due to large file size (10MB+), kept at the bottom to prevent unnecessary loading. 
// const barangays = JSON.parse(readFileSync(join(__dirname, '../barangays.json'), 'utf-8')); 

// // GET /barangays/:cityCode => returns barangays under a specific city/municipality
// // => barangays.json uses cityCode for cities and municipalityCode for municipalities - never both
// // => so we check both fields against the incoming code to cover all cases
// router.get('/barangays/:cityCode', (req, res) => {
//   const code = req.params.cityCode;
//   const filtered = barangays
//     .filter(b => b.cityCode === code || b.municipalityCode === code)
//     .map(b => ({ code: b.code, name: b.name }));
//   res.json(filtered);
// });

// export default router;

/**
 * Location routes - uses psgc.cloud hierarchy endpoints.
 * These are cleaner and more reliable than bulk + prefix matching.
 *
 * Endpoint pattern:
 * GET /api/regions                                     => all regions
 * GET /api/regions/{code}/provinces                    => provinces in a region
 * GET /api/provinces/{code}/cities-municipalities      => cities+municipalities in a province
 * GET /api/regions/{code}/cities-municipalities        => cities+municipalities in a region (NCR)
 * GET /api/v1/barangays?city_code= or municipality_code= => barangays per city
 */
import express from 'express';

const router = express.Router();
const BASE = 'https://psgc.cloud/api';
const Barangays = 'https://psgc.gitlab.io/api/';
const BASE_V1 = 'https://psgc.cloud/api/v1';
const BASE_V2 = 'https://psgc.cloud/api/v2';

// => Validates that a PSGC code is digits-only before it's ever used to
// => build an outbound URL or as a cache key. Closes off cache-key
// => pollution and guarantees only well-formed values reach fetch().
// => Adjust {2,10} if psgc.cloud's actual code lengths differ from this.
const isValidPsgcCode = (code) => typeof code === 'string' && /^\d{2,10}$/.test(code);

// => Plain string concatenation - NOT the URL constructor. new URL(path, base)
// => was tried here first, but a leading "/" in `path` causes it to silently
// => drop the "/api" segment from BASE (resolves to psgc.cloud/regions/...
// => instead of psgc.cloud/api/regions/...). Concatenation is safe here
// => because BASE is a hardcoded constant (no SSRF risk) and the code
// => segment is already regex-validated as digits-only by isValidPsgcCode()
// => before this function is ever called.
const buildPsgcUrl = (base, path) => `${base}${path}`;

// => In-memory cache - regions cached on startup, others cached on first request
let cache = {
  regions: [],
  provincesByRegion: {},    // => keyed by regionCode
  citiesByProvince: {},     // => keyed by provinceCode
  citiesByRegion: {},       // => keyed by regionCode (for NCR)
  barangaysByParent: {},
};

// => Fetch only regions on startup - small list, stable
export const loadLocationCache = async () => {
  try {
    console.log('Loading regions from psgc.cloud...');
    const regions = await fetch(`${BASE}/regions`).then(r => r.json());
    cache.regions = regions;
    console.log(`Regions loaded - ${regions.length} regions`);
  } catch (err) {
    console.error('Failed to load regions from psgc.cloud:', err);
  }
};

// GET /regions
router.get('/regions', (req, res) => {
  res.json(cache.regions.map(r => ({ code: r.code, name: r.name })));
});

// GET /provinces/:regionCode
// => Uses hierarchy endpoint: /api/regions/{code}/provinces
router.get('/provinces/:regionCode', async (req, res) => {
  const regionCode = req.params.regionCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  if (!isValidPsgcCode(regionCode)) {
    return res.status(400).json({ error: 'Invalid region code format' });
  }

  // => Return from cache if already fetched
  if (cache.provincesByRegion[regionCode]) {
    return res.json(cache.provincesByRegion[regionCode]);
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/regions/${regionCode}/provinces`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(p => ({ code: p.code, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // => Cache for next time
    cache.provincesByRegion[regionCode] = mapped;
    res.json(mapped);
  } catch (err) {
    console.error('Failed to fetch provinces:', err);
    res.json([]);
  }
});

// GET /cities/:provinceCode
// => Uses hierarchy endpoint: /api/provinces/{code}/cities-municipalities
router.get('/cities/:provinceCode', async (req, res) => {
  const provinceCode = req.params.provinceCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  // => (closes CodeQL SSRF alert #9)
  if (!isValidPsgcCode(provinceCode)) {
    return res.status(400).json({ error: 'Invalid province code format' });
  }

  if (cache.citiesByProvince[provinceCode]) {
    return res.json(cache.citiesByProvince[provinceCode]);
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/provinces/${provinceCode}/cities-municipalities`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(c => ({
        code: c.code,
        name: c.name,
        zip: c.zip_code || '',
        district: c.district || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.citiesByProvince[provinceCode] = mapped;
    res.json(mapped);
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    res.json([]);
  }
});

// GET /cities-by-region/:regionCode
// => Uses hierarchy endpoint: /api/regions/{code}/cities-municipalities (for NCR)
router.get('/cities-by-region/:regionCode', async (req, res) => {
  const regionCode = req.params.regionCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  if (!isValidPsgcCode(regionCode)) {
    return res.status(400).json({ error: 'Invalid region code format' });
  }

  if (cache.citiesByRegion[regionCode]) {
    return res.json(cache.citiesByRegion[regionCode]);
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/regions/${regionCode}/cities-municipalities`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(c => ({
        code: c.code,
        name: c.name,
        zip: c.zip_code || '',
        district: c.district || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.citiesByRegion[regionCode] = mapped;
    res.json(mapped);
  } catch (err) {
    console.error('Failed to fetch region cities:', err);
    res.json([]);
  }
});

// GET /barangays/:cityCode
// => v1 API: try city_code first, fallback to municipality_code
// router.get('/barangays/:cityCode', async (req, res) => {
//   const code = req.params.cityCode;

//   try {
//     // // => Try city_code first
//     // let response = await fetch(`${BASE}/barangays?city_code=${code}&per_page=200`);
//     // let data = await response.json();
//     // let barangays = Array.isArray(data) ? data : (data.data || []);

//     // // => If empty, try municipality_code
//     // if (barangays.length === 0) {
//     //   response = await fetch(`${BASE}/barangays?municipality_code=${code}&per_page=200`);
//     //   data = await response.json();
//     //   barangays = Array.isArray(data) ? data : (data.data || []);
//     // }

//     // => Try city_code first
//     let response = await fetch(`${Barangays}cities/${code}/barangays/`);
//     let data = await response.json();
//     let barangays = Array.isArray(data) ? data : (data.data || []);

//     // // => If empty, try municipality_code
//     // if (barangays.length === 0) {
//     //   response = await fetch(`${Barangays}municipalities/?municipalityCode=${code}/barangays`);
//     //   data = await response.json();
//     //   barangays = Array.isArray(data) ? data : (data.data || []);
//     // }

//     res.json(barangays.map(b => ({ code: b.code, name: b.name })));
//   } catch (err) {
//     console.error(`Failed to fetch barangays for ${code}:`, err);
//     res.json([]);
//   }
// });

// GET /barangays/:cityCode
// => Uses psgc.cloud hierarchy: /api/cities/{code}/barangays or /api/municipalities/{code}/barangays
// => psgc.cloud codes are 10 digits - no conversion needed, use them directly
router.get('/barangays/:cityCode', async (req, res) => {
  const code = req.params.cityCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  // => (closes CodeQL SSRF alerts #11 and #12)
  if (!isValidPsgcCode(code)) {
    return res.status(400).json({ error: 'Invalid city/municipality code format' });
  }

  // => Return from cache if already fetched
  if (cache.barangaysByParent[code]) {
    return res.json(cache.barangaysByParent[code]);
  }

  try {
    // => Try city endpoint first
    let response = await fetch(buildPsgcUrl(BASE, `/cities/${code}/barangays`));

    // => Fallback to municipality endpoint if city returns 404 or empty
    if (!response.ok) {
      response = await fetch(buildPsgcUrl(BASE, `/municipalities/${code}/barangays`));
    }

    if (!response.ok) {
      // => SECURITY: code is now a separate arg, not embedded in the
      // => format-string position (closes CodeQL alert #13 - format string)
      console.warn('Barangays not found on psgc.cloud for code:', code);
      return res.json([]);
    }

    const data = await response.json();
    const mapped = (Array.isArray(data) ? data : [])
      .map(b => ({ code: b.code, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // => Cache to avoid re-fetching same city
    cache.barangaysByParent[code] = mapped;
    res.json(mapped);

  } catch (err) {
    // => SECURITY: code passed as a separate arg, never inside the
    // => format-string position (closes CodeQL alert #13)
    console.error('Failed to fetch barangays for code:', code, err);
    res.json([]);
  }
});

// GET /barangays/:cityCode
// => psgc.cloud separates city_code and municipality_code - try both in parallel
// => whichever returns data wins; the other will be empty
// router.get('/barangays/:cityCode', async (req, res) => {
//   const code = req.params.cityCode;

//   try {
//     const [cityResult, munResult] = await Promise.all([
//       fetch(`${BASE_V2}/barangays?city_code=${code}&per_page=500`).then(r => r.json()),
//       fetch(`${BASE_V2}/barangays?municipality_code=${code}&per_page=500`).then(r => r.json()),
//     ]);

//     const cityBarangays = Array.isArray(cityResult) ? cityResult : (cityResult.data || []);
//     const munBarangays  = Array.isArray(munResult)  ? munResult  : (munResult.data  || []);

//     // => Use whichever returned data; merge in case both somehow return results
//     const merged = [...cityBarangays, ...munBarangays];
//     res.json(merged.map(b => ({ code: b.code, name: b.name }))
//       .sort((a, b) => a.name.localeCompare(b.name)));
//   } catch (err) {
//     console.error(`Failed to fetch barangays for ${code}:`, err);
//     res.json([]);
//   }
// });

export default router;