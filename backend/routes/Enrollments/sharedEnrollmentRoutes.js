// => public/routes/Enrollments/sharedEnrollmentRoutes.js
// => Split out of the old enrollmentRoutes.js - combined TESDA + SHS read
//    endpoints. Mounted at the same '/api/enrollment' prefix as
//    tesdaEnrollmentRoutes.js and shsEnrollmentRoutes.js in server.js -
//    their paths don't overlap so all three routers coexist safely under
//    one prefix, keeping every existing frontend URL unchanged.

import express from 'express';
import { getMyEnrollments, getMyEnrollmentDetail } from '../../controllers/Enrollments/sharedEnrollmentController.js';
import { getMyEnrollmentEligibility } from '../../controllers/Enrollments/enrollmentEligibilityController.js';
import { protectStudent } from '../../middleware/studentAuth.js';
import { readLimiter, floodLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

// => Protected: only logged-in students can fetch their own enrollments
router.get('/my-enrollments', floodLimiter, protectStudent, readLimiter, getMyEnrollments);

// => Protected: tells the dashboard whether to show the "+" re-enroll
// => button. Must stay ABOVE /:publicId or Express will try to treat
// => "eligibility" as a publicId value and 404/misroute the request.
router.get('/eligibility', floodLimiter, protectStudent, readLimiter, getMyEnrollmentEligibility);

// => Protected: fetch a single enrollment by its public UUID
// => protectStudent ensures the enrollment belongs to the requesting student
router.get('/:publicId', floodLimiter, protectStudent, readLimiter, getMyEnrollmentDetail);

export default router;
