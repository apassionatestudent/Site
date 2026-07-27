// => public/controllers/Classes/sharedClassesController.js

import { getStudentBatches } from '../../services/Classes/sharedClassesService.js';

// => GET /api/classes/my-batches
export const getMyBatches = async (req, res) => {
  try {
    const batches = await getStudentBatches(req.student.student_id);
    return res.status(200).json({ batches });
  } catch (error) {
    console.error('getMyBatches error:', error);
    return res.status(500).json({ message: 'Server error fetching classes.' });
  }
};