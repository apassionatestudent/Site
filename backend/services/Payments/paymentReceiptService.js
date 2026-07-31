// => backend/services/Payments/paymentReceiptService.js
// => Builds the payment receipt PDF as a Buffer for the student-facing
// => download. Reuses getStudentPaymentDetail instead of re-querying, so
// => the receipt always matches what the PaymentDetail page shows.
// => This is a separate copy from the admin backend's receipt service -
// => the two codebases share zero code by policy - but draws on the same
// => shared Utils/receiptPdfLayout.js helper within THIS backend.

import PDFDocument from 'pdfkit';
import { getStudentPaymentDetail } from './paymentsService.js';
import {
  registerReceiptFonts,
  drawReceiptHeader,
  drawInfoSection,
  drawReceiptFooter
} from '../../Utils/receiptPdfLayout.js';

// => pdfkit's base font has no peso glyph, "PHP" prefix avoids a broken
// => "±" character - same reasoning as the admin backend's version.
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

// => First name, middle initial (not full middle name), last name -
// => matches admin's receipt naming convention. Skips the initial
// => entirely when there's no middle name instead of leaving a stray ".".
function formatStudentName(payment) {
  const middleInitial = payment.middle_name ? `${payment.middle_name.charAt(0).toUpperCase()}.` : null;
  return [payment.first_name, middleInitial, payment.last_name].filter(Boolean).join(' ');
}

// => Builds the Batch value, appending NC level when present (TESDA
// => only - SHS rows carry nc_level = null from the model, so this just
// => falls through to the plain batch label for SHS receipts).
function formatBatchWithNcLevel(payment) {
  const batchLabel = payment.batch_sequence
    ? `${payment.batch_name} (Batch ${payment.batch_sequence})`
    : payment.batch_name;

  return payment.nc_level ? `${batchLabel} \u00b7 ${payment.nc_level}` : batchLabel;
}

// => Returns a Buffer, or null if the publicId doesn't belong to this
// => student. getStudentPaymentDetail already scopes by studentId, so
// => this can never leak another student's payment - IDOR prevention
// => stays in the model layer, same as the rest of this backend.
export async function generatePaymentReceiptPdf(publicId, studentId) {
  const payment = await getStudentPaymentDetail(publicId, studentId);
  if (!payment) return null;

  // => Returns { buffer, receiptNumber } instead of a bare Buffer, so the
  // => controller can build a Content-Disposition filename that matches
  // => admin's "Receipt-<number>.pdf" pattern without a second DB round
  // => trip just to look up the OR number again.
  const buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    registerReceiptFonts(doc);

    drawReceiptHeader(doc, {
      docTitle: 'Official Receipt',
      receiptNumber: payment.or_number,
      issuedDate: formatDate(payment.payment_date)
    });

    drawInfoSection(doc, 'Student', [
      { label: 'Name', value: formatStudentName(payment) },
      { label: 'Email', value: payment.student_email }
    ]);

    // => Program shows enrollment_type ('TESDA' / 'SHS') - a NOT NULL
    // => column - not course_title, matching admin's findPaymentByPublicId
    // => receipt exactly. course_title can be legitimately NULL (SHS
    // => course_id is optional until assigned), which is what produced
    // => the blank "-" here before this fix. NC level rides along on the
    // => Batch line instead of its own row, since it only applies to
    // => TESDA and there's no dedicated course-title row on this receipt.
    drawInfoSection(doc, 'Enrollment', [
      { label: 'Program', value: payment.enrollment_type },
      { label: 'Batch', value: formatBatchWithNcLevel(payment) },
      { label: 'Enrollment ID', value: payment.enrollment_public_id }
    ]);

    // => Amount paid only - no balance/fee breakdown, matching admin's
    // => receipt exactly. The on-screen PaymentDetail page still shows
    // => the full balance snapshot; this PDF is a record of THIS
    // => transaction only.
    drawInfoSection(doc, 'Payment', [
      { label: 'Amount Paid', value: formatCurrency(payment.amount) },
      { label: 'Payment Method', value: payment.payment_method },
      { label: 'Payment Date', value: formatDate(payment.payment_date) },
      { label: 'Status', value: payment.status }
    ]);

    if (payment.remarks) {
      drawInfoSection(doc, 'Remarks', [
        { label: 'Note', value: payment.remarks }
      ]);
    }

    if (payment.status === 'Voided') {
      drawInfoSection(doc, 'Void Details', [
        { label: 'Reason', value: payment.void_reason },
        { label: 'Voided At', value: formatDate(payment.voided_at) }
      ]);
    }

    drawReceiptFooter(doc, 'This receipt is system-generated and valid without a physical signature.');

    doc.end();
  });

  return { buffer, receiptNumber: payment.or_number };
}
