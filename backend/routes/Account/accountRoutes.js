// => public/routes/Account/accountRoutes.js
// => First WRITE-capable student routes - every other student route
//    (Enrollments, Documents, Classes, Payments) is read-only.
// => submissionLimiter is reused for the PATCH endpoints since it's
//    already tuned for legitimate-retry-after-validation-error traffic,
//    same reasoning as the enrollment submission routes.
// => No CSRF middleware yet, matching the rest of the student side - flag
//    to revisit before production once studentAuth's cookie SameSite
//    setting is confirmed.

import express from 'express';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, submissionLimiter, floodLimiter } from '../../middleware/rateLimiters.js';
import { csrfProtection } from '../../middleware/studentCsrf.js';
import { getMyAccount, updateMyProfile, changeMyPassword } from '../../controllers/Account/accountController.js';

const router = express.Router();

// => GET /api/account - combined profile + address, for the page's initial load
// => floodLimiter (IP, pre-auth) -> protectStudent (auth) -> readLimiter (per-student, post-auth)
router.get('/', floodLimiter, protectStudent, readLimiter, getMyAccount);

// => PATCH /api/account/profile - Form 1: contact info + address
router.patch('/profile', floodLimiter, protectStudent, csrfProtection, submissionLimiter, updateMyProfile);

// => PATCH /api/account/password - Form 2: password reset, separate endpoint per your direction
router.patch('/password', floodLimiter, protectStudent, csrfProtection, submissionLimiter, changeMyPassword);

export default router;
