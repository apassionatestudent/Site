import express from 'express';
import { registerStudent, loginStudent, logoutStudent, getMe } from '../controllers/studentAuthController.js';
import { protectStudent } from '../middleware/studentAuth.js';
import { authLimiter, readLimiter } from '../middleware/rateLimiters.js';

const studentAuthRouter = express.Router();

// => Public routes: no token required
studentAuthRouter.post('/register', authLimiter, registerStudent);
studentAuthRouter.post('/login', loginStudent);
studentAuthRouter.post('/logout', logoutStudent);

// => Protected route: token required
// => readLimiter runs first, then protectStudent, then getMe
studentAuthRouter.get('/me', readLimiter, protectStudent, getMe);

export default studentAuthRouter;