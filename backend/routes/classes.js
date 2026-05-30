import express from 'express';
import { getClasses } from '../controllers/classController.js';

const router = express.Router();

// => Public fetch - no auth needed
router.get('/', getClasses);

export default router;