// => public/models/Enrollments/enrollmentEligibilityModel.js
// => Read-only queries backing the "+" re-enrollment eligibility check on
// => the student dashboard Enrollment page. No writes happen here.

// => Pulls every TESDA enrollment row this student has ever had, along
// => with the sector_id of each course, so the service can tell which
// => sectors currently have an active (non-terminal) enrollment
export const getTesdaEnrollmentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT te.enrollment_id, te.status, te.course_id, c.sector_id
     FROM tesda_enrollments te
     LEFT JOIN tesda_courses c ON te.course_id = c.course_id
     WHERE te.student_id = $1`,
    [studentId]
  );
  return result.rows;
};

// => Pulls every SHS enrollment row this student has ever had
export const getShsEnrollmentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT enrollment_id, status, cluster_id
     FROM shs_enrollments
     WHERE student_id = $1`,
    [studentId]
  );
  return result.rows;
};

// => Counts how many active courses exist under a given sector, used to
// => decide whether a same-sector "+" opportunity has anything new to
// => offer. If a sector only has the one course the student is already
// => in, there's nothing else to enroll into, so the plus button stays hidden.
export const countCoursesInSector = async (pool, sectorId) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS course_count
     FROM tesda_courses
     WHERE sector_id = $1 AND deleted_at IS NULL`,
    [sectorId]
  );
  return result.rows[0]?.course_count || 0;
};