// => backend/routes/Logs/logsRoutes.js
// => Read-only, student-scoped activity log history. Mirrors
// => paymentsRoutes.js's rate limit + auth ordering exactly.

import express from 'express';
import { getMyLogs } from '../../controllers/Logs/logsController.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, floodLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

router.get('/my-logs', floodLimiter, protectStudent, readLimiter, getMyLogs);

export default router;