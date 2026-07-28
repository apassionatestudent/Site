// => controllers/TESDAEnrollment/tesdaBatchController.js
// => Renamed/relocated from controllers/classController.js. Previously
//    queried the DB directly - now delegates to the service layer to
//    match the routes -> middleware -> controllers -> services -> models
//    layering used everywhere else

import { getBatchesForCourse } from '../../services/TESDAEnrollment/tesdaBatchService.js';

// => GET /api/classes?course_id=1 - fetch open batches for a specific
// => TESDA course. Route path is unchanged (/api/classes) even though
// => the underlying table is tesda_batches - renaming the URL would
// => require touching every frontend fetch call, this is purely an
// => internal file/naming cleanup
export const getTesdaBatches = async (req, res) => {
  try {
    const { course_id } = req.query;

    // => single-branch institution now - no branch_id filter needed
    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required.' });
    }

    const batches = await getBatchesForCourse(course_id);
    res.json(batches);
  } catch (err) {
    console.error('Error fetching TESDA batches:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
