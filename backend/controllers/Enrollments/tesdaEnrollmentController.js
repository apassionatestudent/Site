// => public/controllers/Enrollments/tesdaEnrollmentController.js
// => Split out of the old enrollmentController.js - TESDA-only submission endpoint

import { processTesdaEnrollmentSubmission, processTesdaReEnrollmentSubmission } from '../../services/Enrollments/tesdaEnrollmentService.js';
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


// => POST /api/enrollment/re-enroll/tesda
// => student_id comes from req.student (set by protectStudent middleware),
// => never from the request body, so a student can never re-enroll on
// => someone else's behalf
export const submitTesdaReEnrollment = async (req, res) => {
  try {
    const result = await processTesdaReEnrollmentSubmission(req.student.student_id, req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'Enrollment submitted successfully.',
      enrollment_id: result.enrollmentId,
      status: result.status,
      reserved_reason: result.reservedReason,
    });
  } catch (err) {
    console.error('TESDA re-enrollment submission error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'Enrollment submission failed. Please try again.',
    });
  }
};