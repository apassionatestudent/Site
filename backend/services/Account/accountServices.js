// => public/services/Account/accountServices.js
// => Business logic for the student Account Settings page - validation,
//    password verification, and transaction handling for the two forms
//    (Profile & Address, and Password Reset).

import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import {
  getAccountByStudentId,
  updateProfileContact,
  upsertAddress,
  getPasswordHashByStudentId,
  updatePassword,
} from '../../models/Account/accountModel.js';

// GET ACCOUNT
export const getStudentAccount = async (studentId) => {
  return await getAccountByStudentId(pool, studentId);
};

// UPDATE PROFILE + ADDRESS
// => Both tables are updated together in one transaction so a partial
//    save (e.g. profile succeeds but address fails) can never happen
export const updateStudentProfile = async (studentId, body) => {
  // => Mirrors the NOT NULL constraints on student_profile / student_address -
  //    catches a bad request here with a clear message instead of letting
  //    a raw Postgres constraint-violation reach the client
  if (!body.email || !body.email.trim()) {
    throw Object.assign(new Error('Email address is required.'), { statusCode: 400 });
  }
  if (!body.contactNo || !body.contactNo.trim()) {
    throw Object.assign(new Error('Contact number is required.'), { statusCode: 400 });
  }
  if (!body.facebookLink || !body.facebookLink.trim()) {
    throw Object.assign(new Error('Facebook link is required.'), { statusCode: 400 });
  }
  if (!body.street || !body.street.trim()) {
    throw Object.assign(new Error('Street address is required.'), { statusCode: 400 });
  }
  if (!body.barangay || !body.city || !body.region) {
    throw Object.assign(new Error('Complete address (region, city, barangay) is required.'), { statusCode: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await updateProfileContact(client, studentId, {
      email: body.email,
      contactNo: body.contactNo,
      facebookLink: body.facebookLink,
    });

    await upsertAddress(client, studentId, {
      street: body.street,
      barangay: body.barangay,
      city: body.city,
      province: body.province,
      district: body.district,
      region: body.region,
    });

    await client.query('COMMIT');
  } catch (err) {
    // => Either write failing rolls back both - no partial save ever persists
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// CHANGE PASSWORD
// => currentPassword is required per your direction - prevents an open
//    session (shared computer, stolen cookie) from silently taking over
//    the account by only knowing the new password it wants to set
export const changeStudentPassword = async (studentId, { currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw Object.assign(new Error('All password fields are required.'), { statusCode: 400 });
  }
  if (newPassword !== confirmPassword) {
    throw Object.assign(new Error('New password and confirmation do not match.'), { statusCode: 400 });
  }
  // => Basic minimum length guard - tighten here later (uppercase/number/
  //    symbol requirements) if needed, kept simple for now
  if (newPassword.length < 8) {
    throw Object.assign(new Error('New password must be at least 8 characters.'), { statusCode: 400 });
  }

  const currentHash = await getPasswordHashByStudentId(pool, studentId);

  // => password_hash stays NULL until the student sets it up post-enrollment -
  //    this guards against that edge case with a clear message instead of
  //    a confusing bcrypt.compare failure against null
  if (!currentHash) {
    throw Object.assign(new Error('No password has been set up for this account yet.'), { statusCode: 400 });
  }

  const isMatch = await bcrypt.compare(currentPassword, currentHash);
  if (!isMatch) {
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(pool, studentId, newHash);
};
