// => models/TESDAEnrollment/tesdaCourseModel.js
// => New file - the actual DB query, previously lived inline in
//    courseController.js. Added a join to national_certification_types
//    so the frontend can show the NC level (NC I / NC II / NC III)
//    next to each course title.

import { sql } from '../../config/db.js';

// => Active, non-deleted TESDA courses, joined with sector (read-only
// => display) and national_certification_types (NC level)
export const getActiveCourses = async () => {
  const result = await sql`
    SELECT
      tc.course_id,
      tc.title,
      tc.amount,
      tc.sector_id,
      s.sector,
      tc.certification_id,
      nct.certification_type
    FROM tesda_courses tc
    LEFT JOIN sectors s ON tc.sector_id = s.sector_id
    LEFT JOIN national_certification_types nct ON tc.certification_id = nct.certification_id
    WHERE tc.status = 'active'
      AND tc.deleted_at IS NULL
    ORDER BY tc.title ASC
  `;
  return result.rows;
};

// => Fetches course-specific document requirements set by the admin for
// => one TESDA course, used to render the dynamic Upload Requirements
// => section on top of the fixed BASE_REQUIREMENTS on the frontend
export const getRequirementsByCourseId = async (courseId) => {
  const result = await sql`
    SELECT
      requirement_id,
      course_id,
      document_type,
      is_required,
      max_files
    FROM tesda_course_requirements
    WHERE course_id = ${courseId}
    ORDER BY requirement_id ASC
  `;
  return result.rows;
};