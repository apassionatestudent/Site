import express from 'express';
import { loginStudent, logoutStudent, getMe, requestPasswordReset, setPassword } from '../controllers/studentAuthController.js';
import { protectStudent } from '../middleware/studentAuth.js';
import { authLimiter, readLimiter, floodLimiter } from '../middleware/rateLimiters.js';

const studentAuthRouter = express.Router();

// => Public routes: no token required
// => registerStudent removed - dead code, accounts are only ever created
// => via the enrollment-then-invite-link flow, never direct registration
studentAuthRouter.post('/login', authLimiter, loginStudent);
studentAuthRouter.post('/logout', logoutStudent);

// => Password setup (post-enrollment) and forgot-password reset - same
// => limiter as login/register since both are pre-auth and equally
// => attractive to abuse (token brute-forcing, email flooding)
studentAuthRouter.post('/forgot-password', authLimiter, requestPasswordReset);
studentAuthRouter.post('/set-password', authLimiter, setPassword);

// => Protected route: token required
// => floodLimiter (IP, pre-auth) => protectStudent (auth) => readLimiter (per-student, post-auth)
studentAuthRouter.get('/me', floodLimiter, protectStudent, readLimiter, getMe);

export default studentAuthRouter;