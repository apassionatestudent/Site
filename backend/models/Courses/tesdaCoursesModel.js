import { sql } from '../../config/db.js';

// => Returns every published, active TESDA course for the public course list
// => Joins national_certification_types so the NC Level label comes along for free
export async function findAllPublicTesdaCourses() {
  // => sql`` returns the full result object here ({fields, rows, rowCount, ...}),
  // => not a plain array - destructure .rows to get the actual records
  const { rows } = await sql`
    SELECT
      tc.course_id,
      tc.title,
      tc.description,
      tc.hours,
      nct.certification_type AS nc_level
    FROM tesda_courses tc
    LEFT JOIN national_certification_types nct
      ON nct.certification_id = tc.certification_id
    WHERE tc.status = 'active'
      AND tc.deleted_at IS NULL
    ORDER BY tc.title ASC
  `;
  return rows;
}

// => Looks up a single active course by its exact title, case-insensitive
// => Title is used directly as the URL identifier, per your decision to
// => skip adding a slug column
export async function findPublicTesdaCourseByTitle(title) {
  // => Same fix - destructure .rows before indexing into it
  const { rows } = await sql`
    SELECT
      tc.course_id,
      tc.title,
      tc.description,
      tc.hours,
      tc.amount,
      tc.accreditation_no,
      tc.date_accredited,
      tc.expiration_date,
      s.sector AS sector,
      nct.certification_type AS nc_level
    FROM tesda_courses tc
    LEFT JOIN sectors s ON s.sector_id = tc.sector_id
    LEFT JOIN national_certification_types nct
      ON nct.certification_id = tc.certification_id
    WHERE tc.status = 'active'
      AND tc.deleted_at IS NULL
      AND LOWER(tc.title) = LOWER(${title})
    LIMIT 1
  `;
  return rows[0] || null;
}

// => The three competency tables and job opportunities all key off course_id
export async function findBasicCompetencies(courseId) {
  // => Same fix - unwrap .rows before returning
  const { rows } = await sql`SELECT basic_id, code, competency FROM basic_competency WHERE course_id = ${courseId}`;
  return rows;
}

export async function findCommonCompetencies(courseId) {
  const { rows } = await sql`SELECT common_id, code, competency FROM common_competency WHERE course_id = ${courseId}`;
  return rows;
}

export async function findCoreCompetencies(courseId) {
  const { rows } = await sql`SELECT core_id, code, competency FROM core_competency WHERE course_id = ${courseId}`;
  return rows;
}

export async function findJobOpportunities(courseId) {
  const { rows } = await sql`SELECT job_id, job_title FROM tesda_job_opportunities WHERE course_id = ${courseId}`;
  return rows;
}