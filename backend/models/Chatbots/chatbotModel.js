// models/Chatbots/chatbotModel.js
// => Raw SQL only, mirrors the admin side's model layer shape. This
//    portal only ever reads from the chatbots table, never writes to it.

import { pool } from '../../config/db.js';

// => Powers the widget's initial config fetch. Only the fields safe to
//    hand to an anonymous browser - instructions/context never leave
//    the server.
// => courseId is null for public_site/student_dashboard (which have no
//    course_id set on the chatbots row) and an actual course_id for
//    tesda_course/shs_course - the OR clause matches either case with
//    one query instead of two separate branches
export async function findActiveChatbotByScope(scopeType, courseId = null) {
    const result = await pool.query(
        `SELECT public_id, widget_header_title, welcome_message
         FROM chatbots
         WHERE scope_type = $1
           AND status = 'active'
           AND (course_id = $2::INTEGER OR ($2::INTEGER IS NULL AND course_id IS NULL))
         LIMIT 1`,
        [scopeType, courseId]
    );
    return result.rows[0] || null;
}

// => Powers the message-send endpoint. status = 'active' is part of the
//    WHERE clause itself, not checked afterward in JS, so a bot that
//    gets deactivated mid-conversation stops responding immediately.
export async function findActiveChatbotForMessaging(publicId) {
    const result = await pool.query(
        `SELECT chatbot_id, public_id, instructions, context
         FROM chatbots
         WHERE public_id = $1 AND status = 'active'`,
        [publicId]
    );
    return result.rows[0] || null;
}