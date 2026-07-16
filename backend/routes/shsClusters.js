import express from 'express';
import { getShsClusterCourses } from '../controllers/shsClusterController.js';

const router = express.Router();

// => Public fetch - no auth needed, same as shsClasses.js
router.get('/', getShsClusterCourses);

export default router;