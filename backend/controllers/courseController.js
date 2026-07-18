import { sql } from '../config/db.js';

// => GET /api/courses - fetch all active TESDA courses. No branch or
// => sector filtering - single-branch institution now, and sector is
// => shown read-only on the frontend (derived from the selected course),
// => not used to filter the list.
export const getCourses = async (req, res) => {
  try {
    const result = await sql`
      SELECT tc.course_id, tc.title, tc.amount, tc.sector_id, s.sector
      FROM tesda_courses tc
      LEFT JOIN sectors s ON tc.sector_id = s.sector_id
      WHERE tc.status = 'active'
        AND tc.deleted_at IS NULL
      ORDER BY tc.title ASC
    `;

    // => Neon returns { rows: [...] } - we only want the rows array
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching courses:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};