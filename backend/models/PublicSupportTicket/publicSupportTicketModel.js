// models/PublicSupportTicket/publicSupportTicketModel.js

import { sql } from "../../config/db.js";

// => Inserts one public support ticket and returns just enough back
// => to confirm submission without exposing the internal ticket_id
export async function insertPublicSupportTicket({ fullName, email, concernType, concern }) {
  const result = await sql`
    INSERT INTO public_support_tickets (full_name, email, concern_type, concern)
    VALUES (${fullName}, ${email}, ${concernType}, ${concern})
    RETURNING public_id, created_at
  `;

  // => .rows is mandatory - the sql client returns the full result object, not a bare array
  return result.rows[0];
}