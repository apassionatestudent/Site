import { getBatchesByCluster } from '../../services/SHSEnrollment/shsBatchService.js';

// => GET /api/shs-batches?clusterId=3
// => Renamed from getShsClasses / shs_classes - the table is shs_batches
// => now, and there's no more `track` column (only one track is offered,
// => so it was dropped from shs_batches entirely).
export const getShsBatches = async (req, res) => {
  try {
    const { clusterId } = req.query;
    const batches = await getBatchesByCluster(clusterId);
    res.json(batches);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error fetching SHS batches:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
