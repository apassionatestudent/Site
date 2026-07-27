// => public/services/Classes/tesdaClassesService.js

import { pool } from '../../config/db.js';
import { getTesdaBatchByPublicId } from '../../models/Classes/tesdaClassesModel.js';

export const getStudentTesdaBatchDetail = async (publicId, studentId) => {
  return await getTesdaBatchByPublicId(pool, publicId, studentId);
};