// => public/controllers/Enrollments/shsEnrollmentController.js
// => Split out of the old enrollmentController.js - SHS-only submission endpoint

import { processShsEnrollmentSubmission, processShsReEnrollmentSubmission } from '../../services/Enrollments/shsEnrollmentService.js';

// => POST /api/enrollment/submit-shs
export const submitShsEnrollment = async (req, res) => {
  try {
    const result = await processShsEnrollmentSubmission(req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'SHS enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
      // => Real lifecycle status ('Pending' or 'Reserved') - lets the
      // => frontend show the correct InformationModal variant, since a
      // => batch can fill up between page load and submit and silently
      // => downgrade the student to Reserved server-side
      status: result.status,
      // => 'explicit' (student picked Reserve themselves) or 'downgraded'
      // => (their real batch pick filled up before this submit landed) -
      // => null when status is Pending
      reserved_reason: result.reservedReason,
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


// => POST /api/enrollment/re-enroll/shs
// => student_id comes from req.student (set by protectStudent middleware),
// => never from the request body
export const submitShsReEnrollment = async (req, res) => {
  try {
    const result = await processShsReEnrollmentSubmission(req.student.student_id, req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'SHS enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
      status: result.status,
      reserved_reason: result.reservedReason,
    });
  } catch (err) {
    console.error('SHS re-enrollment submission error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'SHS enrollment submission failed. Please try again.',
    });
  }
};