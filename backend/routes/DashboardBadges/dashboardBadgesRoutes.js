import express from 'express';
import { protectStudent } from '../../middleware/studentAuth.js';
import { floodLimiter, readLimiter } from '../../middleware/rateLimiters.js';
import { getDashboardBadges } from '../../controllers/DashboardBadges/dashboardBadgesController.js';

const router = express.Router();

// => floodLimiter first (IP-based, pre-auth), then protectStudent, then readLimiter (per-student, post-auth)
// => matches the layering convention used on your other protected student routes
router.get('/', floodLimiter, protectStudent, readLimiter, getDashboardBadges);

export default router;
