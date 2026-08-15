import { pool } from '../../config/db.js';



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