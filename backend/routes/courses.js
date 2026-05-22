import express from 'express';
import { getCoursesByBranch } from '../controllers/courseController.js';

const router = express.Router();

// => Public fetch - no auth needed
router.get('/', getCoursesByBranch);

export default router;