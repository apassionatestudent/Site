import { listPublicTesdaCourses, getPublicTesdaCourseDetail } from '../../services/Courses/tesdaCoursesService.js';

export async function getTesdaCoursesList(req, res) {
  try {
    const courses = await listPublicTesdaCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching TESDA courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
}

export async function getTesdaCourseDetail(req, res) {
  try {
    // => Express already decodes %20 etc. in req.params, so title arrives
    // => as plain readable text here, no manual decoding needed
    const title = req.params.title?.trim();

    // => Inline guard replaces the old middleware - this is a read-only
    // => route, so an empty title just needs to short-circuit to 404
    // => rather than being caught before the controller
    if (!title) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await getPublicTesdaCourseDetail(title);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching TESDA course detail:', error);
    res.status(500).json({ message: 'Failed to fetch course detail' });
  }
}