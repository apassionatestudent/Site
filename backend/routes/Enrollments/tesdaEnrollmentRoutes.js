// => public/routes/Enrollments/tesdaEnrollmentRoutes.js
// => Split out of the old enrollmentRoutes.js - TESDA-only submission
//    endpoint. Mounted at the same '/api/enrollment' prefix as
//    sharedEnrollmentRoutes.js and shsEnrollmentRoutes.js in server.js.

import express from 'express';
import { submitTesdaEnrollment, submitTesdaReEnrollment } from '../../controllers/Enrollments/tesdaEnrollmentController.js';
import { upload } from '../../middleware/upload.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { submissionLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => uploadDocs middleware runs first (parses files to memory buffer),
// => then submitTesdaEnrollment controller runs with req.files already populated
router.post('/submit', submissionLimiter, upload, submitTesdaEnrollment);

// => POST /api/enrollment/re-enroll/tesda
// => protectStudent runs BEFORE upload - auth reads a cookie/header, not
// => the multipart body, so it's safe to check identity before multer
// => parses the files. Existing student picking up another course.
router.post('/re-enroll/tesda', submissionLimiter, protectStudent, upload, submitTesdaReEnrollment);

export default router;