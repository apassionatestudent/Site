import express from 'express';
import { listAnnouncements } from '../../controllers/Announcements/announcementController.js';

import { protectStudent } from '../../middleware/studentAuth.js';
// => floodLimiter (IP-based) runs before auth to stop raw request flooding,
// => readLimiter (student_id-based) runs after auth for per-student fairness
// => order mirrors documentRoutes.js and other protected student GET routes
import { floodLimiter, readLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => GET /api/announcements - read-only, no CSRF needed since csrfProtection
// => already skips GET/HEAD/OPTIONS internally (see studentCsrf.js), so it
// => isn't mounted here at all, matching other read-only student routes
router.get('/', floodLimiter, protectStudent, readLimiter, listAnnouncements);

export default router;