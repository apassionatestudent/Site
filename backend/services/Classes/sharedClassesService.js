// => public/services/Classes/sharedClassesService.js

import { pool } from '../../config/db.js';
import { getBatchesByStudentId } from '../../models/Classes/sharedClassesModel.js';

export const getStudentBatches = async (studentId) => {
  return await getBatchesByStudentId(pool, studentId);
};