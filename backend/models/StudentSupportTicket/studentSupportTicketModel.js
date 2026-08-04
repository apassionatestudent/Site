// models/StudentSupportTicket/studentSupportTicketModel.js

import { sql } from "../../config/db.js";

// => List view only needs enough columns for the row + status pill,
// => full message/remarks are fetched separately on the detail page
export async function getSupportTicketsByStudent(studentId) {
  const result = await sql`
    SELECT public_id, subject, concern_type, status, created_at, updated_at
    FROM support_tickets
    WHERE student_id = ${studentId}
    ORDER BY created_at DESC
  `;
  return result.rows;
}

// => Gated by student_id, not just public_id, so one student can never
// => fetch another student's ticket by guessing/enumerating a UUID
export async function getSupportTicketDetailByPublicId(publicId, studentId) {
  const result = await sql`
    SELECT public_id, subject, concern_type, message, status, external_remarks, created_at, updated_at
    FROM support_tickets
    WHERE public_id = ${publicId} AND student_id = ${studentId}
  `;
  return result.rows[0] || null;
}

export async function insertSupportTicket({ studentId, subject, concernType, message }) {
  const result = await sql`
    INSERT INTO support_tickets (student_id, subject, concern_type, message)
    VALUES (${studentId}, ${subject}, ${concernType}, ${message})
    RETURNING public_id, created_at
  `;
  return result.rows[0];
}