// => backend/models/passwordTokenModel.js
// => Handles password_setup_tokens - single-use, expiring tokens used for
//    both new-account password setup (purpose = 'setup') and forgot-password
//    resets (purpose = 'reset'). Uses `sql` since these are standalone
//    queries, not part of an enrollment transaction - the token is created
//    AFTER the enrollment transaction commits.

import { sql } from '../config/db.js';

// => Insert a new token row - token_hash is the SHA-256 hash of the raw
// => token, never the raw token itself (same principle as password_hash)
export const insertPasswordToken = async ({ studentId, tokenHash, purpose, expiresAt }) => {
  const result = await sql`
    INSERT INTO password_setup_tokens (student_id, token_hash, purpose, expires_at)
    VALUES (${studentId}, ${tokenHash}, ${purpose}, ${expiresAt})
    RETURNING token_id
  `;
  return result.rows[0];
};

// => Looks up a token by its hash - only returns unexpired, unused rows.
// => The caller gets student_id back from the DB row itself, so it never
// => has to trust a client-supplied student_id alongside the token.
export const findValidTokenByHash = async (tokenHash) => {
  const result = await sql`
    SELECT token_id, student_id, purpose, expires_at, used_at
    FROM password_setup_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
  `;
  return result.rows[0] || null;
};

// => Marks a token as consumed - called immediately after a successful
// => password set, so the same link can never be reused
export const markTokenUsed = async (tokenId) => {
  await sql`
    UPDATE password_setup_tokens
    SET used_at = NOW()
    WHERE token_id = ${tokenId}
  `;
};

// => Opportunistic cleanup - deletes rows whose 10-minute window closed
// => more than 7 days ago. Called from issuePasswordToken as a side
// => effect of a new token being created, never on its own schedule.
// => Condition is against expires_at, not created_at, so a currently
// => valid token can never be caught by this regardless of table size.
export const deleteExpiredTokens = async () => {
  await sql`
    DELETE FROM password_setup_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
  `;
};