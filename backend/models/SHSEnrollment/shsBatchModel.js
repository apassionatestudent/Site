import { sql } from '../../config/db.js';

// => Raw data access only - called by shsBatchService.js.

// => Open (Pending/Ongoing) batches for one cluster, ordered by
// => batch_sequence so the oldest-standing batch shows first
export const findOpenBatchesByClusterId = async (clusterId) => {
  const result = await sql`
    SELECT batch_id, batch_name, start_date, end_date, status, max_students
    FROM shs_batches
    WHERE cluster_id = ${clusterId}
      AND status IN ('Pending', 'Ongoing')
    ORDER BY batch_sequence ASC
  `;
  return result.rows;
};
