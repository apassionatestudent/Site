import express from 'express';
import { protectStudent } from '../middleware/studentAuth.js';
import { proxyDocument } from '../controllers/documentProxyController.js';
import { getMyDocuments, getMyDocumentDetail } from '../controllers/documentController.js';

const router = express.Router();

// => GET /api/documents/my-documents
// => Returns all documents (enrollment + profile) for the logged-in student
// => Must be declared BEFORE /:documentKey so Express doesn't swallow "my-documents" as a key
router.get('/my-documents', protectStudent, getMyDocuments);

// => GET /api/documents/detail/:publicId
// => Returns one document's metadata by its public UUID, ownership-checked
// => Prefixed with /detail/ to avoid any collision with the proxy's :documentKey pattern
router.get('/detail/:publicId', protectStudent, getMyDocumentDetail);

// => GET /api/documents/:documentKey
// => protectStudent runs first - if auth fails, proxyDocument never executes
// => documentKey can contain slashes (e.g. primeenroll/student-docs/birthCert_123.jpg)
// => encode them as %2F on the client side before calling this route
router.get('/:documentKey', protectStudent, proxyDocument);

export default router;
