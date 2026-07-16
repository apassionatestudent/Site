import { sql } from '../config/db.js';

// => GET /api/shs-clusters?cluster=industrial_technologies
// => cluster is the shs_clusters.value string (e.g. 'industrial_technologies'),
// => not the numeric cluster_id - matches how academicData.cluster is stored
// => => Renamed from getShsCourses: this now returns EVERY course tied to
// => the cluster (both G11 and G12), tagged with grade_level, for read-only
// => display - students no longer pick a single course here
export const getShsClusterCourses = async (req, res) => {
  try {
    const { cluster } = req.query;

    if (!cluster) {
      return res.status(400).json({ error: 'cluster is required.' });
    }

    const result = await sql`
      SELECT sc.course_id, sc.title, sc.description, sc.cover_image_url, sc.grade_level, sc.course_link
      FROM shs_courses sc
      JOIN shs_clusters cl ON cl.cluster_id = sc.cluster_id
      WHERE cl.value = ${cluster}
        AND sc.status = 'active'
        AND sc.deleted_at IS NULL
      ORDER BY sc.grade_level ASC, sc.title ASC
    `;

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SHS cluster courses:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};