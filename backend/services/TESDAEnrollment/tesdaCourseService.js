// => services/TESDAEnrollment/tesdaCourseService.js
// => New file - previously courseController.js queried the DB directly
//    with no service layer in between

import { getActiveCourses, getRequirementsByCourseId } from '../../models/TESDAEnrollment/tesdaCourseModel.js';

export const getActiveTesdaCourses = async () => {
  return await getActiveCourses();
};

// => Passes course_id straight through to the model, no extra business
// => logic needed here since this is a plain read for the public
// => enrollment form's Upload Requirements section
export const getCourseRequirements = async (courseId) => {
  return await getRequirementsByCourseId(courseId);
};
