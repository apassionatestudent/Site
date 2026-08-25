// => public/routes/Enrollments/shsEnrollmentRoutes.js
// => Split out of the old enrollmentRoutes.js - SHS-only submission
//    endpoint. Mounted at the same '/api/enrollment' prefix as
//    sharedEnrollmentRoutes.js and tesdaEnrollmentRoutes.js in server.js.

import express from 'express';
import { submitShsEnrollment, submitShsReEnrollment } from '../../controllers/Enrollments/shsEnrollmentController.js';
import { uploadShs } from '../../middleware/upload.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { submissionLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => uploadShs middleware runs first (parses SHS's 4 file fields to memory
// => buffer), then submitShsEnrollment controller runs with req.files populated
router.post('/submit-shs', submissionLimiter, uploadShs, submitShsEnrollment);

// => POST /api/enrollment/re-enroll/shs
// => protectStudent runs BEFORE uploadShs - same reasoning as the TESDA
// => re-enroll route. Existing student re-entering SHS.
router.post('/re-enroll/shs', submissionLimiter, protectStudent, uploadShs, submitShsReEnrollment);

export default router;