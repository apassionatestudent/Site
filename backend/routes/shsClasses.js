import express from 'express';
import { getShsClasses } from '../controllers/shsClassController.js';

const router = express.Router();

// => Public fetch - no auth needed, same as classes.js
router.get('/', getShsClasses);

export default router;