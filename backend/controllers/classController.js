import { sql } from '../config/db.js';

// => GET /api/classes?course_id=1 - fetch classes for a specific course
export const getClasses = async (req, res) => {
  try {
    const { course_id } = req.query;

    // => single-branch institution now - no branch_id filter needed
    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required.' });
    }

    // => to be used once there are enrollments to compute remaining slots on the fly instead of storing it in the database
    // const result = await sql`
    //   SELECT
    //     cl.class_id,
    //     cl.start_date,
    //     cl.end_date,
    //     cl.status,
    //     cl.max_students,
    //     cl.required_number_of_students,
    //     cl.remarks,

    //     -- => Compute remaining slots on the fly instead of storing it
    //     (cl.max_students - COUNT(e.enrollment_id)) AS remaining_slots,

    //     i.instructor_full_name
    //   FROM classes cl
    //   LEFT JOIN instructors i ON cl.instructor_id = i.instructor_id
    //   LEFT JOIN enrollments e ON cl.class_id = e.class_id
    //   WHERE cl.course_id = ${course_id}
    //     AND cl.branch_id = ${branch_id}
    //     AND cl.status IN ('upcoming', 'ongoing')
    //   GROUP BY cl.class_id, i.instructor_full_name
    //   ORDER BY cl.start_date ASC
    // `;

    const result = await sql`
    SELECT
        cl.class_id,
        cl.start_date,
        cl.end_date,
        cl.status,
        cl.max_students,
        cl.required_number_of_students,
        cl.remarks,

        -- => Temporarily using max_students as remaining slots until enrollments table exists
        cl.max_students AS remaining_slots,

        i.instructor_full_name
    FROM tesda_classes cl
    LEFT JOIN instructors i ON cl.instructor_id = i.instructor_id
    WHERE cl.course_id = ${course_id}
        AND cl.status IN ('Pending', 'Ongoing')
        -- TODO: I need to check if they'd allow enrollments to ongoing classes or not. 
    ORDER BY cl.start_date ASC
    `;

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching classes:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};