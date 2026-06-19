import express from 'express';
import { registerStudent, loginStudent, logoutStudent, getMe } from '../controllers/studentAuthController.js';
import { protectStudent } from '../middleware/studentAuth.js';
import { authLimiter, readLimiter, floodLimiter } from '../middleware/rateLimiters.js';

const studentAuthRouter = express.Router();

// => Public routes: no token required
studentAuthRouter.post('/register', authLimiter, registerStudent);
studentAuthRouter.post('/login', authLimiter, loginStudent);
studentAuthRouter.post('/logout', logoutStudent);

// => Protected route: token required
// => floodLimiter (IP, pre-auth) => protectStudent (auth) => readLimiter (per-student, post-auth)
studentAuthRouter.get('/me', floodLimiter, protectStudent, readLimiter, getMe);

export default studentAuthRouter;