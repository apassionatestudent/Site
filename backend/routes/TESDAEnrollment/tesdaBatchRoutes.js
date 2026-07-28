// => routes/TESDAEnrollment/tesdaBatchRoutes.js
// => Renamed/relocated from routes/classes.js - route path stays whatever
//    server.js mounts it at (/api/classes), only the file location and
//    internal names changed. Not renamed to /api/batches to avoid
//    touching every frontend fetch call that already points at
//    /api/classes - this is a naming/architecture cleanup, not a URL change

import express from 'express';
import { getTesdaBatches } from '../../controllers/TESDAEnrollment/tesdaBatchController.js';

const router = express.Router();

// => Public fetch - no auth needed
router.get('/', getTesdaBatches);

export default router;
