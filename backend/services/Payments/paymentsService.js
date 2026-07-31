// => backend/services/Payments/paymentsService.js

import { pool } from '../../config/db.js';
import { getPaymentsByStudentId, getPaymentByPublicId, getBalancesByStudentId } from '../../models/Payments/paymentsModel.js';

export const getStudentPayments = async (studentId) => {
  return await getPaymentsByStudentId(pool, studentId);
};

export const getStudentPaymentDetail = async (publicId, studentId) => {
  return await getPaymentByPublicId(pool, publicId, studentId);
};

// => Per-enrollment remaining balance, powers the Payments list page's
// => balance cards
export const getStudentBalances = async (studentId) => {
  return await getBalancesByStudentId(pool, studentId);
};