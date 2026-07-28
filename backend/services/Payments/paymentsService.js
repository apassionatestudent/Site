// => backend/services/Payments/paymentsService.js

import { pool } from '../../config/db.js';
import { getPaymentsByStudentId, getPaymentByPublicId } from '../../models/Payments/paymentsModel.js';

export const getStudentPayments = async (studentId) => {
  return await getPaymentsByStudentId(pool, studentId);
};

export const getStudentPaymentDetail = async (publicId, studentId) => {
  return await getPaymentByPublicId(pool, publicId, studentId);
};