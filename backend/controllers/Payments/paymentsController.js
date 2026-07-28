// => backend/controllers/Payments/paymentsController.js

import { getStudentPayments, getStudentPaymentDetail } from '../../services/Payments/paymentsService.js';

// => GET /api/payments/my-payments
export const getMyPayments = async (req, res) => {
  try {
    const payments = await getStudentPayments(req.student.student_id);
    return res.status(200).json({ payments });
  } catch (error) {
    console.error('getMyPayments error:', error);
    return res.status(500).json({ message: 'Server error fetching payments.' });
  }
};

// => GET /api/payments/:publicId
export const getPaymentDetail = async (req, res) => {
  try {
    const { publicId } = req.params;
    const payment = await getStudentPaymentDetail(publicId, req.student.student_id);

    // => null covers not found OR not owned (IDOR prevention)
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    return res.status(200).json({ payment });
  } catch (error) {
    console.error('getPaymentDetail error:', error);
    return res.status(500).json({ message: 'Server error fetching payment detail.' });
  }
};