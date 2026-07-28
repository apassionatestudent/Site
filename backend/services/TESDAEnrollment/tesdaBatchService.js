// => services/TESDAEnrollment/tesdaBatchService.js
// => New file - previously classController.js queried the DB directly
//    with no service layer in between

import { getOpenBatchesByCourseId } from '../../models/TESDAEnrollment/tesdaBatchModel.js';

export const getBatchesForCourse = async (courseId) => {
  return await getOpenBatchesByCourseId(courseId);
};
