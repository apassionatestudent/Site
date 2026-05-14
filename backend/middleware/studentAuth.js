import jwt from 'jsonwebtoken';

// => Protects routes that require a logged-in student
// => Verifies the JWT token from the cookie or Authorization header
export const protectStudent = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // => Reject if account was deactivated after the token was issued
        if (!decoded.is_active) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
        }

        // => Attach decoded student info to req so downstream route handlers can use it
        req.student = decoded;
        next();

    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
};