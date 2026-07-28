// => backend/routes/Payments/paymentsRoutes.js
// => Read-only: students can view but never create, edit, or void payments
//    or refunds. Mirrors classesRoutes.js's rate limit + auth ordering.
// => Route order matters: '/my-payments' and '/my-refunds' must be
//    registered before '/:publicId', otherwise Express would match them
//    as a publicId param and never reach the literal routes.

import express from 'express';
import { getMyPayments, getPaymentDetail } from '../../controllers/Payments/paymentsController.js';
import { getMyRefunds, getRefundDetail } from '../../controllers/Payments/refundsController.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, floodLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

router.get('/my-payments', floodLimiter, protectStudent, readLimiter, getMyPayments);
router.get('/my-refunds', floodLimiter, protectStudent, readLimiter, getMyRefunds);

// => Two-segment path, so it's unaffected by ordering relative to '/:publicId'
router.get('/refund/:publicId', floodLimiter, protectStudent, readLimiter, getRefundDetail);

// => Catch-all single-segment route, must stay last
router.get('/:publicId', floodLimiter, protectStudent, readLimiter, getPaymentDetail);

export default router;