import express from 'express';
import { submitEnrollment } from '../controllers/enrollmentController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// => uploadDocs middleware runs first (parses files to Cloudinary),
// => then submitEnrollment controller runs with req.files already populated
router.post('/submit', upload, submitEnrollment);

export default router;