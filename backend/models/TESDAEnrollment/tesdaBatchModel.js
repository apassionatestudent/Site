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
// => the assigned trainer. A batch is excluded entirely once it hits
// => EITHER capacity ceiling: Approved count against max_students (the
// => real, capacity-consuming status), or total non-terminal applicant
// => count against max_applicants (the pool cap, everything except
// => Rejected/Dropped). This mirrors the admin-side two-tier rule -
// => Approved-full always blocks regardless of pool room, max_applicants
// => is only leeway during the pending/review phase.
export const getOpenBatchesByCourseId = async (courseId) => {
  const result = await sql`
    SELECT
      cb.batch_id,
      cb.start_date,
      cb.end_date,
      cb.status,
      cb.max_students,
      cb.max_applicants,
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

      -- => Remaining slots reflects seat room (max_students), not pool
      -- => room (max_applicants) - max_applicants only gates whether new
      -- => submissions still get accepted (falling back to Reserved once
      -- => full), it isn't the number an applicant should see as "slots
      -- => left". GREATEST(...,0) guards against a negative number if
      -- => max_students is ever lowered below the current approved count
      -- => after the fact.
      GREATEST(cb.max_students - COALESCE(counts.approved_count, 0), 0) AS remaining_slots,

      tr.trainer_full_name
    FROM tesda_batches cb
    LEFT JOIN trainers tr ON cb.trainer_id = tr.trainer_id
    -- => LATERAL subquery keeps this a clean 1-row-per-batch result,
    -- => same pattern used for job_opportunities in sharedEnrollmentModel.js.
    -- => Two FILTER counts in one pass instead of two separate subqueries.
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE te.status = 'Approved') AS approved_count,
        COUNT(*) FILTER (WHERE te.status NOT IN ('Rejected', 'Dropped')) AS applicant_count
      FROM tesda_enrollments te
      WHERE te.batch_id = cb.batch_id
    ) counts ON true
    WHERE cb.course_id = ${courseId}
      AND cb.status IN ('Pending', 'Ongoing')
      -- => Approved-full blocks regardless of pool room
      AND COALESCE(counts.approved_count, 0) < cb.max_students
      -- => Pool-full blocks even if no one's Approved yet
      AND COALESCE(counts.applicant_count, 0) < cb.max_applicants
      -- TODO: confirm whether enrollment into Ongoing batches should be allowed
    ORDER BY cb.start_date ASC
  `;
  return result.rows;
};
