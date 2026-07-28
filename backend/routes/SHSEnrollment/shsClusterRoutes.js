import express from 'express';
import { getShsClusters, getShsClusterCourses } from '../../controllers/SHSEnrollment/shsClusterController.js';

const router = express.Router();

// => Public fetch - no auth needed. List all clusters for the picker.
router.get('/', getShsClusters);

// => Curriculum (courses) for a single cluster, shown inline per cluster card
router.get('/:clusterId/courses', getShsClusterCourses);

export default router;
