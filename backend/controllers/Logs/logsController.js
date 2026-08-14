// => backend/controllers/Logs/logsController.js

import { getStudentActivityLogs, ValidationError } from '../../services/Logs/logsService.js';

// => GET /api/student/logs/my-logs
export const getMyLogs = async (req, res) => {
  try {
    const result = await getStudentActivityLogs(req.student.student_id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error('getMyLogs error:', error);
    return res.status(500).json({ message: 'Server error fetching logs.' });
  }
};