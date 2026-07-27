// => public/models/Classes/tesdaClassesModel.js
// => TESDA-only batch detail + class sessions, read-only.
// => Ownership check (student_id + status = 'Approved') happens on the
//    batch query itself, so a non-owning or non-approved student gets
//    a null batch and the controller can 404 before even touching sessions.

export const getTesdaBatchByPublicId = async (pool, publicId, studentId) => {
  const batchResult = await pool.query(
    `SELECT
        cl.batch_id,
        cl.public_id,
        cl.batch_name,
        cl.start_date,
        cl.end_date,
        cl.status,
        cl.class_type,
        cl.groupchat_link,
        c.title                    AS course_title,
        t.trainer_full_name        AS trainer_name
     FROM tesda_batches cl
     JOIN tesda_enrollments e      ON e.batch_id = cl.batch_id
     LEFT JOIN tesda_courses c     ON cl.course_id  = c.course_id
     LEFT JOIN trainers t          ON cl.trainer_id = t.trainer_id
     WHERE cl.public_id = $1 AND e.student_id = $2 AND e.status = 'Approved'
     LIMIT 1`,
    [publicId, studentId]
  );

  const batch = batchResult.rows[0];
  if (!batch) return null; // => not found OR not owned OR not approved yet

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
     WHERE cs.batch_type = 'TESDA' AND cs.batch_id = $1
     ORDER BY cs.session_date, cs.start_time`,
    [batch.batch_id]
  );

  return { batch, sessions: sessionsResult.rows };
};