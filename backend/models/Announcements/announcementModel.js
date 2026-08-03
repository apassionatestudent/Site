import { pool } from '../../config/db.js';

// => Raw count query, no business logic here, models stay thin per MVC layering
export const countActiveAnnouncements = async () => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM announcements WHERE is_active = TRUE`
  );
  // => pool.query always resolves to { rows, fields, ... }, node-postgres
  // => style, no ambiguity like the sql tag's fullResults flag
  return result.rows[0].count;
};

// => Full list of active announcements, newest first, for the Student Dashboard feed
export const getActiveAnnouncements = async () => {
  const result = await pool.query(
    `SELECT
       public_id,
       title,
       message,
       created_at
     FROM announcements
     WHERE is_active = TRUE
     ORDER BY created_at DESC`
  );
  return result.rows;
};