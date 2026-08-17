// services/Chatbots/chatbotService.js
// => Validation and business rules for the public/student chatbot widget.
//    Controllers only ever call these functions, never the model directly.

import { findActiveChatbotByScope, findActiveChatbotForMessaging } from '../../models/Chatbots/chatbotModel.js';
import { sendMessageToGemini } from './chatbotGeminiService.js';

// => All four scopes are now served by this portal - tesda_course and
//    shs_course additionally require a course id
const ALLOWED_SCOPES = ['public_site', 'student_dashboard', 'tesda_course', 'shs_course'];
const COURSE_SCOPES = ['tesda_course', 'shs_course'];

export async function getActiveChatbotService(scopeType, rawCourseId) {
    if (!ALLOWED_SCOPES.includes(scopeType)) {
        const error = new Error('Invalid chatbot scope.');
        error.statusCode = 400;
        throw error;
    }

    const requiresCourse = COURSE_SCOPES.includes(scopeType);

    if (requiresCourse && !rawCourseId) {
        const error = new Error('A course id is required for this scope.');
        error.statusCode = 400;
        throw error;
    }
    if (!requiresCourse && rawCourseId) {
        const error = new Error('This scope does not accept a course id.');
        error.statusCode = 400;
        throw error;
    }

    // => courseId travels through the URL as a string - normalize it to a
    //    real integer (or null) before it ever reaches the model/SQL layer
    let courseId = null;
    if (requiresCourse) {
        courseId = Number(rawCourseId);
        if (!Number.isInteger(courseId) || courseId <= 0) {
            const error = new Error('Invalid course id.');
            error.statusCode = 400;
            throw error;
        }
    }

    // => Returns null rather than throwing when no bot is active for this
    //    scope/course - the frontend treats null as "do not render the widget"
    return findActiveChatbotByScope(scopeType, courseId);
}

export async function sendChatbotMessageService(publicId, messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        const error = new Error('At least one message is required.');
        error.statusCode = 400;
        throw error;
    }

    const chatbot = await findActiveChatbotForMessaging(publicId);
    if (!chatbot) {
        // => Covers both "never existed" and "was just deactivated" -
        //    same message either way, no need to distinguish for the visitor
        const error = new Error('This chatbot is no longer available.');
        error.statusCode = 404;
        throw error;
    }

    return sendMessageToGemini({
        instructions: chatbot.instructions,
        context: chatbot.context,
        messages,
    });
}