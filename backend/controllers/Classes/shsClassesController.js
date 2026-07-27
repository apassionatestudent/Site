// => public/controllers/Classes/shsClassesController.js

import { getStudentShsBatchDetail } from '../../services/Classes/shsClassesService.js';

// => GET /api/classes/shs/:publicId
export const getShsClassDetail = async (req, res) => {
  try {
    const { publicId } = req.params;
    const detail = await getStudentShsBatchDetail(publicId, req.student.student_id);

    if (!detail) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    return res.status(200).json(detail);
  } catch (error) {
    console.error('getShsClassDetail error:', error);
    return res.status(500).json({ message: 'Server error fetching class detail.' });
  }
};