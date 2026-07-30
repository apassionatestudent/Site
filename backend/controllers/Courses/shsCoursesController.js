import { listPublicShsCourses, getPublicShsCourseDetail } from '../../services/Courses/shsCoursesService.js';

export async function getShsCoursesList(req, res) {
  try {
    const courses = await listPublicShsCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching SHS courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
}

export async function getShsCourseDetail(req, res) {
  try {
    // => Express already decodes %20 etc. in req.params, so title arrives
    // => as plain readable text here, no manual decoding needed
    const title = req.params.title?.trim();

    // => Inline guard, same as TESDA - read-only route, no middleware needed
    if (!title) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await getPublicShsCourseDetail(title);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching SHS course detail:', error);
    res.status(500).json({ message: 'Failed to fetch course detail' });
  }
}