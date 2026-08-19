import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Student } from '../models/studentModel.js';
// => generateCsrfToken/invalidateCsrfToken live in middleware but are
// => called here since issuing/revoking tokens is a controller
// => responsibility - mirrors adminAuthController.js's pattern exactly
import { generateCsrfToken, invalidateCsrfToken } from '../middleware/studentCsrf.js';

// => for issuing/consuming password setup & reset tokens
import { issuePasswordToken, consumePasswordToken } from '../services/passwordTokenService.js';

import { ACTIVITY_ACTIONS } from '../constants/activityActions.js';
import { logActivity } from '../services/Logs/logsService.js';

// => Cookie options for security
const cookieOptions = {
    httpOnly: true, // => cookie is only accessible by the web server, not by JavaScript on the client side
    secure: process.env.NODE_ENV === 'production', // => only sent over HTTPS in production
    sameSite: 'Strict', // => prevents CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // => 30 days but I may change it later on, if God willing 
};

// => Account lockout policy for student login, adjust these two if the
// => threshold or cooldown duration ever needs to change
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// => Generates a JWT token carrying essential student identity info
const generateStudentToken = (student) => {
    return jwt.sign(
        {
            student_id: student.student_id,
            public_id:  student.public_id,
            username:   student.username,
            is_active:  student.is_active,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// => POST /api/student-auth/register
export const registerStudent = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide a username (email) and password' });
    }

    try {
        // => Check if a student with this email already exists
        const existing = await Student.findByUsername(username);
        if (existing) {
            return res.status(400).json({ message: 'A student with this email already exists' });
        }

        // => Hash the password before storing
        // => 12 salt rounds: more secure than 10, still performant
        const password_hash = await bcrypt.hash(password, 12);

        // => Create the new student
        const student = await Student.create(username, password_hash);
        if (!student) {
            return res.status(500).json({ message: 'Failed to create student account' });
        }

        const token = generateStudentToken(student);
        res.cookie('token', token, cookieOptions);

        return res.status(201).json({ student });

    } catch (error) {
        console.error('Student registration error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// => POST /api/student-auth/login
export const loginStudent = async (req, res) => {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide a username (email) and password' });
    }

    try {
        // => Find the student by email
        const student = await Student.findByUsername(username);
        if (!student) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // => Reject if account is suspended
        if (!student.is_active) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }

        // => Reject if the account is currently locked out, checked before
        // => password comparison so a locked account never leaks whether
        // => the submitted password would have been correct
        // => lockedUntil sent as a raw ISO timestamp, not a pre-formatted
        // => sentence, so the frontend can run its own live countdown
        // => instead of showing a number that goes stale
        // => message intentionally identical to the rate limiter's own
        // => "too many requests" wording - this keeps a locked real account
        // => indistinguishable from plain IP throttling on a fake email, so
        // => nobody probing a list of addresses can tell which ones exist
        if (student.locked_until && new Date(student.locked_until) > new Date()) {
            return res.status(403).json({
                message: 'Too many requests. Please wait before trying again.',
                lockedUntil: student.locked_until,
            });
        }

        // => Reject if no password has been set yet
        if (!student.password_hash) {
            return res.status(403).json({ message: 'No password set for this account. Please complete your registration.' });
        }

        // => Compare submitted password against stored hash
        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch) {
            // => records the failed attempt, locks the account once the
            // => threshold is hit in the same query, no separate read needed
            const attemptResult = await Student.recordFailedLogin(
                student.student_id,
                MAX_FAILED_LOGIN_ATTEMPTS,
                LOCKOUT_DURATION_MINUTES
            );

            // => Same generic wording as the check above, on purpose. The
            // => moment this attempt is the one that trips the lockout is
            // => exactly when the "account exists" signal would otherwise
            // => leak, so the message stays identical either way
            if (attemptResult?.locked_until) {
                return res.status(403).json({
                    message: 'Too many requests. Please wait before trying again.',
                    lockedUntil: attemptResult.locked_until,
                });
            }

            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // => Successful login clears any prior failed attempts, prevents
        // => stale lockout data from ever accumulating on the row
        await Student.resetFailedAttempts(student.student_id);

        // => Update last_login_at on successful login
        await Student.updateLastLogin(student.student_id);

        // => Fetch display name for the log's actor_name snapshot. Login is
        // => low-frequency enough that a fresh lookup here is fine, unlike a
        // => per-request hot path where this would add up
        const nameRow = await Student.findNameById(student.student_id);
        const actorName = nameRow
            ? [nameRow.first_name, nameRow.last_name].filter(Boolean).join(' ')
            : student.username;

        // => entity_type/entity_id stay null - LOGIN is an account-level
        // => action per the logging convention, not tied to any entity
        // => logActivity never throws internally, so this can never fail
        // => or delay the login response below
        await logActivity({
            actorType: 'Student',
            actorId: student.student_id,
            actorName,
            action: ACTIVITY_ACTIONS.LOGIN,
            actionDetail: `Logged in as ${student.username}`,
        });

        // => cookie duration depends on whether the student chose "Remember Me"
        const loginCookieOptions = rememberMe
            ? cookieOptions  // => 30 days if "Remember Me" was checked
            : { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 }; // => 8 hours if not checked

        const token = generateStudentToken(student);
        res.cookie('token', token, loginCookieOptions);

        // => CSRF token expiry mirrors the login cookie's own duration -
        // => otherwise a Remember Me student's mutations would silently
        // => start failing after 8h while their session cookie is still
        // => valid for weeks
        const csrfToken = generateCsrfToken(loginCookieOptions.maxAge);

        return res.status(200).json({
            student: {
                student_id: student.student_id,
                public_id:  student.public_id,
                username:   student.username,
                is_active:  student.is_active,
            },
            csrfToken,
        });

    } catch (error) {
        console.error('Student login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// => POST /api/student-auth/logout
export const logoutStudent = (req, res) => {
    // => Invalidate the CSRF token so it can't be reused after logout
    const csrfToken = req.headers['x-csrf-token'];
    if (csrfToken) {
        invalidateCsrfToken(csrfToken);
    }

    // => Overwrites the token cookie with an empty string to clear it
    res.cookie('token', '', { ...cookieOptions, maxAge: 1 });
    return res.status(200).json({ message: 'Logged out successfully' });
};

// => GET /api/student-auth/me
// => Returns the currently logged-in student's info from the JWT token,
// => plus their display name, so the frontend has everything it needs
// => to render things like the Sidebar without a second request
export const getMe = async (req, res) => {
    try {
        // => req.student is attached by the protectStudent middleware
        const nameRow = await Student.findNameById(req.student.student_id);

        // => Builds "First Last" for display - falls back gracefully if
        // => the profile row is somehow missing (should not happen post-enrollment)
        const fullName = nameRow
            ? [nameRow.first_name, nameRow.last_name].filter(Boolean).join(' ')
            : null;

        return res.status(200).json({
            student: {
                ...req.student,
                full_name: fullName,
            },
        });
    } catch (error) {
        console.error('getMe error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// => POST /api/student-auth/forgot-password
// => Always returns a generic success message regardless of whether the
// => email exists - revealing which emails are registered is a user
// => enumeration risk. If found and active, a 'reset' token is emailed.
export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Please provide your email address.' });
    }

    try {
        const student = await Student.findByUsername(email);

        if (student && student.is_active) {
            try {
                await issuePasswordToken({ studentId: student.student_id, email: student.username, purpose: 'reset' });
            } catch (err) {
                // => Logged, not surfaced - the response stays generic either way
                console.error('Password reset email failed to send:', err);
            }
        }

        return res.status(200).json({
            message: 'If an account exists for that email, a password reset link has been sent.',
        });

    } catch (error) {
        console.error('Request password reset error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// => POST /api/student-auth/set-password
// => Shared by BOTH the post-enrollment setup link and the forgot-password
// => reset link - consumePasswordToken doesn't care which purpose issued
// => the token, it just validates and burns it
export const setPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    try {
        await consumePasswordToken({ rawToken: token, newPassword: password });
        return res.status(200).json({ message: 'Password set successfully. You may now log in.' });

    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            message: statusCode === 400 ? err.message : 'Server error while setting your password.',
        });
    }
};