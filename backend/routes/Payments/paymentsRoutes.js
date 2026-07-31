// => backend/routes/Payments/paymentsRoutes.js
// => Read-only: students can view and download but never create, edit,
// => or void payments or refunds. Mirrors classesRoutes.js's rate limit
// => + auth ordering.
// => Route order matters: literal/multi-segment routes must be
// => registered before '/:publicId', otherwise Express would match them
// => as a publicId param and never reach the literal routes.

import express from 'express';
import { getMyPayments, getPaymentDetail, getMyBalances, downloadPaymentReceipt } from '../../controllers/Payments/paymentsController.js';
import { getMyRefunds, getRefundDetail, downloadRefundReceipt } from '../../controllers/Payments/refundsController.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, floodLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

router.get('/my-payments', floodLimiter, protectStudent, readLimiter, getMyPayments);
router.get('/my-refunds', floodLimiter, protectStudent, readLimiter, getMyRefunds);

// => Per-enrollment remaining balance for the Payments list page's
// => balance cards
router.get('/my-balances', floodLimiter, protectStudent, readLimiter, getMyBalances);

// => Two/three-segment paths, unaffected by ordering relative to the
// => single-segment '/:publicId' catch-all below
router.get('/refund/:publicId/receipt', floodLimiter, protectStudent, readLimiter, downloadRefundReceipt);
router.get('/refund/:publicId', floodLimiter, protectStudent, readLimiter, getRefundDetail);

// => Two-segment path for a payment's PDF receipt, must be registered
// => before the single-segment catch-all below
router.get('/:publicId/receipt', floodLimiter, protectStudent, readLimiter, downloadPaymentReceipt);

// => Catch-all single-segment route, must stay last
router.get('/:publicId', floodLimiter, protectStudent, readLimiter, getPaymentDetail);

export default router;
