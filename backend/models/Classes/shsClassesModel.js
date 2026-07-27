// => public/models/Classes/shsClassesModel.js
// => SHS-only batch detail + class sessions, read-only.
// => SHS batches carry two trainers (Grade 11 / Grade 12), unlike TESDA's one.

export const getShsBatchByPublicId = async (pool, publicId, studentId) => {
  const batchResult = await pool.query(
    `SELECT
        cl.batch_id,
        cl.public_id,
        cl.batch_name,
        cl.start_date,
        cl.end_date,
        cl.status,
        cl.school_year,
        cl.groupchat_link,
        scl.name                     AS cluster_name,
        t11.trainer_full_name        AS grade11_trainer_name,
        t12.trainer_full_name        AS grade12_trainer_name
     FROM shs_batches cl
     JOIN shs_enrollments e         ON e.batch_id = cl.batch_id
     LEFT JOIN shs_clusters scl     ON cl.cluster_id = scl.cluster_id
     LEFT JOIN trainers t11         ON cl.grade11_trainer_id = t11.trainer_id
     LEFT JOIN trainers t12         ON cl.grade12_trainer_id = t12.trainer_id
     WHERE cl.public_id = $1 AND e.student_id = $2 AND e.status = 'Approved'
     LIMIT 1`,
    [publicId, studentId]
  );

  const batch = batchResult.rows[0];
  if (!batch) return null;

  const sessionsResult = await pool.query(
    `SELECT
        cs.session_id,
        cs.session_type,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.mobile_location,
        cs.meeting_link,
        f.name                     AS facility_name,
        t.trainer_full_name        AS trainer_name
     FROM class_sessions cs
     LEFT JOIN facilities f  ON cs.facility_id = f.facility_id
     LEFT JOIN trainers t    ON cs.trainer_id  = t.trainer_id
     WHERE cs.batch_type = 'SHS' AND cs.batch_id = $1
     ORDER BY cs.session_date, cs.start_time`,
    [batch.batch_id]
  );

  return { batch, sessions: sessionsResult.rows };
};