import express from 'express';
import { getShsCoursesList, getShsCourseDetail } from '../../controllers/Courses/shsCoursesController.js';

const router = express.Router();

// => GET /api/public/shs-courses - active course list for the public grid
router.get('/', getShsCoursesList);

// => GET /api/public/shs-courses/:title - single course, looked up by exact title
router.get('/:title', getShsCourseDetail);

export default router;