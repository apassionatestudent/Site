// import express from 'express';
// import { submitEnrollment } from '../controllers/enrollmentController.js';
// import { upload } from '../middleware/upload.js';

// const router = express.Router();

// // => uploadDocs middleware runs first (parses files to Cloudinary),
// // => then submitEnrollment controller runs with req.files already populated
// router.post('/submit', upload, submitEnrollment);

// export default router;

import express from 'express';
import { submitEnrollment, getMyEnrollments, getMyEnrollmentDetail } from '../controllers/enrollmentController.js';
import { upload } from '../middleware/upload.js';
import { protectStudent } from '../middleware/studentAuth.js';

const router = express.Router();

// => uploadDocs middleware runs first (parses files to memory buffer),
// => then submitEnrollment controller runs with req.files already populated
router.post('/submit', upload, submitEnrollment);

// => Protected: only logged-in students can fetch their own enrollments
router.get('/my-enrollments', protectStudent, getMyEnrollments);

// => Protected: fetch a single enrollment by its public UUID
// => protectStudent ensures the enrollment belongs to the requesting student
router.get('/:publicId', protectStudent, getMyEnrollmentDetail);

export default router;