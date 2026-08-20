// => controllers/TESDAEnrollment/tesdaCourseController.js
// => Renamed/relocated from controllers/courseController.js. Previously
//    queried the DB directly - now delegates to the service layer to
//    match the routes -> middleware -> controllers -> services -> models
//    layering used everywhere else

import { getActiveTesdaCourses, getCourseRequirements } from '../../services/TESDAEnrollment/tesdaCourseService.js';

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

// => GET /api/courses/:courseId/requirements - fetches this course's
// => admin-defined document requirements for the enrollment form's
// => dynamic Upload Requirements section
export const getTesdaCourseRequirements = async (req, res) => {
  try {
    const { courseId } = req.params;

    // => Guards against non-numeric values reaching the DB query
    if (!courseId || isNaN(Number(courseId))) {
      return res.status(400).json({ error: 'A valid courseId is required.' });
    }

    const requirements = await getCourseRequirements(courseId);
    res.json(requirements);
  } catch (err) {
    console.error('Error fetching TESDA course requirements:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};