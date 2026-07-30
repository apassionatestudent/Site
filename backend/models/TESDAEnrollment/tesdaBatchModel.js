// => models/TESDAEnrollment/tesdaBatchModel.js
// => New file - the actual DB query, previously lived inline in
//    classController.js. THE BUG FIX: the old query referenced
//    tesda_classes / instructors / instructor_id / instructor_full_name /
//    class_id - all pre-rename names. server.js's schema comments confirm
//    the actual rename: tesda_classes -> tesda_batches,
//    instructors -> trainers, instructor_id -> trainer_id,
//    instructor_full_name -> trainer_full_name, class_id -> batch_id.
//    The old query was throwing "relation tesda_classes does not exist"
//    on every call, caught by the controller's try/catch, returning a
//    silent 500 - which is why a Pending batch you created in admin
//    never showed up on the public enrollment form.

import { sql } from '../../config/db.js';

// => Open TESDA batches (Pending or Ongoing) for one course, joined with
// => the assigned trainer and a real enrolled-count against max_students
export const getOpenBatchesByCourseId = async (courseId) => {
  const result = await sql`
    SELECT
      cb.batch_id,
      cb.start_date,
      cb.end_date,
      cb.status,
      cb.max_students,
      cb.required_number_of_students,
      cb.remarks,

      -- => Regular / TESDA-Sponsored - drives whether the enrollment form
      -- => shows the course amount + reservation fee breakdown, or just
      -- => the course amount labeled as covered by TESDA
      cb.class_type,

      -- => e.g. "Computer System Servicing (NCII) (Batch #2)" - shown in
      -- => the batch dropdown so students can tell batches of the same
      -- => course apart even when dates aren't set yet (Pending batches
      -- => can have NULL start_date/end_date)
      cb.batch_name,

      -- => Pending and Approved enrollments both hold a claim on a seat -
      -- => Rejected/Reserved do not (Reserved rows have batch_id NULL
      -- => anyway, so they'd never match this batch regardless).
      -- => GREATEST(...,0) guards against a negative number if max_students
      -- => is ever lowered below the current enrolled count after the fact.
      GREATEST(cb.max_students - COALESCE(enrolled.enrolled_count, 0), 0) AS remaining_slots,

      tr.trainer_full_name
    FROM tesda_batches cb
    LEFT JOIN trainers tr ON cb.trainer_id = tr.trainer_id
    -- => LATERAL subquery keeps this a clean 1-row-per-batch result,
    -- => same pattern used for job_opportunities in sharedEnrollmentModel.js
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS enrolled_count
      FROM tesda_enrollments te
      WHERE te.batch_id = cb.batch_id
        AND te.status IN ('Pending', 'Approved')
    ) enrolled ON true
    WHERE cb.course_id = ${courseId}
      AND cb.status IN ('Pending', 'Ongoing')
      -- TODO: confirm whether enrollment into Ongoing batches should be allowed
    ORDER BY cb.start_date ASC
  `;
  return result.rows;
};
