import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Student } from '../models/Student.js';

// => for sending login notification emails and such
import { sendEmail } from '../utils/sendEmail.js';
import { loginNotificationTemplate } from '../utils/emailTemplates.js';

// => Cookie options for security
const cookieOptions = {
    httpOnly: true, // => cookie is only accessible by the web server, not by JavaScript on the client side
    secure: process.env.NODE_ENV === 'production', // => only sent over HTTPS in production
    sameSite: 'Strict', // => prevents CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // => 30 days but I may change it later on, if God willing 
};

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

        // => Reject if email is not yet confirmed
        if (!student.is_email_confirmed) {
            return res.status(403).json({ message: 'Please confirm your email before logging in.' });
        }

        // => Reject if no password has been set yet
        if (!student.password_hash) {
            return res.status(403).json({ message: 'No password set for this account. Please complete your registration.' });
        }

        // => Compare submitted password against stored hash
        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // => Update last_login_at on successful login
        await Student.updateLastLogin(student.student_id);

        // => Send login notification email to the student
        // => Runs after login succeeds - failure won't affect the login response
        const { subject, html } = loginNotificationTemplate({
            username: student.username,
            loginTime: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        });
        sendEmail({ to: student.username, subject, html });
        // => Note: not awaited intentionally - email sending runs in the background
        // => so a slow email server never delays the login response to the student

        // => cookie duration depends on whether the student chose "Remember Me"
        const loginCookieOptions = rememberMe
            ? cookieOptions  // => 30 days if "Remember Me" was checked
            : { ...cookieOptions, maxAge: undefined }; // => session cookie if not checked (gone on browser close)

        const token = generateStudentToken(student);
        res.cookie('token', token, loginCookieOptions);

        return res.status(200).json({
            student: {
                student_id: student.student_id,
                public_id:  student.public_id,
                username:   student.username,
                is_active:  student.is_active,
            }
        });

    } catch (error) {
        console.error('Student login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// => POST /api/student-auth/logout
export const logoutStudent = (req, res) => {
    // => Overwrites the token cookie with an empty string to clear it
    res.cookie('token', '', { ...cookieOptions, maxAge: 1 });
    return res.status(200).json({ message: 'Logged out successfully' });
};

// => GET /api/student-auth/me
// => Returns the currently logged-in student's info from the JWT token
export const getMe = (req, res) => {
    // => req.student is attached by the protectStudent middleware
    return res.status(200).json({ student: req.student });
};