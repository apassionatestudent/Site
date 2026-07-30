import {
  findAllPublicShsCourses,
  findPublicShsCourseByTitle,
  findShsJobOpportunities,
} from '../../models/Courses/shsCoursesModel.js';

// => Returns the flat list used by the public SHS course grid
export async function listPublicShsCourses() {
  return findAllPublicShsCourses();
}

// => Assembles the full course detail payload: course row + job opportunities
// => Only one related table here, unlike TESDA's three competency tables,
// => so Promise.all isn't needed, but kept as a single await for consistency
export async function getPublicShsCourseDetail(title) {
  const course = await findPublicShsCourseByTitle(title);

  // => null signals "not found" - the controller turns this into a 404
  if (!course) return null;

  const jobs = await findShsJobOpportunities(course.course_id);

  return {
    ...course,
    job_opportunities: jobs,
  };
}