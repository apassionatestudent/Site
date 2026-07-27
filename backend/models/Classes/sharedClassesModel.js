// => public/models/Classes/sharedClassesModel.js
// => Holds the combined UNION ALL query for the Classes list page - mirrors
//    sharedEnrollmentModel.js's getEnrollmentsByStudentId pattern.
// => Only returns batches tied to an Approved enrollment - Pending/Rejected
//    enrollments have no class schedule to show yet.

export const getBatchesByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT * FROM (
        SELECT
          cl.public_id             AS batch_public_id,
          'TESDA'                  AS enrollment_type,
          c.title                  AS title,
          cl.batch_name,
          cl.start_date,
          cl.end_date,
          cl.status                AS batch_status,
          e.status                 AS enrollment_status,
          NULL::VARCHAR(20)        AS school_year,
          cl.class_type
        FROM tesda_enrollments e
        JOIN tesda_batches cl      ON e.batch_id  = cl.batch_id
        LEFT JOIN tesda_courses c  ON e.course_id = c.course_id
        WHERE e.student_id = $1 AND e.status = 'Approved'

        UNION ALL

        SELECT
          cl.public_id             AS batch_public_id,
          'SHS'                    AS enrollment_type,
          scl.name                 AS title,
          cl.batch_name,
          cl.start_date,
          cl.end_date,
          cl.status                AS batch_status,
          e.status                 AS enrollment_status,
          cl.school_year,
          NULL::VARCHAR(20)        AS class_type
        FROM shs_enrollments e
        JOIN shs_batches cl        ON e.batch_id    = cl.batch_id
        LEFT JOIN shs_clusters scl ON cl.cluster_id = scl.cluster_id
        WHERE e.student_id = $1 AND e.status = 'Approved'
     ) combined
     ORDER BY start_date DESC NULLS LAST`,
    [studentId]
  );
  return result.rows;
};