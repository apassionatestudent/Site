// => public/services/Classes/shsClassesService.js

import { pool } from '../../config/db.js';
import { getShsBatchByPublicId } from '../../models/Classes/shsClassesModel.js';

export const getStudentShsBatchDetail = async (publicId, studentId) => {
  return await getShsBatchByPublicId(pool, publicId, studentId);
};