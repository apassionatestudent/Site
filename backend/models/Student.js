import { sql } from '../config/db.js';

export const Student = {

    // => Find a student by their email address
    findByUsername: async (username) => {
        const result = await sql`
            SELECT * FROM students WHERE username = ${username}
        `;
        return result.rows[0] || null;
    },

    // => Find a student by their public_id (used in URL-facing operations)
    findByPublicId: async (public_id) => {
        const result = await sql`
            SELECT * FROM students WHERE public_id = ${public_id}
        `;
        return result.rows[0] || null;
    },

    // => Find a student by their internal student_id (used for internal DB operations)
    findById: async (student_id) => {
        const result = await sql`
            SELECT * FROM students WHERE student_id = ${student_id}
        `;
        return result.rows[0] || null;
    },

    // => Create a new student account
    // => is_email_confirmed is set to TRUE temporarily for Postman testing
    create: async (username, password_hash) => {
        const result = await sql`
            INSERT INTO students (username, password_hash, is_email_confirmed)
            VALUES (${username}, ${password_hash}, TRUE)
            RETURNING student_id, public_id, username, is_active, created_at
        `;
        return result.rows[0] || null;
    },

    // => Update last_login_at on every successful login
    updateLastLogin: async (student_id) => {
        await sql`
            UPDATE students
            SET last_login_at = NOW()
            WHERE student_id = ${student_id}
        `;
    },

    // => Deactivate a student account (admin action)
    deactivate: async (student_id) => {
        const result = await sql`
            UPDATE students
            SET is_active = FALSE
            WHERE student_id = ${student_id}
            RETURNING student_id, public_id, username, is_active
        `;
        return result.rows[0] || null;
    },

    // => Reactivate a student account (admin action)
    activate: async (student_id) => {
        const result = await sql`
            UPDATE students
            SET is_active = TRUE
            WHERE student_id = ${student_id}
            RETURNING student_id, public_id, username, is_active
        `;
        return result.rows[0] || null;
    },

};