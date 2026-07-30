import {
  findAllPublicTesdaCourses,
  findPublicTesdaCourseByTitle,
  findBasicCompetencies,
  findCommonCompetencies,
  findCoreCompetencies,
  findJobOpportunities,
} from '../../models/Courses/tesdaCoursesModel.js';

// => Returns the flat list used by the public TESDA course grid
export async function listPublicTesdaCourses() {
  return findAllPublicTesdaCourses();
}

// => Assembles the full course detail payload: course row + every related
// => competency/job table, fetched in parallel since none of them depend on each other
export async function getPublicTesdaCourseDetail(title) {
  const course = await findPublicTesdaCourseByTitle(title);

  // => null signals "not found" - the controller turns this into a 404
  if (!course) return null;

  const [basic, common, core, jobs] = await Promise.all([
    findBasicCompetencies(course.course_id),
    findCommonCompetencies(course.course_id),
    findCoreCompetencies(course.course_id),
    findJobOpportunities(course.course_id),
  ]);

  return {
    ...course,
    basic_competencies: basic,
    common_competencies: common,
    core_competencies: core,
    job_opportunities: jobs,
  };
}