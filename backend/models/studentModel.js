import { sql } from '../config/db.js';

export const Student = {

    // => Find a student by their email address
    findByUsername: async (username) => {
        const result = await sql`
            SELECT * FROM student_accounts WHERE username = ${username}
        `;
        return result.rows[0] || null;
    },

    // => Find a student by their public_id (used in URL-facing operations)
    findByPublicId: async (public_id) => {
        const result = await sql`
            SELECT * FROM student_accounts WHERE public_id = ${public_id}
        `;
        return result.rows[0] || null;
    },

    // => Find a student by their internal student_id (used for internal DB operations)
    findById: async (student_id) => {
        const result = await sql`
            SELECT * FROM student_accounts WHERE student_id = ${student_id}
        `;
        return result.rows[0] || null;
    },

    // => Fetches just the display name fields from student_profile for a given student_id
    // => Used by getMe so the Sidebar (and anywhere else) can show the student's actual name
    // => without pulling the full Account Settings payload (address, employment, etc.)
    findNameById: async (student_id) => {
        const result = await sql`
            SELECT first_name, middle_name, last_name, name_extension
            FROM student_profile
            WHERE student_id = ${student_id}
        `;
        return result.rows[0] || null;
    },

    // => Create a new student account
    create: async (username, password_hash) => {
        const result = await sql`
            INSERT INTO student_accounts (username, password_hash)
            VALUES (${username}, ${password_hash})
            RETURNING student_id, public_id, username, is_active, created_at
        `;
        return result.rows[0] || null;
    },

    // => Update last_login_at on every successful login
    updateLastLogin: async (student_id) => {
        await sql`
            UPDATE student_accounts
            SET last_login_at = NOW()
            WHERE student_id = ${student_id}
        `;
    },

    // => Called on every wrong password attempt. Increments the counter,
    // => and if the new count reaches maxAttempts, sets locked_until to
    // => now + lockoutMinutes in the same query, avoiding a race between
    // => a separate read-then-write
    recordFailedLogin: async (student_id, maxAttempts, lockoutMinutes) => {
        const result = await sql`
            UPDATE student_accounts
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE
                    WHEN failed_login_attempts + 1 >= ${maxAttempts}
                    THEN NOW() + make_interval(mins => ${lockoutMinutes})
                    ELSE locked_until
                END
            WHERE student_id = ${student_id}
            RETURNING failed_login_attempts, locked_until
        `;
        return result.rows[0] || null;
    },

    // => Called on successful login, clears the lockout state entirely
    resetFailedAttempts: async (student_id) => {
        await sql`
            UPDATE student_accounts
            SET failed_login_attempts = 0,
                locked_until = NULL
            WHERE student_id = ${student_id}
        `;
    },

    // => Sets password_hash for a student who previously had none (post-
    // => enrollment setup) or is overwriting an existing one (forgot-password
    // => reset). Called by passwordTokenService.js after a token is validated.
    setPassword: async (student_id, password_hash) => {
        await sql`
            UPDATE student_accounts
            SET password_hash = ${password_hash}
            WHERE student_id = ${student_id}
        `;
    },

    // => Deactivate a student account (admin action)
    deactivate: async (student_id) => {
        const result = await sql`
            UPDATE student_accounts
            SET is_active = FALSE
            WHERE student_id = ${student_id}
            RETURNING student_id, public_id, username, is_active
        `;
        return result.rows[0] || null;
    },

    // => Reactivate a student account (admin action)
    activate: async (student_id) => {
        const result = await sql`
            UPDATE student_accounts
            SET is_active = TRUE
            WHERE student_id = ${student_id}
            RETURNING student_id, public_id, username, is_active
        `;
        return result.rows[0] || null;
    },

};