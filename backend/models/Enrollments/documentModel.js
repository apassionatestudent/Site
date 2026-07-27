// => public/models/Enrollments/documentModel.js
// => Relocated from models/documentModel.js into the Enrollments folder -
//    logic is completely unchanged, this file had no relative imports to
//    adjust. Not split by TESDA/SHS: getDocumentsByStudentId is already a
//    UNION ALL across tesda_documents and shs_documents, and
//    getDocumentByPublicId already checks both tables (plus student_docs)
//    in sequence. Both functions are inherently combined operations.
// => Handles all DB queries related to document listing and detail
// => Mirrors the same query style as sharedEnrollmentModel.js
// => All queries receive `pool` as a param - no module-level pool import needed

// GET ALL DOCUMENTS FOR A STUDENT
// => Now a 3-way UNION ALL: tesda_documents, shs_documents, and student_docs
// => Each row tagged with source ('enrollment'/'profile') and enrollment_type
// => ('TESDA'/'SHS'/NULL) so the frontend can group and label correctly
export const getDocumentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT * FROM (
        SELECT
          ed.public_id,
          ed.document_type,
          ed.document_key,
          ed.uploaded_at,
          'enrollment'         AS source,
          'TESDA'              AS enrollment_type,
          e.public_id          AS enrollment_public_id,
          c.title              AS course_name,
          NULL::VARCHAR(20)    AS track,
          NULL::VARCHAR(60)    AS cluster
        FROM tesda_documents ed
        JOIN tesda_enrollments e ON ed.enrollment_id = e.enrollment_id
        LEFT JOIN tesda_courses c ON e.course_id = c.course_id
        WHERE e.student_id = $1

        UNION ALL

        SELECT
          sd.public_id,
          sd.document_type,
          sd.document_key,
          sd.uploaded_at,
          'enrollment'         AS source,
          'SHS'                AS enrollment_type,
          e.public_id          AS enrollment_public_id,
          NULL::VARCHAR(255)   AS course_name,
          -- => track removed, shs_enrollments no longer has this column
          NULL::VARCHAR(20)    AS track,
          e.cluster            AS cluster
        FROM shs_documents sd
        JOIN shs_enrollments e ON sd.enrollment_id = e.enrollment_id
        WHERE e.student_id = $1
     ) combined
     ORDER BY uploaded_at DESC`,
    [studentId]
  );
  return result.rows;
};

// GET ONE DOCUMENT BY PUBLIC UUID
// => Checks tesda_documents, then shs_documents, then student_docs
// => Ownership verified against the requesting student_id at every step
// => Returns null if not found or belongs to a different student - prevents IDOR
export const getDocumentByPublicId = async (pool, publicId, studentId) => {
  // => Try tesda_documents first
  const tesdaDoc = await pool.query(
    `SELECT
        ed.public_id,
        ed.document_type,
        ed.document_key,
        ed.uploaded_at,
        'enrollment'          AS source,
        'TESDA'               AS enrollment_type,
        e.public_id           AS enrollment_public_id,
        c.title               AS course_name,
        s.sector              AS sector,
        e.status              AS enrollment_status,
        e.submitted_at        AS enrollment_submitted_at
      FROM tesda_documents ed
      JOIN tesda_enrollments e  ON ed.enrollment_id = e.enrollment_id
      LEFT JOIN tesda_courses c ON e.course_id = c.course_id
      LEFT JOIN sectors s ON c.sector_id  = s.sector_id
      WHERE ed.public_id   = $1
      AND e.student_id   = $2`,
    [publicId, studentId]
  );

  if (tesdaDoc.rows[0]) return tesdaDoc.rows[0];

  // => Try shs_documents next
  const shsDoc = await pool.query(
    `SELECT
        sd.public_id,
        sd.document_type,
        sd.document_key,
        sd.uploaded_at,
        'enrollment'          AS source,
        'SHS'                 AS enrollment_type,
        e.public_id           AS enrollment_public_id,
        NULL::VARCHAR(255)    AS course_name,
        NULL::VARCHAR(150)    AS sector,
        -- => track removed, shs_enrollments no longer has this column
        NULL::VARCHAR(20)     AS track,
        e.cluster             AS cluster,
        e.status              AS enrollment_status,
        e.submitted_at        AS enrollment_submitted_at
      FROM shs_documents sd
      JOIN shs_enrollments e  ON sd.enrollment_id = e.enrollment_id
      WHERE sd.public_id   = $1
      AND e.student_id   = $2`,
    [publicId, studentId]
  );

  if (shsDoc.rows[0]) return shsDoc.rows[0];

  // => Fall back to student_docs if not found in either enrollment-doc table
  const profileDoc = await pool.query(
    `SELECT
        sd.public_id,
        sd.document_type,
        sd.document_key,
        sd.uploaded_at,
        'profile'             AS source,
        NULL                  AS enrollment_type,
        NULL                  AS enrollment_public_id,
        NULL                  AS course_name,
        NULL                  AS sector,
        NULL                  AS enrollment_status,
        NULL                  AS enrollment_submitted_at
      FROM student_docs sd
      WHERE sd.public_id  = $1
        AND sd.student_id = $2`,
    [publicId, studentId]
  );

  return profileDoc.rows[0] ?? null;
};
