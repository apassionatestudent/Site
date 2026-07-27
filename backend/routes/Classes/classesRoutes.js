// => public/routes/Classes/classesRoutes.js
// => Read-only: students can view but never modify scheduling.
// => Mirrors sharedEnrollmentRoutes.js's rate limit + auth ordering.

import express from 'express';
import { getMyBatches } from '../../controllers/Classes/sharedClassesController.js';
import { getTesdaClassDetail } from '../../controllers/Classes/tesdaClassesController.js';
import { getShsClassDetail } from '../../controllers/Classes/shsClassesController.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, floodLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => Protected: list of batches from Approved enrollments only
router.get('/my-batches', floodLimiter, protectStudent, readLimiter, getMyBatches);

// => Protected: single batch detail, split by track since TESDA and SHS
//    batches differ in structure (one trainer vs two, course vs cluster)
router.get('/tesda/:publicId', floodLimiter, protectStudent, readLimiter, getTesdaClassDetail);
router.get('/shs/:publicId', floodLimiter, protectStudent, readLimiter, getShsClassDetail);

export default router;