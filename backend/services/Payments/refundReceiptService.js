// => backend/services/Payments/refundReceiptService.js
// => Same structure as paymentReceiptService.js, kept as its own file
// => per the project's duplication policy. Reuses getStudentRefundDetail
// => so this always matches what RefundDetail shows on screen.

import PDFDocument from 'pdfkit';
import { getStudentRefundDetail } from './refundsService.js';
import {
  registerReceiptFonts,
  drawReceiptHeader,
  drawInfoSection,
  drawReceiptFooter
} from '../../Utils/receiptPdfLayout.js';

function formatCurrency(value) {
  const formattedNumber = Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `PHP ${formattedNumber}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// => First name, middle initial, last name - same convention as
// => paymentReceiptService.js's version.
function formatStudentName(refund) {
  const middleInitial = refund.middle_name ? `${refund.middle_name.charAt(0).toUpperCase()}.` : null;
  return [refund.first_name, middleInitial, refund.last_name].filter(Boolean).join(' ');
}

function formatRefundBasis(refund) {
  return refund.refund_type === 'Percentage'
    ? `${refund.percentage_value}% of course fee`
    : 'Fixed amount';
}

// => Builds the Batch value, appending NC level when present - same
// => helper shape as paymentReceiptService.js's version.
function formatBatchWithNcLevel(refund) {
  const batchLabel = refund.batch_sequence
    ? `${refund.batch_name} (Batch ${refund.batch_sequence})`
    : refund.batch_name;

  return refund.nc_level ? `${batchLabel} \u00b7 ${refund.nc_level}` : batchLabel;
}

// => Returns a Buffer, or null if the publicId doesn't belong to this
// => student - same IDOR-safe pattern as generatePaymentReceiptPdf.
export async function generateRefundReceiptPdf(publicId, studentId) {
  const refund = await getStudentRefundDetail(publicId, studentId);
  if (!refund) return null;

  // => Same { buffer, receiptNumber } shape as paymentReceiptService.js
  const buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    registerReceiptFonts(doc);

    drawReceiptHeader(doc, {
      docTitle: 'Refund Receipt',
      receiptNumber: refund.refund_number,
      issuedDate: formatDate(refund.created_at)
    });

    drawInfoSection(doc, 'Student', [
      { label: 'Name', value: formatStudentName(refund) },
      { label: 'Email', value: refund.student_email }
    ]);

    // => Same reasoning as paymentReceiptService.js - enrollment_type,
    // => not course_title, matches admin's naming and can't be blank.
    // => NC level rides along on the Batch line, TESDA only.
    drawInfoSection(doc, 'Enrollment', [
      { label: 'Program', value: refund.enrollment_type },
      { label: 'Batch', value: formatBatchWithNcLevel(refund) },
      { label: 'Enrollment ID', value: refund.enrollment_public_id }
    ]);

    // => Amount refunded only - no balance/fee breakdown, matching
    // => admin's receipt exactly. The on-screen RefundDetail page still
    // => shows the full balance snapshot; this PDF is a record of THIS
    // => transaction only.
    drawInfoSection(doc, 'Refund', [
      { label: 'Amount Refunded', value: formatCurrency(refund.amount) },
      { label: 'Basis', value: formatRefundBasis(refund) },
      { label: 'Refund Method', value: refund.refund_method },
      { label: 'Status', value: refund.status }
    ]);

    drawInfoSection(doc, 'Reason', [
      { label: 'Reason', value: refund.reason }
    ]);

    if (refund.remarks) {
      drawInfoSection(doc, 'Remarks', [
        { label: 'Note', value: refund.remarks }
      ]);
    }

    if (refund.status === 'Voided') {
      drawInfoSection(doc, 'Void Details', [
        { label: 'Reason', value: refund.void_reason },
        { label: 'Voided At', value: formatDate(refund.voided_at) }
      ]);
    }

    drawReceiptFooter(doc, 'This receipt is system-generated and valid without a physical signature.');

    doc.end();
  });

  return { buffer, receiptNumber: refund.refund_number };
}
