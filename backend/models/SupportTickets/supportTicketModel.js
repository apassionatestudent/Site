import { sql } from '../../config/db.js';

// => Only counts THIS student's own tickets, never a global count
// => Open + In Progress both read as "active" from the student's point of view
export const countOpenTicketsForStudent = async (studentId) => {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM support_tickets
    WHERE student_id = ${studentId}
      AND status IN ('Open', 'In Progress')
  `;
  return result[0].count;
};
