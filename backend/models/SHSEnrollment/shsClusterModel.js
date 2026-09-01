import { sql } from '../../config/db.js';

// => Raw data access only - no validation, no request/response handling.
// => Called by shsClusterService.js.

// => All active (non soft-deleted) clusters, id + name
export const findAllClusters = async () => {
  const result = await sql`
    SELECT cluster_id, name
    FROM shs_clusters
    WHERE deleted_at IS NULL
    ORDER BY name ASC
  `;
  return result.rows;
};

// => Active courses belonging to one cluster, tagged by grade level
export const findCoursesByClusterId = async (clusterId) => {
  const result = await sql`
    SELECT course_id, title, description, grade_level, course_link
    FROM shs_courses
    WHERE cluster_id = ${clusterId}
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY grade_level ASC, title ASC
  `;
  return result.rows;
};
