// => Model: read-only lookup of a single CMS page row by slug
import { pool } from "../../config/db.js";

export async function findPageBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT slug, content, updated_at
     FROM cms_pages
     WHERE slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

// => Lightweight lookup - just the timestamp, no content or images, used
//    by the frontend to decide whether a full refetch is even needed
export async function findPageMetaBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT slug, updated_at
     FROM cms_pages
     WHERE slug = $1`,
    [slug]
  );
  return rows[0] || null;
}