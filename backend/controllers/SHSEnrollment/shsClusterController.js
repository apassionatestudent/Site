import { getClusters, getClusterCourses } from '../../services/SHSEnrollment/shsClusterService.js';

// => GET /api/shs-clusters
// => Returns the full active cluster list (id + name) - powers the
// => enrollment form's cluster picker. cluster_id is the only stable
// => identifier now that shs_clusters.value has been dropped.
export const getShsClusters = async (req, res) => {
  try {
    const clusters = await getClusters();
    res.json(clusters);
  } catch (err) {
    console.error('Error fetching SHS clusters:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// => GET /api/shs-clusters/:clusterId/courses
// => Curriculum (courses) for a single cluster, keyed by the numeric
// => cluster_id route param, matching the cluster_id FK used across
// => shs_courses/shs_batches.
export const getShsClusterCourses = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const courses = await getClusterCourses(clusterId);
    res.json(courses);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error fetching SHS cluster courses:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
