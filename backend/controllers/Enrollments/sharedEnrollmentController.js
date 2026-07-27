// => public/controllers/Enrollments/sharedEnrollmentController.js
// => Split out of the old enrollmentController.js - combined TESDA + SHS
//    read endpoints for the student dashboard

import { getStudentEnrollments, getStudentEnrollmentDetail } from '../../services/Enrollments/sharedEnrollmentService.js';

// => GET /api/enrollment/my-enrollments
// => Returns all enrollments for the currently logged-in student
export const getMyEnrollments = async (req, res) => {
  try {
    // => req.student.student_id comes from protectStudent middleware via JWT
    // => pool is handled inside the service - no need to pass it here
    const enrollments = await getStudentEnrollments(req.student.student_id);
    return res.status(200).json({ enrollments });
  } catch (error) {
    console.error('getMyEnrollments error:', error);
    return res.status(500).json({ message: 'Server error fetching enrollments.' });
  }
};

// => GET /api/enrollment/:publicId
// => Returns a single enrollment detail by UUID, verified against the logged-in student
export const getMyEnrollmentDetail = async (req, res) => {
  try {
    const { publicId } = req.params;
    // => pool is handled inside the service - no need to pass it here
    // => student_id ownership check inside the service prevents IDOR
    const enrollment = await getStudentEnrollmentDetail(publicId, req.student.student_id);

    // => Return 404 if not found OR if it belongs to a different student (IDOR prevention)
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    return res.status(200).json({ enrollment });
  } catch (error) {
    console.error('getMyEnrollmentDetail error:', error);
    return res.status(500).json({ message: 'Server error fetching enrollment detail.' });
  }
};
