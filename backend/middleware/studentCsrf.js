// => public/middleware/studentCsrf.js
// => Validates CSRF token on all state-mutating student requests.
// => Satisfies CodeQL rule: js/missing-token-validation (CWE-352)
// => Mirrors admin/middleware/adminCsrf.js exactly - same Map-based store,
// => same header name, same safe-method skip. Token is generated in
// => studentAuthController.js and sent to the frontend on login.

import crypto from 'crypto';

// => In-memory store of valid CSRF tokens - maps token string to expiry timestamp
const validTokens = new Map();

// => Generates a new CSRF token and registers it in the store.
// => expiryMs is passed in by the caller rather than hardcoded, since
// => unlike admin (always 8h), student session length varies with Remember
// => Me (8h or 30d) - the CSRF token must live exactly as long as the
// => login cookie it's protecting, or mutations start failing while the
// => student still appears logged in.
export const generateCsrfToken = (expiryMs = 8 * 60 * 60 * 1000) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + expiryMs;
    validTokens.set(token, expiry);
    return token;
};

// => Removes a CSRF token from the store - called by studentAuthController on logout
export const invalidateCsrfToken = (token) => {
    validTokens.delete(token);
};

// => Express middleware: validates x-csrf-token header on mutation requests
// => GET/HEAD/OPTIONS are safe methods per RFC 7231 - skipped
export const csrfProtection = (req, res, next) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // => Login/logout are exempt - no token can exist yet for login (this
    // => is where one gets issued), and logout is protected instead by
    // => invalidating the token server-side. register removed - dead
    // => route, accounts are only ever created via the enrollment-then-
    // => invite-link flow, never direct registration
    const exemptRoutes = [
        '/api/student-auth/login',
        '/api/student-auth/logout',
        '/api/student-auth/forgot-password',
        '/api/student-auth/set-password',
    ];
    if (exemptRoutes.includes(req.path)) {
        return next();
    }

    const token = req.headers['x-csrf-token'];

    if (!token) {
        return res.status(403).json({ message: 'CSRF token missing' });
    }

    const expiry = validTokens.get(token);

    if (!expiry) {
        return res.status(403).json({ message: 'CSRF token invalid' });
    }

    if (Date.now() > expiry) {
        // => Token expired - clean it up and reject
        validTokens.delete(token);
        return res.status(403).json({ message: 'CSRF token expired' });
    }

    next();
};
