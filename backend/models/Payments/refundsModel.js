// => backend/models/Payments/refundsModel.js
// => Read-only refund history for the logged-in student, covering both
// => TESDA and SHS. Mirrors paymentsModel.js's shape, ownership-check,
// => and enrollment_type-gated-JOIN pattern exactly.

// => Both TESDA and SHS refunds for this student, combined via
// => UNION ALL - same pattern as paymentsModel.js's getPaymentsByStudentId
export const getRefundsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `(
        SELECT
            r.public_id, r.refund_number, r.refund_type, r.percentage_value,
            r.amount, r.refund_method, r.reason, r.status, r.created_at,
            te.public_id AS enrollment_public_id,
            tc.title     AS course_title,
            tb.batch_name,
            nc.certification_type AS nc_level,
            'TESDA'      AS program_type
        FROM refunds r
        JOIN tesda_enrollments te  ON r.enrollment_id = te.enrollment_id AND r.enrollment_type = 'TESDA'
        LEFT JOIN tesda_courses tc ON te.course_id = tc.course_id
        LEFT JOIN tesda_batches tb ON te.batch_id = tb.batch_id
        LEFT JOIN national_certification_types nc ON tc.certification_id = nc.certification_id
        WHERE te.student_id = $1
     )
     UNION ALL
     (
        SELECT
            r.public_id, r.refund_number, r.refund_type, r.percentage_value,
            r.amount, r.refund_method, r.reason, r.status, r.created_at,
            se.public_id AS enrollment_public_id,
            sc.title     AS course_title,
            sb.batch_name,
            NULL::varchar(100) AS nc_level,
            'SHS'        AS program_type
        FROM refunds r
        JOIN shs_enrollments se  ON r.enrollment_id = se.enrollment_id AND r.enrollment_type = 'SHS'
        LEFT JOIN shs_courses sc ON se.course_id = sc.course_id
        LEFT JOIN shs_batches sb ON se.batch_id = sb.batch_id
        WHERE se.student_id = $1
     )
     ORDER BY created_at DESC`,
    [studentId]
  );
  return result.rows;
};

// => Single refund detail, TESDA or SHS, scoped to the owning student -
// => same IDOR prevention and dual-LEFT-JOIN-gated-by-enrollment_type
// => pattern as getPaymentByPublicId above.
export const getRefundByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT
        r.public_id, r.refund_number, r.refund_type, r.percentage_value, r.amount,
        r.refund_method, r.reason, r.remarks, r.status, r.void_reason, r.voided_at,
        r.created_at, r.enrollment_type,
        COALESCE(te.public_id, se.public_id)   AS enrollment_public_id,
        COALESCE(tc.title, sc.title)           AS course_title,
        nc.certification_type                  AS nc_level,
        COALESCE(tb.batch_name, sb.batch_name) AS batch_name,
        COALESCE(tb.batch_sequence, sb.batch_sequence) AS batch_sequence,
        sp.first_name, sp.last_name, sp.middle_name,
        sp.email AS student_email,
        -- => Balance snapshot AFTER this refund, same formula as
        -- => paymentsModel.js's getBalancesByStudentId / getPaymentByPublicId
        COALESCE(te.fee_at_enrollment, 0) AS fee_at_enrollment,
        COALESCE(tesda_misc.total_misc_fee, shs_misc.total_misc_fee, 0) AS total_misc_fee,
        COALESCE(pay.total_paid, 0)      AS total_paid,
        COALESCE(ref.total_refunded, 0)  AS total_refunded,
        GREATEST(
          0,
          (COALESCE(te.fee_at_enrollment, 0) + COALESCE(tesda_misc.total_misc_fee, shs_misc.total_misc_fee, 0))
          - (COALESCE(pay.total_paid, 0) - COALESCE(ref.total_refunded, 0))
        ) AS remaining_balance
     FROM refunds r
     LEFT JOIN tesda_enrollments te ON te.enrollment_id = r.enrollment_id AND r.enrollment_type = 'TESDA'
     LEFT JOIN tesda_courses tc     ON te.course_id = tc.course_id
     LEFT JOIN national_certification_types nc ON tc.certification_id = nc.certification_id
     LEFT JOIN tesda_batches tb     ON te.batch_id = tb.batch_id
     LEFT JOIN LATERAL (
        SELECT SUM(fee_amount) AS total_misc_fee
        FROM batch_misc_fees
        WHERE batch_type = 'TESDA' AND batch_id = tb.batch_id
     ) tesda_misc ON r.enrollment_type = 'TESDA'
     LEFT JOIN shs_enrollments se ON se.enrollment_id = r.enrollment_id AND r.enrollment_type = 'SHS'
     LEFT JOIN shs_courses sc     ON se.course_id = sc.course_id
     LEFT JOIN shs_batches sb     ON se.batch_id = sb.batch_id
     LEFT JOIN LATERAL (
        SELECT SUM(fee_amount) AS total_misc_fee
        FROM batch_misc_fees
        WHERE batch_type = 'SHS' AND batch_id = sb.batch_id
     ) shs_misc ON r.enrollment_type = 'SHS'
     LEFT JOIN student_profile sp ON sp.student_id = COALESCE(te.student_id, se.student_id)
     LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total_paid
        FROM payments
        WHERE enrollment_id = r.enrollment_id AND enrollment_type = r.enrollment_type AND status = 'Completed'
     ) pay ON true
     LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total_refunded
        FROM refunds
        WHERE enrollment_id = r.enrollment_id AND enrollment_type = r.enrollment_type AND status = 'Completed'
     ) ref ON true
     WHERE r.public_id = $1 AND COALESCE(te.student_id, se.student_id) = $2
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] || null;
};