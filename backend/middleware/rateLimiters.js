// => Centralized rate limiters, reused across route files so the config
// => lives in one place instead of being duplicated per-file.
import rateLimit from 'express-rate-limit';

// => Shared handler used by all limiters below. Replaces the default
// => plain-text 429 with structured JSON, so the frontend can read
// => `retryAfter` and show a countdown instead of a dead-end error.
// => I don't want the shitty 'can't fetch' anything anymore by not displaying anything at all. UX sucks if that's the case lol 
const rateLimitHandler = (req, res) => {
  const retryAfterSeconds = req.rateLimit?.resetTime
    ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
    : 60;

  res.status(429).json({
    error: 'rate_limited',
    message: 'Too many requests. Please wait before trying again.',
    retryAfter: retryAfterSeconds, // => seconds until this IP can retry
  });
};

// => For auth endpoints (login/signup) - tight limit since these are
// => prime targets for brute-force and credential-stuffing attacks.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  handler: rateLimitHandler, // => structured JSON instead of plain text
  standardHeaders: true,
  legacyHeaders: false,
});

// => For general form-submission endpoints (enrollment, document upload) -
// => looser than auth since legitimate users may retry after validation
// => errors, but still caps abuse/spam submissions.
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// => For authenticated GET/read endpoints (dashboard data fetches) - much
// => more generous than authLimiter since legitimate use means a student's
// => dashboard may call these repeatedly during normal navigation. Still
// => caps abuse from a leaked/stolen token being used to scrape or hammer
// => endpoints that proxy paid resources (e.g. Cloudinary document streams).
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins 
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  // => Keys by the logged-in student's ID instead of IP. This limiter only
  // => ever runs AFTER protectStudent (see documentRoutes.js, etc.), so
  // => req.student is guaranteed to exist here. Falls back to req.ip just
  // => in case it's ever mounted on a route without protectStudent first.
  keyGenerator: (req) => req.student?.student_id?.toString() ?? req.ip,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});