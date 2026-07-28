import express from 'express';
import { getShsBatches } from '../../controllers/SHSEnrollment/shsBatchController.js';

const router = express.Router();

// => Public fetch - no auth needed, same as tesdaBatchRoutes
router.get('/', getShsBatches);

export default router;
