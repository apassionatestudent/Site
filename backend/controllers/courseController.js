import { sql } from '../config/db.js';

// => GET /api/courses?branch_id=1 => fetch active courses for a specific branch
export const getCoursesByBranch = async (req, res) => {
  try {
    const { branch_id } = req.query;

    // => branch_id is required => courses are branch-specific
    if (!branch_id) {
      return res.status(400).json({ error: 'branch_id is required.' });
    }

    const result = await sql`
    SELECT c.course_id, c.title, c.amount
    FROM courses c
    INNER JOIN course_branch cb ON c.course_id = cb.course_id
    WHERE cb.branch_id = ${branch_id}
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    ORDER BY c.title ASC
    `;

    // => Neon returns { rows: [...] } — we only want the rows array
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching courses:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};