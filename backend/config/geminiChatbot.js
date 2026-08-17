// config/geminiChatbot.js
import dotenv from 'dotenv';
dotenv.config();

// => Own copy for the public/student portal backend, separate from the
//    admin dashboard's config/geminiChatbot.js, per the no-shared-code
//    policy between the two codebases.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
export const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';