// => public/controllers/Enrollments/tesdaEnrollmentController.js
// => Split out of the old enrollmentController.js - TESDA-only submission endpoint

import { processTesdaEnrollmentSubmission } from '../../services/Enrollments/tesdaEnrollmentService.js';

// => POST /api/enrollment/submit
// => Renamed from submitEnrollment to submitTesdaEnrollment - internal
//    rename only, the route path itself is unchanged
export const submitTesdaEnrollment = async (req, res) => {
  try {
    // => req.body has all text fields from FormData
    // => req.files has the uploaded file objects from multer (memory storage)
    const result = await processTesdaEnrollmentSubmission(req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'Enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
    });
  } catch (err) {
    console.error('Enrollment submission error:', err);
    // => Validation errors (statusCode 400) get their real message shown -
    // => genuine server/DB errors stay generic so internals aren't leaked.
    // => Mirrors submitShsEnrollment's existing pattern.
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'Enrollment submission failed. Please try again.',
    });
  }
};
