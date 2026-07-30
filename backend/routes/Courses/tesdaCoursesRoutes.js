import express from 'express';
import { getTesdaCoursesList, getTesdaCourseDetail } from '../../controllers/Courses/tesdaCoursesController.js';

const router = express.Router();

// => GET /api/public/tesda-courses - active course list for the public grid
router.get('/', getTesdaCoursesList);

// => GET /api/public/tesda-courses/:title - single course, looked up by exact title
router.get('/:title', getTesdaCourseDetail);

export default router;