// => backend/models/Payments/refundsModel.js
// => Read-only refund history for the logged-in student. Mirrors
//    paymentsModel.js's shape and ownership-check pattern exactly.

export const getRefundsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT
        r.public_id,
        r.refund_number,
        r.refund_type,
        r.percentage_value,
        r.amount,
        r.refund_method,
        r.reason,
        r.status,
        r.created_at,
        e.public_id     AS enrollment_public_id,
        c.title         AS course_title,
        b.batch_name
     FROM refunds r
     JOIN tesda_enrollments e   ON r.enrollment_id = e.enrollment_id
     LEFT JOIN tesda_courses c  ON e.course_id = c.course_id
     LEFT JOIN tesda_batches b  ON e.batch_id = b.batch_id
     WHERE e.student_id = $1
     ORDER BY r.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

// => Single refund detail, scoped to the owning student - same IDOR
//    prevention as getPaymentByPublicId above
export const getRefundByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT
        r.public_id,
        r.refund_number,
        r.refund_type,
        r.percentage_value,
        r.amount,
        r.refund_method,
        r.reason,
        r.remarks,
        r.status,
        r.void_reason,
        r.voided_at,
        r.created_at,
        e.public_id     AS enrollment_public_id,
        c.title         AS course_title,
        b.batch_name
     FROM refunds r
     JOIN tesda_enrollments e   ON r.enrollment_id = e.enrollment_id
     LEFT JOIN tesda_courses c  ON e.course_id = c.course_id
     LEFT JOIN tesda_batches b  ON e.batch_id = b.batch_id
     WHERE r.public_id = $1 AND e.student_id = $2
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] || null;
};