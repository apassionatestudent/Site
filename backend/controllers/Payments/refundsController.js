// => backend/controllers/Payments/refundsController.js

import { getStudentRefunds, getStudentRefundDetail } from '../../services/Payments/refundsService.js';
import { generateRefundReceiptPdf } from '../../services/Payments/refundReceiptService.js';

// => GET /api/payments/my-refunds
export const getMyRefunds = async (req, res) => {
  try {
    const refunds = await getStudentRefunds(req.student.student_id);
    return res.status(200).json({ refunds });
  } catch (error) {
    console.error('getMyRefunds error:', error);
    return res.status(500).json({ message: 'Server error fetching refunds.' });
  }
};

// => GET /api/payments/refund/:publicId
export const getRefundDetail = async (req, res) => {
  try {
    const { publicId } = req.params;
    const refund = await getStudentRefundDetail(publicId, req.student.student_id);

    if (!refund) {
      return res.status(404).json({ message: 'Refund not found.' });
    }

    return res.status(200).json({ refund });
  } catch (error) {
    console.error('getRefundDetail error:', error);
    return res.status(500).json({ message: 'Server error fetching refund detail.' });
  }
};

// => GET /api/payments/refund/:publicId/receipt
export const downloadRefundReceipt = async (req, res) => {
  try {
    const { publicId } = req.params;
    const receipt = await generateRefundReceiptPdf(publicId, req.student.student_id);

    if (!receipt) {
      return res.status(404).json({ message: 'Refund not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    // => Matches admin's "Receipt-<number>.pdf" download filename pattern
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${receipt.receiptNumber}.pdf"`);
    return res.status(200).send(receipt.buffer);
  } catch (error) {
    console.error('downloadRefundReceipt error:', error);
    return res.status(500).json({ message: 'Server error generating receipt.' });
  }
};