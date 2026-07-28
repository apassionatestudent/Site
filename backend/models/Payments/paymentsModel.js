// => backend/models/Payments/paymentsModel.js
// => Read-only payment history for the logged-in student.
// => Payments only exist for TESDA Regular, non-scholar enrollments, so
//    there is no SHS split here, unlike Classes.

export const getPaymentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT
        p.public_id,
        p.or_number,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.status,
        p.remarks,
        p.created_at,
        e.public_id     AS enrollment_public_id,
        c.title         AS course_title,
        b.batch_name
     FROM payments p
     JOIN tesda_enrollments e   ON p.enrollment_id = e.enrollment_id
     LEFT JOIN tesda_courses c  ON e.course_id = c.course_id
     LEFT JOIN tesda_batches b  ON e.batch_id = b.batch_id
     WHERE e.student_id = $1
     ORDER BY p.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

// => Single payment detail, scoped to the owning student to prevent IDOR -
//    a student passing another student's public_id gets null, same
//    ownership pattern as tesdaClassesModel.getTesdaBatchByPublicId
export const getPaymentByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT
        p.public_id,
        p.or_number,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.status,
        p.void_reason,
        p.voided_at,
        p.remarks,
        p.created_at,
        e.public_id     AS enrollment_public_id,
        c.title         AS course_title,
        b.batch_name
     FROM payments p
     JOIN tesda_enrollments e   ON p.enrollment_id = e.enrollment_id
     LEFT JOIN tesda_courses c  ON e.course_id = c.course_id
     LEFT JOIN tesda_batches b  ON e.batch_id = b.batch_id
     WHERE p.public_id = $1 AND e.student_id = $2
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] || null;
};