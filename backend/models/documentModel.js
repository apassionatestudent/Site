// => Handles all DB queries related to document listing and detail
// => Mirrors the same query style as enrollmentModel.js
// => All queries receive `pool` as a param - no module-level pool import needed

// ─────────────────────────────────────────
// GET ALL DOCUMENTS FOR A STUDENT
// => Returns both enrollment_documents and student_docs for the logged-in student
// => Each row tagged with source: 'enrollment' or 'profile' so the frontend can group them
// => Ownership enforced via student_id on both tables - no IDOR possible
// ─────────────────────────────────────────
export const getDocumentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT
        ed.public_id,
        ed.document_type,
        ed.document_key,
        ed.uploaded_at,
        'enrollment'          AS source,
        e.public_id           AS enrollment_public_id,
        c.title               AS course_name
      FROM enrollment_documents ed
      JOIN enrollment e ON ed.enrollment_id = e.enrollment_id
      LEFT JOIN courses c ON e.course_id = c.course_id
      WHERE e.student_id = $1

    UNION ALL

    SELECT
        sd.public_id,
        sd.document_type,
        sd.document_key,
        sd.uploaded_at,
        'profile'             AS source,
        NULL                  AS enrollment_public_id,
        NULL                  AS course_name
      FROM student_docs sd
      WHERE sd.student_id = $1

    ORDER BY uploaded_at DESC`,
    [studentId]
  );
  return result.rows;
};

// ─────────────────────────────────────────
// GET ONE DOCUMENT BY PUBLIC UUID
// => Checks enrollment_documents first, then student_docs
// => In both cases, ownership is verified against the requesting student_id
// => Returns null if not found or if it belongs to a different student - prevents IDOR
// ─────────────────────────────────────────
export const getDocumentByPublicId = async (pool, publicId, studentId) => {
  // => Try enrollment_documents first
  const enrollmentDoc = await pool.query(
    `SELECT
        ed.public_id,
        ed.document_type,
        ed.document_key,
        ed.uploaded_at,
        'enrollment'          AS source,
        e.public_id           AS enrollment_public_id,
        c.title               AS course_name,
        s.sector              AS sector,
        e.status              AS enrollment_status,
        e.submitted_at        AS enrollment_submitted_at
      FROM enrollment_documents ed
      JOIN enrollment e  ON ed.enrollment_id = e.enrollment_id
      LEFT JOIN courses c ON e.course_id = c.course_id
      LEFT JOIN sectors s ON c.sector_id  = s.sector_id
      WHERE ed.public_id   = $1
        AND e.student_id   = $2`,
    [publicId, studentId]
  );

  if (enrollmentDoc.rows[0]) return enrollmentDoc.rows[0];

  // => Fall back to student_docs if not found in enrollment_documents
  const profileDoc = await pool.query(
    `SELECT
        sd.public_id,
        sd.document_type,
        sd.document_key,
        sd.uploaded_at,
        'profile'             AS source,
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
