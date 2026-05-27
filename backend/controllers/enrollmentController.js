import { processEnrollmentSubmission } from '../services/enrollmentService.js';

export const submitEnrollment = async (req, res) => {
  try {
    // => req.body has all text fields from FormData
    // => req.files has the Cloudinary-uploaded file objects from multer
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