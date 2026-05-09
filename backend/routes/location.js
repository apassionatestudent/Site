/**
 * I won't put this into controllers nor models folder since it's just reading from JSON files and returning the data. No database interaction, no complex logic, just simple filtering and mapping. 
 * So I think it's fine to just keep it as a single router file for now. If we end up adding more location-related endpoints or if the logic gets more complex, then we can consider refactoring into controllers and models. 
 * But for now, this is straightforward enough to not require that level of abstraction.
 */

import express from 'express';
import { readFileSync } from 'fs'; // => file system module to read JSON files, needed in ES modules since I don't use commonJS.
import { fileURLToPath } from 'url'; // => path utility functions for working with file paths 
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url); // => Get current file's full path
const __dirname = dirname(__filename); // => current directory path from the filename

// => Load location data from JSON files on the backend folder. No database setup needed. 
const regions  = JSON.parse(readFileSync(join(__dirname, '../regions.json'), 'utf-8'));
const provinces = JSON.parse(readFileSync(join(__dirname, '../provinces.json'), 'utf-8'));
const cities   = JSON.parse(readFileSync(join(__dirname, '../cities-municipalities.json'), 'utf-8'));

const router = express.Router(); // => Express router to handle location-related API endpoints

// GET /regions => returns list of all regions with their codes and names
router.get('/regions', (req, res) => {
  res.json(regions.map(r => ({ code: r.code, name: r.regionName })));
});

// GET /provinces/:regionCode => returns list of provinces in the specified region to ensure correctness of data alright! 
router.get('/provinces/:regionCode', (req, res) => {
  const filtered = provinces
    .filter(p => p.regionCode === req.params.regionCode)
    .map(p => ({ code: p.code, name: p.name }));
  res.json(filtered);
});

// GET /cities/:provinceCode => returns list of cities/municipalities in the specified province
router.get('/cities/:provinceCode', (req, res) => {
  const filtered = cities
    .filter(c => c.provinceCode === req.params.provinceCode)
    .map(c => ({ code: c.code, name: c.name }));
  res.json(filtered);
});

// => For regions with no provinces (e.g. NCR), fetch cities directly by regionCode
router.get('/cities-by-region/:regionCode', (req, res) => {
  const filtered = cities
    .filter(c => c.regionCode === req.params.regionCode)
    .map(c => ({ code: c.code, name: c.name }));
  res.json(filtered);
});

export default router;