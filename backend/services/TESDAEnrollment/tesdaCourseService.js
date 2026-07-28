// => services/TESDAEnrollment/tesdaCourseService.js
// => New file - previously courseController.js queried the DB directly
//    with no service layer in between

import { getActiveCourses } from '../../models/TESDAEnrollment/tesdaCourseModel.js';

export const getActiveTesdaCourses = async () => {
  return await getActiveCourses();
};
