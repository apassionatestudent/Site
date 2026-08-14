// => backend/models/Logs/logsModel.js
// => Read-only activity log history for the logged-in student ONLY.
// => Every query below is hardcoded to actor_type = 'Student' AND
// => actor_id = studentId - this is the actual IDOR/security boundary
// => for this whole feature, it never comes from a client-supplied
// => value, so there is no way to widen scope through query params.

// => Combined paginated fetch + total count, using optional filters
// => layered on top of the fixed actor scope with AND (never OR), so
// => filters can only narrow the result set, never escape the scope.
export const getStudentLogs = async (pool, studentId, filters) => {
  const { page, pageSize, search, entityType, action } = filters;
  const offset = (page - 1) * pageSize;

  // => Base condition is always present and always first - this is the
  // => ownership boundary, everything else below just narrows it further
  const conditions = [`actor_type = 'Student'`, `actor_id = $1`];
  const params = [studentId];
  let paramIndex = 2;

  if (search) {
    conditions.push(`action_detail ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (entityType) {
    conditions.push(`entity_type = $${paramIndex}`);
    params.push(entityType);
    paramIndex++;
  }
  if (action) {
    conditions.push(`action = $${paramIndex}`);
    params.push(action);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM activity_logs WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params, pageSize, offset];
  const logsResult = await pool.query(
    `SELECT log_id, actor_name, entity_type, entity_id, action, action_detail, created_at
     FROM activity_logs
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return { logs: logsResult.rows, total };
};

// => Count of this student's own logs created today, powers the "Today"
// => badge - same fixed actor scope as above, no filters applied
export const getLogsTodayCountByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM activity_logs
     WHERE actor_type = 'Student' AND actor_id = $1
       AND created_at >= CURRENT_DATE`,
    [studentId]
  );
  return parseInt(result.rows[0].count, 10);
};

// => Distinct entity_type values that actually appear in THIS student's
// => own logs, used to populate the Entity Type filter dropdown - never
// => shows entity types from other students or other actor types
export const getDistinctEntityTypesByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT DISTINCT entity_type FROM activity_logs
     WHERE actor_type = 'Student' AND actor_id = $1
       AND entity_type IS NOT NULL
     ORDER BY entity_type`,
    [studentId]
  );
  return result.rows.map((row) => row.entity_type);
};