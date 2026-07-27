// => public/routes/Enrollments/tesdaEnrollmentRoutes.js
// => Split out of the old enrollmentRoutes.js - TESDA-only submission
//    endpoint. Mounted at the same '/api/enrollment' prefix as
//    sharedEnrollmentRoutes.js and shsEnrollmentRoutes.js in server.js.

import express from 'express';
import { submitTesdaEnrollment } from '../../controllers/Enrollments/tesdaEnrollmentController.js';
import { upload } from '../../middleware/upload.js';
import { submissionLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => uploadDocs middleware runs first (parses files to memory buffer),
// => then submitTesdaEnrollment controller runs with req.files already populated
router.post('/submit', submissionLimiter, upload, submitTesdaEnrollment);

export default router;
