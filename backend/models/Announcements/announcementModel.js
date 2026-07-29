import { sql } from '../../config/db.js';

// => Raw count query, no business logic here, models stay thin per MVC layering
export const countActiveAnnouncements = async () => {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM announcements
    WHERE is_active = TRUE
  `;
  // => sql tag returns an array of rows, count lives on the first row
  return result[0].count;
};
