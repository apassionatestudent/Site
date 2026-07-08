import { processEnrollmentSubmission, processShsEnrollmentSubmission, getStudentEnrollments, getStudentEnrollmentDetail } from '../services/enrollmentService.js';

// => POST /api/enrollment/submit
export const submitEnrollment = async (req, res) => {
  try {
    // => req.body has all text fields from FormData
    // => req.files has the uploaded file objects from multer (memory storage)
    const result = await processEnrollmentSubmission(req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'Enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
    });
  } catch (err) {
    console.error('Enrollment submission error:', err);
    res.status(500).json({
      success: false,
      message: 'Enrollment submission failed. Please try again.',
    });
  }
};

// => POST /api/enrollment/submit-shs
export const submitShsEnrollment = async (req, res) => {
  try {
    const result = await processShsEnrollmentSubmission(req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'SHS enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
    });
  } catch (err) {
    console.error('SHS enrollment submission error:', err);
    // => Validation errors (statusCode 400) get their real message shown -
    // => genuine server/DB errors stay generic so internals aren't leaked
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'SHS enrollment submission failed. Please try again.',
    });
  }
};

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