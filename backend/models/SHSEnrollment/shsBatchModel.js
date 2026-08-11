import { sql } from '../../config/db.js';

// => Raw data access only - called by shsBatchService.js.

// => Open (Pending/Ongoing) batches for one cluster, ordered by
// => batch_sequence so the oldest-standing batch shows first. Same
// => two-tier capacity filter as tesdaBatchModel.js's getOpenBatchesByCourseId -
// => excluded once Approved count hits max_students OR non-terminal
// => applicant count hits max_applicants.
export const findOpenBatchesByClusterId = async (clusterId) => {
  const result = await sql`
    SELECT
      sb.batch_id,
      sb.batch_name,
      sb.start_date,
      sb.end_date,
      sb.status,
      sb.max_students,
      sb.max_applicants,
      GREATEST(sb.max_applicants - COALESCE(counts.applicant_count, 0), 0) AS remaining_slots
    FROM shs_batches sb
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE se.status = 'Approved') AS approved_count,
        COUNT(*) FILTER (WHERE se.status NOT IN ('Rejected', 'Dropped')) AS applicant_count
      FROM shs_enrollments se
      WHERE se.batch_id = sb.batch_id
    ) counts ON true
    WHERE sb.cluster_id = ${clusterId}
      AND sb.status IN ('Pending', 'Ongoing')
      AND COALESCE(counts.approved_count, 0) < sb.max_students
      AND COALESCE(counts.applicant_count, 0) < sb.max_applicants
    ORDER BY sb.batch_sequence ASC
  `;
  return result.rows;
};
