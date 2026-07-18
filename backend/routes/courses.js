import express from 'express';
import { getCourses } from '../controllers/courseController.js';

const router = express.Router();

// => Public fetch - no auth needed
router.get('/', getCourses);

export default router;