// => backend/models/Payments/paymentsModel.js
// => Read-only payment history for the logged-in student, covering both
// => TESDA and SHS. Every dual-type query below gates each JOIN with
// => enrollment_type explicitly, since enrollment_id has no DB-level FK
// => across the two enrollment tables (separate SERIAL sequences), so an
// => ungated JOIN can silently cross-match rows whose numeric ids
// => happen to coincide.

// => Both TESDA and SHS payments for this student, combined via
// => UNION ALL - same pattern as admin's findPaymentsForStudent. Each
// => half is independently gated by enrollment_type in its JOIN, so
// => there is no risk of a numeric enrollment_id collision leaking a
// => payment across program types.
export const getPaymentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `(
        SELECT
            p.public_id, p.or_number, p.amount, p.payment_date, p.payment_method,
            p.status, p.remarks, p.created_at,
            te.public_id AS enrollment_public_id,
            tc.title     AS course_title,
            tb.batch_name,
            nc.certification_type AS nc_level,
            'TESDA'      AS program_type
        FROM payments p
        JOIN tesda_enrollments te  ON p.enrollment_id = te.enrollment_id AND p.enrollment_type = 'TESDA'
        LEFT JOIN tesda_courses tc ON te.course_id = tc.course_id
        LEFT JOIN tesda_batches tb ON te.batch_id = tb.batch_id
        LEFT JOIN national_certification_types nc ON tc.certification_id = nc.certification_id
        WHERE te.student_id = $1
     )
     UNION ALL
     (
        SELECT
            p.public_id, p.or_number, p.amount, p.payment_date, p.payment_method,
            p.status, p.remarks, p.created_at,
            se.public_id AS enrollment_public_id,
            sc.title     AS course_title,
            sb.batch_name,
            -- => SHS courses carry no NC level - explicit type cast keeps
            -- => this UNION ALL branch's column type matching the TESDA
            -- => branch's varchar(100) exactly
            NULL::varchar(100) AS nc_level,
            'SHS'        AS program_type
        FROM payments p
        JOIN shs_enrollments se  ON p.enrollment_id = se.enrollment_id AND p.enrollment_type = 'SHS'
        LEFT JOIN shs_courses sc ON se.course_id = sc.course_id
        LEFT JOIN shs_batches sb ON se.batch_id = sb.batch_id
        WHERE se.student_id = $1
     )
     ORDER BY created_at DESC`,
    [studentId]
  );
  return result.rows;
};

// => Balance summary, one row per TESDA enrollment that can ever carry a
// => payment (Regular, non-scholar, not Rejected/Dropped - mirrors the
// => admin-side eligibility filter in findEligibleEnrollments). Used by
// => the Payments list page to show a remaining-balance card per
// => enrollment. remaining_balance follows the same formula admin's
// => lockEnrollmentForRefund uses: totalDue - (totalPaid - totalRefunded),
// => floored at 0 so an overpayment cushion never displays as negative.
// => Balance summary across BOTH program types - one row per TESDA
// => enrollment eligible for payment (Regular, non-scholar, active) and
// => one row per SHS enrollment that actually has misc fees configured
// => on its batch (mirrors admin's findEligibleShsEnrollments filter -
// => no point showing a balance card for a batch with nothing payable).
// => Combined via UNION ALL, same shape both sides so the frontend
// => renders them identically regardless of program_type. SHS carries
// => no per-enrollment course fee (fee_at_enrollment hardcoded to 0),
// => matching admin's lockShsEnrollmentBalance reasoning that misc fees
// => alone are the full amount owed on the SHS side.
export const getBalancesByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `(
        SELECT
            te.public_id     AS enrollment_public_id,
            tc.title         AS course_title,
            nc.certification_type AS nc_level,
            b.batch_name,
            b.batch_sequence,
            COALESCE(te.fee_at_enrollment, 0) AS fee_at_enrollment,
            COALESCE(misc.total_misc_fee, 0)  AS total_misc_fee,
            COALESCE(pay.total_paid, 0)       AS total_paid,
            COALESCE(ref.total_refunded, 0)   AS total_refunded,
            GREATEST(
              0,
              (COALESCE(te.fee_at_enrollment, 0) + COALESCE(misc.total_misc_fee, 0))
              - (COALESCE(pay.total_paid, 0) - COALESCE(ref.total_refunded, 0))
            ) AS remaining_balance,
            'TESDA' AS program_type
        FROM tesda_enrollments te
        JOIN tesda_batches b       ON te.batch_id = b.batch_id
        LEFT JOIN tesda_courses tc ON te.course_id = tc.course_id
        LEFT JOIN national_certification_types nc ON tc.certification_id = nc.certification_id
        LEFT JOIN LATERAL (
           SELECT SUM(fee_amount) AS total_misc_fee
           FROM batch_misc_fees
           WHERE batch_type = 'TESDA' AND batch_id = b.batch_id
        ) misc ON true
        LEFT JOIN LATERAL (
           SELECT SUM(amount) AS total_paid
           FROM payments
           WHERE enrollment_id = te.enrollment_id AND enrollment_type = 'TESDA' AND status = 'Completed'
        ) pay ON true
        LEFT JOIN LATERAL (
           SELECT SUM(amount) AS total_refunded
           FROM refunds
           WHERE enrollment_id = te.enrollment_id AND enrollment_type = 'TESDA' AND status = 'Completed'
        ) ref ON true
        WHERE te.student_id = $1
          AND b.class_type = 'Regular'
          AND te.is_tesda_scholar = FALSE
          AND te.status NOT IN ('Rejected', 'Dropped')
     )
     UNION ALL
     (
        SELECT
            se.public_id     AS enrollment_public_id,
            sc.title         AS course_title,
            NULL::varchar(100) AS nc_level,
            sb.batch_name,
            sb.batch_sequence,
            0                AS fee_at_enrollment,
            COALESCE(misc.total_misc_fee, 0) AS total_misc_fee,
            COALESCE(pay.total_paid, 0)      AS total_paid,
            COALESCE(ref.total_refunded, 0)  AS total_refunded,
            GREATEST(
              0,
              COALESCE(misc.total_misc_fee, 0)
              - (COALESCE(pay.total_paid, 0) - COALESCE(ref.total_refunded, 0))
            ) AS remaining_balance,
            'SHS' AS program_type
        FROM shs_enrollments se
        JOIN shs_batches sb      ON se.batch_id = sb.batch_id
        LEFT JOIN shs_courses sc ON se.course_id = sc.course_id
        LEFT JOIN LATERAL (
           SELECT SUM(fee_amount) AS total_misc_fee
           FROM batch_misc_fees
           WHERE batch_type = 'SHS' AND batch_id = sb.batch_id
        ) misc ON true
        LEFT JOIN LATERAL (
           SELECT SUM(amount) AS total_paid
           FROM payments
           WHERE enrollment_id = se.enrollment_id AND enrollment_type = 'SHS' AND status = 'Completed'
        ) pay ON true
        LEFT JOIN LATERAL (
           SELECT SUM(amount) AS total_refunded
           FROM refunds
           WHERE enrollment_id = se.enrollment_id AND enrollment_type = 'SHS' AND status = 'Completed'
        ) ref ON true
        WHERE se.student_id = $1
          AND se.status NOT IN ('Rejected', 'Dropped')
          AND se.batch_id IS NOT NULL
          AND COALESCE(misc.total_misc_fee, 0) > 0
     )
     ORDER BY course_title ASC`,
    [studentId]
  );
  return result.rows;
};

// => Single payment detail, TESDA or SHS, scoped to the owning student
// => to prevent IDOR - a student passing another student's public_id
// => gets null. Same dual-LEFT-JOIN-gated-by-enrollment_type pattern as
// => admin's findPaymentByPublicId - only the side matching
// => p.enrollment_type ever produces a real row, so COALESCE below is
// => safe with no cross-type collision risk.
export const getPaymentByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT
        p.public_id, p.or_number, p.amount, p.payment_date, p.payment_method,
        p.status, p.void_reason, p.voided_at, p.remarks, p.created_at, p.enrollment_type,
        COALESCE(te.public_id, se.public_id)   AS enrollment_public_id,
        COALESCE(tc.title, sc.title)           AS course_title,
        nc.certification_type                  AS nc_level,
        COALESCE(tb.batch_name, sb.batch_name) AS batch_name,
        COALESCE(tb.batch_sequence, sb.batch_sequence) AS batch_sequence,
        sp.first_name, sp.last_name, sp.middle_name,
        sp.email AS student_email,
        -- => Balance snapshot, same formula as getBalancesByStudentId
        -- => above. SHS has no course fee, so total_misc_fee alone is
        -- => that side's totalDue.
        COALESCE(te.fee_at_enrollment, 0) AS fee_at_enrollment,
        COALESCE(tesda_misc.total_misc_fee, shs_misc.total_misc_fee, 0) AS total_misc_fee,
        COALESCE(pay.total_paid, 0)      AS total_paid,
        COALESCE(ref.total_refunded, 0)  AS total_refunded,
        GREATEST(
          0,
          (COALESCE(te.fee_at_enrollment, 0) + COALESCE(tesda_misc.total_misc_fee, shs_misc.total_misc_fee, 0))
          - (COALESCE(pay.total_paid, 0) - COALESCE(ref.total_refunded, 0))
        ) AS remaining_balance
     FROM payments p
     LEFT JOIN tesda_enrollments te ON te.enrollment_id = p.enrollment_id AND p.enrollment_type = 'TESDA'
     LEFT JOIN tesda_courses tc     ON te.course_id = tc.course_id
     LEFT JOIN national_certification_types nc ON tc.certification_id = nc.certification_id
     LEFT JOIN tesda_batches tb     ON te.batch_id = tb.batch_id
     LEFT JOIN LATERAL (
        SELECT SUM(fee_amount) AS total_misc_fee
        FROM batch_misc_fees
        WHERE batch_type = 'TESDA' AND batch_id = tb.batch_id
     ) tesda_misc ON p.enrollment_type = 'TESDA'
     LEFT JOIN shs_enrollments se ON se.enrollment_id = p.enrollment_id AND p.enrollment_type = 'SHS'
     LEFT JOIN shs_courses sc     ON se.course_id = sc.course_id
     LEFT JOIN shs_batches sb     ON se.batch_id = sb.batch_id
     LEFT JOIN LATERAL (
        SELECT SUM(fee_amount) AS total_misc_fee
        FROM batch_misc_fees
        WHERE batch_type = 'SHS' AND batch_id = sb.batch_id
     ) shs_misc ON p.enrollment_type = 'SHS'
     LEFT JOIN student_profile sp ON sp.student_id = COALESCE(te.student_id, se.student_id)
     LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total_paid
        FROM payments
        WHERE enrollment_id = p.enrollment_id AND enrollment_type = p.enrollment_type AND status = 'Completed'
     ) pay ON true
     LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total_refunded
        FROM refunds
        WHERE enrollment_id = p.enrollment_id AND enrollment_type = p.enrollment_type AND status = 'Completed'
     ) ref ON true
     WHERE p.public_id = $1 AND COALESCE(te.student_id, se.student_id) = $2
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] || null;
};