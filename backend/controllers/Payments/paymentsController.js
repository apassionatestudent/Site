// => backend/controllers/Payments/paymentsController.js

import { getStudentPayments, getStudentPaymentDetail, getStudentBalances } from '../../services/Payments/paymentsService.js';
import { generatePaymentReceiptPdf } from '../../services/Payments/paymentReceiptService.js';

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

// => GET /api/payments/my-balances
export const getMyBalances = async (req, res) => {
  try {
    const balances = await getStudentBalances(req.student.student_id);
    return res.status(200).json({ balances });
  } catch (error) {
    console.error('getMyBalances error:', error);
    return res.status(500).json({ message: 'Server error fetching balances.' });
  }
};

// => GET /api/payments/:publicId/receipt
export const downloadPaymentReceipt = async (req, res) => {
  try {
    const { publicId } = req.params;
    const receipt = await generatePaymentReceiptPdf(publicId, req.student.student_id);

    // => null covers not found OR not owned, same IDOR-safe null check
    // => used everywhere else in this controller
    if (!receipt) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    // => Matches admin's "Receipt-<number>.pdf" download filename pattern
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${receipt.receiptNumber}.pdf"`);
    return res.status(200).send(receipt.buffer);
  } catch (error) {
    console.error('downloadPaymentReceipt error:', error);
    return res.status(500).json({ message: 'Server error generating receipt.' });
  }
};