// => public/controllers/Enrollments/documentController.js
// => Relocated from controllers/documentController.js into the Enrollments
//    folder - logic is unchanged. Not split by TESDA/SHS since both
//    functions already read across both document tables together (see
//    documentModel.js), so there's nothing type-specific to separate out.

import { getStudentDocuments, getStudentDocumentDetail } from '../../services/Enrollments/documentService.js';

// => GET /api/documents/my-documents
// => Returns all documents (enrollment + profile) for the logged-in student
// => student_id comes from req.student set by protectStudent middleware
export const getMyDocuments = async (req, res) => {
  try {
    const documents = await getStudentDocuments(req.student.student_id);
    return res.status(200).json({ documents });
  } catch (err) {
    console.error('getMyDocuments error:', err);
    return res.status(500).json({ error: 'Failed to fetch documents.' });
  }
};

// => GET /api/documents/detail/:publicId
// => Returns the detail of one document, ownership-checked against the JWT student_id
// => 404 is returned for both "not found" and "belongs to another student"
// => so the response gives no information about whether the UUID exists at all
export const getMyDocumentDetail = async (req, res) => {
  const { publicId } = req.params;

  try {
    const document = await getStudentDocumentDetail(publicId, req.student.student_id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    return res.status(200).json({ document });
  } catch (err) {
    console.error('getMyDocumentDetail error:', err);
    return res.status(500).json({ error: 'Failed to fetch document details.' });
  }
};
