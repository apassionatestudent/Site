// => public/controllers/Enrollments/shsEnrollmentController.js
// => Split out of the old enrollmentController.js - SHS-only submission endpoint

import { processShsEnrollmentSubmission } from '../../services/Enrollments/shsEnrollmentService.js';

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
