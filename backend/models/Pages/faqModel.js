import { pool } from "../../config/db.js";

// => Flat query, joined and ordered - grouping into sections happens
//    in the service layer, not here
export async function findAllPublicFaqs() {
  const { rows } = await pool.query(
    `SELECT
        s.public_id  AS section_public_id,
        s.name       AS section_name,
        s.sort_order AS section_sort_order,
        f.public_id  AS faq_public_id,
        f.question,
        f.answer,
        f.sort_order AS faq_sort_order
     FROM faqs_sections s
     LEFT JOIN faqs f ON f.section_id = s.section_id
     ORDER BY s.sort_order ASC, s.section_id ASC, f.sort_order ASC, f.faq_id ASC`
  );
  return rows;
}