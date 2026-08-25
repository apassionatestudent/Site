// => public/controllers/Enrollments/enrollmentEligibilityController.js
import { getEnrollmentEligibility } from '../../services/Enrollments/enrollmentEligibilityService.js';

// => GET /api/enrollment/eligibility
// => Tells the dashboard Enrollment page whether to show the "+" button,
// => and if so, whether TESDA is same-sector-only or fully open
export const getMyEnrollmentEligibility = async (req, res) => {
  try {
    const eligibility = await getEnrollmentEligibility(req.student.student_id);
    return res.status(200).json({ eligibility });
  } catch (error) {
    console.error('getMyEnrollmentEligibility error:', error);
    return res.status(500).json({ message: 'Server error checking enrollment eligibility.' });
  }
};