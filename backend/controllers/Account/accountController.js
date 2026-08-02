// => public/controllers/Account/accountController.js
// => Thin HTTP layer for the Account Settings page - delegates all logic
//    to accountServices.js, same split as the Enrollments controllers.

import {
  getStudentAccount,
  updateStudentProfile,
  changeStudentPassword,
} from '../../services/Account/accountServices.js';

// GET /api/account
// => student_id comes from req.student, set by protectStudent middleware
export const getMyAccount = async (req, res) => {
  try {
    const account = await getStudentAccount(req.student.student_id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    return res.status(200).json({ account });
  } catch (err) {
    console.error('getMyAccount error:', err);
    return res.status(500).json({ error: 'Failed to fetch account details.' });
  }
};

// PATCH /api/account/profile
// => Form 1: contact info + address, saved together
export const updateMyProfile = async (req, res) => {
  try {
    await updateStudentProfile(req.student.student_id, req.body);
    return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    // => Validation errors (statusCode 400) show their real message -
    //    genuine server/DB errors stay generic so internals aren't leaked,
    //    same pattern as tesdaEnrollmentController.js / shsEnrollmentController.js
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'Failed to update profile. Please try again.',
    });
  }
};

// PATCH /api/account/password
// => Form 2: password reset, separate endpoint from the profile form
export const changeMyPassword = async (req, res) => {
  try {
    await changeStudentPassword(req.student.student_id, req.body);
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changeMyPassword error:', err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? err.message : 'Failed to change password. Please try again.',
    });
  }
};
