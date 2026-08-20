// => routes/TESDAEnrollment/tesdaCourseRoutes.js
// => Renamed/relocated from routes/courses.js - route path unmounted here
//    stays whatever server.js mounts it at (/api/courses), only the file
//    location and internal names changed

import express from 'express';
import { getTesdaCourses, getTesdaCourseRequirements } from '../../controllers/TESDAEnrollment/tesdaCourseController.js';

const router = express.Router();

// => Public fetch - no auth needed
router.get('/', getTesdaCourses);

// => Public fetch - no auth needed, feeds the enrollment form's Upload
// => Requirements section for whichever course the student selects
router.get('/:courseId/requirements', getTesdaCourseRequirements);

export default router;
