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

// => Repairs "mojibake" that some PSGC upstream data has baked in - text
// => that was UTF-8 but got mis-decoded as Latin-1 somewhere before it
// => reached psgc.cloud's own database. Correct UTF-8 bytes for "ñ" are
// => 0xC3 0xB1; read as Latin-1 instead of UTF-8, that becomes two
// => separate characters: "Ã" (0xC3) + "±" (0xB1) - exactly what shows
// => up as "ParaÃ±aque" instead of "Parañaque". Re-interpreting the
// => already-decoded JS string as raw Latin-1 bytes, then decoding THAT
// => as UTF-8, reverses the mistake. Only runs when the "Ã" + Latin-1
// => continuation-byte pattern is actually present, so correctly-encoded
// => strings without the bug pass through untouched.
const MOJIBAKE_PATTERN = /Ã[\u0080-\u00BF]/;

const fixMojibake = (str) => {
  if (typeof str !== 'string' || !MOJIBAKE_PATTERN.test(str)) return str;
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch {
    return str; // => if re-decoding fails for any reason, fall back to original
  }
};

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

// => Sync lookup, no fetch needed - regions are already cached on startup.
//    Exported so activity-log diffing can resolve a region_code to a
//    readable name without going through HTTP. Same prefix-matching
//    fallback as admin's copy, since psgc.cloud short codes and the
//    10-digit codes stored in student_address don't always match exactly.
export const getRegionName = (regionCode) => {
  const match = cache.regions.find(r =>
    regionCode === r.code ||
    regionCode.startsWith(r.code) ||
    r.code.startsWith(regionCode)
  );
  return fixMojibake(match?.name || match?.regionName || match?.label || regionCode);
};

// GET /regions
// => psgc.cloud returns regionName, not name - handle both just in case
router.get('/regions', (req, res) => {
  res.json(cache.regions.map(r => ({ 
    code: r.code, 
    name: fixMojibake(r.name || r.regionName || r.label || '')
  })));
});

// GET /provinces/:regionCode
// => Uses hierarchy endpoint: /api/regions/{code}/provinces
// => Extracted so other backend modules (activity-log diffing) can reuse
//    this without an HTTP round trip to this router's own route.
export const getProvinces = async (regionCode) => {
  if (!isValidPsgcCode(regionCode)) return [];

  if (cache.provincesByRegion[regionCode]) {
    return cache.provincesByRegion[regionCode];
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/regions/${regionCode}/provinces`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(p => ({ code: p.code, name: fixMojibake(p.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.provincesByRegion[regionCode] = mapped;
    return mapped;
  } catch (err) {
    console.error('Failed to fetch provinces:', err);
    return [];
  }
};

router.get('/provinces/:regionCode', async (req, res) => {
  const regionCode = req.params.regionCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  if (!isValidPsgcCode(regionCode)) {
    return res.status(400).json({ error: 'Invalid region code format' });
  }

  res.json(await getProvinces(regionCode));
});

// GET /cities/:provinceCode
// => Uses hierarchy endpoint: /api/provinces/{code}/cities-municipalities
// => Extracted so other backend modules (activity-log diffing) can reuse
//    this without an HTTP round trip to this router's own route.
export const getCitiesByProvince = async (provinceCode) => {
  if (!isValidPsgcCode(provinceCode)) return [];

  if (cache.citiesByProvince[provinceCode]) {
    return cache.citiesByProvince[provinceCode];
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/provinces/${provinceCode}/cities-municipalities`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(c => ({
        code: c.code,
        name: fixMojibake(c.name),
        zip: c.zip_code || '',
        district: c.district || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.citiesByProvince[provinceCode] = mapped;
    return mapped;
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    return [];
  }
};

router.get('/cities/:provinceCode', async (req, res) => {
  const provinceCode = req.params.provinceCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  // => (closes CodeQL SSRF alert #9)
  if (!isValidPsgcCode(provinceCode)) {
    return res.status(400).json({ error: 'Invalid province code format' });
  }

  res.json(await getCitiesByProvince(provinceCode));
});

// GET /cities-by-region/:regionCode
// => Uses hierarchy endpoint: /api/regions/{code}/cities-municipalities (for NCR)
// => Extracted so other backend modules (activity-log diffing) can reuse
//    this without an HTTP round trip to this router's own route.
export const getCitiesByRegion = async (regionCode) => {
  if (!isValidPsgcCode(regionCode)) return [];

  if (cache.citiesByRegion[regionCode]) {
    return cache.citiesByRegion[regionCode];
  }

  try {
    const data = await fetch(buildPsgcUrl(BASE, `/regions/${regionCode}/cities-municipalities`))
      .then(r => r.json());

    const mapped = (Array.isArray(data) ? data : [])
      .map(c => ({
        code: c.code,
        name: fixMojibake(c.name),
        zip: c.zip_code || '',
        district: c.district || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.citiesByRegion[regionCode] = mapped;
    return mapped;
  } catch (err) {
    console.error('Failed to fetch region cities:', err);
    return [];
  }
};

router.get('/cities-by-region/:regionCode', async (req, res) => {
  const regionCode = req.params.regionCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  if (!isValidPsgcCode(regionCode)) {
    return res.status(400).json({ error: 'Invalid region code format' });
  }

  res.json(await getCitiesByRegion(regionCode));
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
// => Extracted so other backend modules (activity-log diffing) can reuse
//    this without an HTTP round trip to this router's own route.
export const getBarangays = async (code) => {
  if (!isValidPsgcCode(code)) return [];

  if (cache.barangaysByParent[code]) {
    return cache.barangaysByParent[code];
  }

  try {
    let response = await fetch(buildPsgcUrl(BASE, `/cities/${code}/barangays`));

    if (!response.ok) {
      response = await fetch(buildPsgcUrl(BASE, `/municipalities/${code}/barangays`));
    }

    if (!response.ok) {
      console.warn('Barangays not found on psgc.cloud for code:', code);
      return [];
    }

    const data = await response.json();
    const mapped = (Array.isArray(data) ? data : [])
      .map(b => ({ code: b.code, name: fixMojibake(b.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.barangaysByParent[code] = mapped;
    return mapped;

  } catch (err) {
    console.error('Failed to fetch barangays for code:', code, err);
    return [];
  }
};

router.get('/barangays/:cityCode', async (req, res) => {
  const code = req.params.cityCode;

  // => SECURITY: reject malformed codes before cache lookup or network call
  // => (closes CodeQL SSRF alerts #11 and #12)
  if (!isValidPsgcCode(code)) {
    return res.status(400).json({ error: 'Invalid city/municipality code format' });
  }

  res.json(await getBarangays(code));
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