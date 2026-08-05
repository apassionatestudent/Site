// => backend/services/passwordTokenService.js
// => Generates, emails, and consumes password setup/reset tokens.
// => Shared by: TESDA/SHS enrollment submission (purpose 'setup') and
//    the forgot-password flow (purpose 'reset').

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {
  insertPasswordToken,
  findValidTokenByHash,
  markTokenUsed,
  deleteExpiredTokens,
} from '../models/passwordTokenModel.js';

import { Student } from '../models/studentModel.js';
import { sendEmail } from '../utils/sendEmail.js';
import { passwordSetupTemplate, passwordResetTemplate } from '../utils/emailTemplates.js';

// => 10 minutes for both purposes - matches the InformationModal's mockup
// => copy for 'setup'. 'reset' wasn't separately confirmed, so it's using
// => the same value for now; easy to split later since it's one constant.
const TOKEN_TTL_MS = 10 * 60 * 1000;

// => Not bcrypt here on purpose - bcrypt is for low-entropy secrets like
// => passwords where slow hashing defeats brute force. This token is a
// => 32-byte random value with no brute-force risk; SHA-256 just needs to
// => be irreversible and fast enough for an exact-match DB lookup.
const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

// => Creates a token row, then emails the link. Called AFTER the caller's
// => own transaction has committed - a Resend outage must never roll back
// => an enrollment or block a password-reset request from completing.
export const issuePasswordToken = async ({ studentId, email, purpose, enrollmentStatus }) => {
  // => Opportunistic cleanup - runs only as a side effect of a new token
  // => being issued, no scheduler or cron job needed. Only removes rows
  // => whose 10-minute window closed more than 7 days ago, so a token
  // => still within its valid life can never be caught by this.
  // => Wrapped separately so a cleanup failure never blocks the actual
  // => token this function was called to create.
  try {
    await deleteExpiredTokens();
  } catch (err) {
    console.error('Password token cleanup failed:', err);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await insertPasswordToken({ studentId, tokenHash, purpose, expiresAt });

  // => No PUBLIC_SITE_URL env var yet since deployment isn't set up - falls
  // => back to the local Vite dev server. Swap this default (or add the
  // => env var) once a real domain exists.
  const link = `${process.env.PUBLIC_SITE_URL || 'http://localhost:5173'}/set-password?token=${rawToken}`;

  const { subject, html } = purpose === 'reset'
    ? passwordResetTemplate({ link })
    : passwordSetupTemplate({ link, enrollmentStatus });

  await sendEmail({ to: email, subject, html });
};

// => Validates a raw token from the URL, sets the new password, and burns
// => the token so the same link can never be reused. Returns the
// => student_id on success, throws a client-safe 400 on any failure.
export const consumePasswordToken = async ({ rawToken, newPassword }) => {
  if (!rawToken || !newPassword) {
    throw Object.assign(new Error('Token and new password are required.'), { statusCode: 400 });
  }

  const tokenHash = hashToken(rawToken);
  const tokenRow = await findValidTokenByHash(tokenHash);

  if (!tokenRow) {
    throw Object.assign(new Error('This link is invalid or has expired. Please request a new one.'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await Student.setPassword(tokenRow.student_id, passwordHash);
  await markTokenUsed(tokenRow.token_id);

  return tokenRow.student_id;
};