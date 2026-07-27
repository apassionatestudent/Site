// => public/controllers/Classes/tesdaClassesController.js

import { getStudentTesdaBatchDetail } from '../../services/Classes/tesdaClassesService.js';

// => GET /api/classes/tesda/:publicId
export const getTesdaClassDetail = async (req, res) => {
  try {
    const { publicId } = req.params;
    const detail = await getStudentTesdaBatchDetail(publicId, req.student.student_id);

    // => null covers not found, not owned, or not yet Approved (IDOR prevention)
    if (!detail) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    return res.status(200).json(detail);
  } catch (error) {
    console.error('getTesdaClassDetail error:', error);
    return res.status(500).json({ message: 'Server error fetching class detail.' });
  }
};