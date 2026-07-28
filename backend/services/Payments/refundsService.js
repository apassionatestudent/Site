// => backend/services/Payments/refundsService.js

import { pool } from '../../config/db.js';
import { getRefundsByStudentId, getRefundByPublicId } from '../../models/Payments/refundsModel.js';

export const getStudentRefunds = async (studentId) => {
  return await getRefundsByStudentId(pool, studentId);
};

export const getStudentRefundDetail = async (publicId, studentId) => {
  return await getRefundByPublicId(pool, publicId, studentId);
};