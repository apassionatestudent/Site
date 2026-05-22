import { strictEqual } from "assert/strict";
import { sql } from "../config/db.js"; 

// => GET /api/branches => fetch all active branches for the public dropdown
export const getBranches = async (req, res) => {
  try {
    const result = await sql.query(
      `SELECT branch_id, branch_name, address, office_hours, maps_url
       FROM branches
       WHERE is_active = TRUE
       ORDER BY branch_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching branches:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};