import { sql } from '../config/db.js';

// => GET /api/shs-classes?branch_id=1&track=tech_prof&cluster=industrial_technologies
// => cluster is optional - Academic Track has no cluster, so the query
// => uses IS NOT DISTINCT FROM instead of = to correctly match NULL cluster rows
export const getShsClasses = async (req, res) => {
  try {
    const { branch_id, track, cluster } = req.query;

    if (!branch_id || !track) {
      return res.status(400).json({ error: 'branch_id and track are required.' });
    }

    const result = await sql`
      SELECT class_id, start_date, end_date, status, max_students, remarks
      FROM shs_classes
      WHERE branch_id = ${branch_id}
        AND track = ${track}
        AND cluster IS NOT DISTINCT FROM ${cluster || null}
        AND status IN ('Pending', 'Ongoing')
      ORDER BY start_date ASC
    `;

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SHS classes:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};