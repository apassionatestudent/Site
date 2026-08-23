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
  updateNightMode,
} from '../../models/Account/accountModel.js';

import { Student } from '../../models/studentModel.js';
import { ACTIVITY_ACTIONS } from '../../constants/activityActions.js';
import { logActivity } from '../Logs/logsService.js';

import { buildFieldDiff, formatDiffDetail } from '../../utils/buildFieldDiff.js';
import { buildAddressDiff } from '../../utils/resolveAddressNames.js';

// => Same 4 rules enforced everywhere else a student/admin sets a password
// => (passwordTokenService.js, staffInviteService.js). This is the real
// => gate, keep it in sync if the rule set ever changes.
const validatePasswordStrength = (value) => {
  if (!value || value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character';
  return null;
};

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

  // => Snapshot the current record before any writes - this is the "old"
  // => side of the diff used for the log's action_detail once the save commits
  const oldRecord = await getAccountByStudentId(pool, studentId);

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

  // => Logged only after the transaction has fully committed, and outside
  // => the try/finally above so a logging issue can never trigger a
  // => ROLLBACK against an already-committed transaction

  // => Contact fields + district use raw-value diffing - district is
  // => already a human-readable number ("2nd"/"3rd"), no code to resolve
  const contactAndDistrictFields = {
    email: body.email,
    contact_no: body.contactNo,
    facebook_link: body.facebookLink,
    district_code: body.district || null,
  };

  const contactAndDistrictLabels = {
    email: 'Email',
    contact_no: 'Contact No.',
    facebook_link: 'Facebook Link',
    district_code: 'District',
  };

  const contactChanges = buildFieldDiff(oldRecord, contactAndDistrictFields, contactAndDistrictLabels);

  // => Region/province/city/barangay/street go through buildAddressDiff
  // => instead, so the log shows resolved place names rather than raw
  // => PSGC codes
  const addressChanges = await buildAddressDiff(oldRecord, {
    street: body.street,
    barangay_code: body.barangay,
    city_code: body.city,
    province_code: body.province || null,
    region_code: body.region,
  });

  const changes = [...contactChanges, ...addressChanges];

  const nameRow = await Student.findNameById(studentId);
  const actorName = nameRow
      ? [nameRow.first_name, nameRow.last_name].filter(Boolean).join(' ')
      : 'Student';

  // => entity_type stays null - general profile UPDATE is an
  // => account-level action per the logging convention
  await logActivity({
      actorType: 'Student',
      actorId: studentId,
      actorName,
      action: ACTIVITY_ACTIONS.UPDATE,
      actionDetail: formatDiffDetail('Profile & Address', changes),
  });
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
  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    throw Object.assign(new Error(passwordError), { statusCode: 400 });
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

  // => Fetch display name for the log's actor_name snapshot
  const nameRow = await Student.findNameById(studentId);
  const actorName = nameRow
      ? [nameRow.first_name, nameRow.last_name].filter(Boolean).join(' ')
      : 'Student';

  // => entity_type stays null - PASSWORD_CHANGE is an account-level
  // => action per the logging convention, same as the auth-side password flows
  await logActivity({
      actorType: 'Student',
      actorId: studentId,
      actorName,
      action: ACTIVITY_ACTIONS.PASSWORD_CHANGE,
      actionDetail: 'Password changed via Account Settings',
  });
};

// UPDATE NIGHT MODE PREFERENCE
// => Not logged to activity_logs - this is a UI preference, not a
// => business-record-worthy account action like profile/password changes
export const updateStudentNightMode = async (studentId, isNightMode) => {
  if (typeof isNightMode !== 'boolean') {
    throw Object.assign(new Error('isNightMode must be true or false.'), { statusCode: 400 });
  }
  await updateNightMode(pool, studentId, isNightMode);
};
