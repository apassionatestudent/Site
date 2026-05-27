import express from 'express';
import { protectStudent } from '../middleware/studentAuth.js';
import { proxyDocument } from '../controllers/documentProxyController.js';

const router = express.Router();

// => GET /api/documents/:documentKey
// => protectStudent runs first - if auth fails, proxyDocument never executes
// => documentKey can contain slashes (e.g. primeenroll/student-docs/birthCert_123.jpg)
// => encode them as %2F on the client side before calling this route
router.get('/:documentKey', protectStudent, proxyDocument);

export default router;