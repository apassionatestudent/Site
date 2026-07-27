// => public/services/Enrollments/documentService.js
// => Relocated from services/documentService.js into the Enrollments
//    folder - logic is unchanged, only the import path to config/db.js
//    was adjusted for the new folder depth

import { pool } from '../../config/db.js';
import { getDocumentsByStudentId, getDocumentByPublicId } from '../../models/Enrollments/documentModel.js';

// => Calls the model to get all documents (enrollment + profile) for the logged-in student
// => Uses the pool imported at the top - same pattern as sharedEnrollmentService.js
export const getStudentDocuments = async (studentId) => {
  return await getDocumentsByStudentId(pool, studentId);
};

// => Calls the model to get one document by UUID, ownership-checked
// => Returns null if not found or belongs to a different student
export const getStudentDocumentDetail = async (publicId, studentId) => {
  return await getDocumentByPublicId(pool, publicId, studentId);
};
