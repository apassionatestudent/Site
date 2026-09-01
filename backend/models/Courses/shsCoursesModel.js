import { sql } from '../../config/db.js';

// => Returns every published, active SHS course for the public course list
// => Joins shs_clusters so the cluster name comes along for free, same
// => pattern as tesdaCoursesModel joining national_certification_types
export async function findAllPublicShsCourses() {
  // => sql`` returns the full result object here ({fields, rows, rowCount, ...}),
  // => not a plain array - destructure .rows to get the actual records
  const { rows } = await sql`
    SELECT
      sc.course_id,
      sc.title,
      sc.description,
      sc.grade_level,
      cl.name AS cluster_name
    FROM shs_courses sc
    LEFT JOIN shs_clusters cl
      ON cl.cluster_id = sc.cluster_id
    WHERE sc.status = 'active'
      AND sc.deleted_at IS NULL
      AND cl.deleted_at IS NULL
    ORDER BY sc.title ASC
  `;
  return rows;
}

// => Looks up a single active course by its exact title, case-insensitive
// => Title is used directly as the URL identifier, same decision as TESDA:
// => shs_course_public_links exists but stays unused for now
export async function findPublicShsCourseByTitle(title) {
  const { rows } = await sql`
    SELECT
      sc.course_id,
      sc.title,
      sc.description,
      sc.course_link,
      sc.grade_level,
      cl.cluster_id,
      cl.name AS cluster_name
    FROM shs_courses sc
    LEFT JOIN shs_clusters cl
      ON cl.cluster_id = sc.cluster_id
    WHERE sc.status = 'active'
      AND sc.deleted_at IS NULL
      AND LOWER(sc.title) = LOWER(${title})
    LIMIT 1
  `;
  return rows[0] || null;
}

// => SHS only has one related table (job opportunities) - no basic/common/core
// => competency tables like TESDA, since those FK to tesda_courses specifically
export async function findShsJobOpportunities(courseId) {
  const { rows } = await sql`SELECT job_id, job_title FROM shs_job_opportunities WHERE course_id = ${courseId}`;
  return rows;
}