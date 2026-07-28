// => controllers/TESDAEnrollment/tesdaCourseController.js
// => Renamed/relocated from controllers/courseController.js. Previously
//    queried the DB directly - now delegates to the service layer to
//    match the routes -> middleware -> controllers -> services -> models
//    layering used everywhere else

import { getActiveTesdaCourses } from '../../services/TESDAEnrollment/tesdaCourseService.js';

// => GET /api/courses - fetch all active TESDA courses for the public
// => enrollment form's course dropdown. No branch or sector filtering -
// => single-branch institution, sector is shown read-only on the
// => frontend (derived from the selected course), not used to filter.
export const getTesdaCourses = async (req, res) => {
  try {
    const courses = await getActiveTesdaCourses();
    res.json(courses);
  } catch (err) {
    console.error('Error fetching TESDA courses:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
