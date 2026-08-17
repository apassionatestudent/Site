// middleware/publicChatbotRateLimit.js
// => Throttles the chatbot routes specifically, since the message
//    endpoint is the only one in this codebase that costs money per
//    call (Gemini API) and is reachable with no login at all.

import rateLimit from 'express-rate-limit';

// => 20 messages per 10 minutes per IP, generous for a real back-and-forth
//    test conversation but tight enough to block abuse
export const publicChatbotRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many chatbot messages sent. Please wait a few minutes and try again.' },
});