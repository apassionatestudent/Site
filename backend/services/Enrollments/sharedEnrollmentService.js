// => public/services/Enrollments/sharedEnrollmentService.js
// => Split out of the old enrollmentService.js - holds only the combined
//    TESDA + SHS list and detail fetches used by the student dashboard

import { pool } from '../../config/db.js';
import { getEnrollmentsByStudentId, getEnrollmentByPublicId } from '../../models/Enrollments/sharedEnrollmentModel.js';

// => Calls the model to get all enrollments for the logged-in student
export const getStudentEnrollments = async (studentId) => {
  return await getEnrollmentsByStudentId(pool, studentId);
};

// => Calls the model to get one enrollment by UUID, ownership-checked
export const getStudentEnrollmentDetail = async (publicId, studentId) => {
  return await getEnrollmentByPublicId(pool, publicId, studentId);
};
