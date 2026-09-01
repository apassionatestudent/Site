// => public/models/Enrollments/sharedEnrollmentModel.js
// => Split out of the old enrollmentModel.js - this file holds only what's
//    genuinely shared between TESDA and SHS: inserts into student_accounts /
//    student_profile / student_address / student_guardian (shared identity
//    tables, not owned by either enrollment type), and the combined
//    UNION ALL list/detail queries used by the student dashboard.
// => All insert functions receive `client` - a pg pool client inside a transaction
// => Read functions receive `pool` directly - mirrors adminEnrollmentModel.js pattern

// => Month name to index map - mirrors TESDAStep2's MONTHS array
// => TESDAStep2 sends birthMonth as a name (e.g. 'August'), not a number
// => Only used by insertStudentProfile below, which both TESDA and SHS call
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

// STUDENT ACCOUNT
// => username is nullable - only set if student provided an email
// => password_hash stays NULL until student sets up their account post-enrollment
export const insertStudentAccount = async (client, { email }) => {
  const result = await client.query(
    `INSERT INTO student_accounts (username, password_hash, is_active, created_at)
     VALUES ($1, NULL, TRUE, NOW())
     RETURNING student_id`,
    [email || null]
  );
  return result.rows[0].student_id;
};

// CHECK EMAIL OR FACEBOOK LINK ALREADY REGISTERED
// => username in student_accounts IS the email - same column the unique
// => constraint students_username_key protects. facebook_link lives in
// => student_profile instead and has NO unique constraint at the DB
// => level, so that half of this check is purely an application-level
// => rule, not something Postgres would ever catch on its own.
// => Checked before insertStudentAccount runs so a duplicate surfaces as
// => a clean 400 message instead of a raw 500 from the DB constraint
// => violation (email case only - facebook_link was never going to throw
// => one in the first place).
// => matched_field tells the caller which one collided, so the error
// => message shown to the student can be specific instead of vague.
export const getDuplicateStudentAccount = async (client, { email, facebookLink }) => {
  const result = await client.query(
    `SELECT sa.student_id,
            CASE
              WHEN LOWER(sa.username) = LOWER($1) THEN 'email'
              ELSE 'facebook'
            END AS matched_field
     FROM student_accounts sa
     JOIN student_profile sp ON sp.student_id = sa.student_id
     WHERE LOWER(sa.username) = LOWER($1)
        OR LOWER(sp.facebook_link) = LOWER($2)
     LIMIT 1`,
    [email, facebookLink]
  );
  return result.rows[0] || null;
};

// GET STUDENT NAME BY ID
// => Used for activity log actorName on re-enrollment submissions. Unlike
// => first-time enrollment, body.firstName/lastName aren't sent since the
// => profile already exists, so the name is read back instead of re-typed
export const getStudentNameById = async (client, studentId) => {
  const result = await client.query(
    `SELECT first_name, last_name FROM student_profile WHERE student_id = $1`,
    [studentId]
  );
  return result.rows[0] || null;
};

// STUDENT PROFILE
// => Anchored to student_id (not profile_id anymore)
// => contact_no, facebook_link, email stored directly here
// => birth_date stored as DATE - frontend sends YYYY-MM-DD
export const insertStudentProfile = async (client, { studentId, body }) => {
  const result = await client.query(
    `INSERT INTO student_profile
       (student_id, last_name, first_name, middle_name, name_extension,
        contact_no, facebook_link, email, nationality,
        sex, civil_status, employment_status,
        birth_date,
        birthplace_region, birthplace_province, birthplace_city,
        highest_educ_attainment,
        religion, religion_others)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING profile_id`,
    [
      studentId,
      body.lastName,
      body.firstName,
      body.middleName        || null,
      body.nameExtension     || body.suffix || null,
      body.contactNo,
      body.facebookLink      || null,
      body.email             || null,
      body.nationality       || body.citizenship || null,
      body.sex,
      body.civilStatus       || null,
      body.employmentStatus  || null,
      `${body.birthYear}-${String(MONTHS.indexOf(body.birthMonth) + 1).padStart(2,'0')}-${String(body.birthDay).padStart(2,'0')}`,
      body.birthplaceRegion,
      body.birthplaceProvince || null,
      body.birthplaceCity,
      body.educAttainment     || null,
      // => lrn REMOVED - belongs on shs_enrollments, not student_profile
      body.religion           || null,
      body.religionOthers     || null,
    ]
  );
  return result.rows[0].profile_id;
};

// STUDENT ADDRESS
// => Now anchored to student_id directly (not profile_id)
// => district_code auto-filled from city, may arrive as empty string - coerce to null
// => province_code nullable for NCR
export const insertStudentAddress = async (client, { studentId, body }) => {
  await client.query(
    `INSERT INTO student_address
       (student_id, street, barangay_code, city_code, province_code, district_code, region_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      studentId,
      body.street,
      body.barangay,
      body.city,
      body.province   || null,
      body.district   || null,
      body.region,
    ]
  );
};

// STUDENT GUARDIAN
// => Only inserted when the student is a minor (under 18)
// => Anchored to student_id directly
// => guardian_address is optional per MIS 03-01 2018
// => note: only the TESDA submission flow currently calls this. SHS's
//    equivalent guardian data goes through shs_family_members' Guardian
//    role instead. Kept here rather than in tesdaEnrollmentModel.js since
//    student_guardian is the same shared identity table the admin side
//    treats as shared too - if SHS ever needs to write here, no file
//    needs to move.
export const insertStudentGuardian = async (client, { studentId, body }) => {
  if (!body.guardianName) return; // => skip if not a minor or not provided

  await client.query(
    `INSERT INTO student_guardian (student_id, guardian_name, guardian_address, guardian_contact_no)
     VALUES ($1, $2, $3, $4)`,
    [
      studentId,
      body.guardianName,
      body.guardianAddress || null,
      body.guardianContactNo,
    ]
  );
};

// STUDENT DOCS
// => Permanent copies tied to the student account, not just this enrollment
// => Stores R2 object key - never a public URL
// => note: currently unused - both processTesdaEnrollmentSubmission and
//    processShsEnrollmentSubmission intentionally skip this and rely on
//    tesda_documents/shs_documents as the single source of truth. Kept
//    here for whenever a separate profile-level document upload flow is built.
export const insertStudentDocs = async (client, { studentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO student_docs (student_id, document_type, document_key, uploaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [studentId, doc.type, doc.key]
    );
  }
};

// GET ALL ENROLLMENTS FOR A STUDENT
// => UNION ALL across tesda_enrollments and shs_enrollments - each branch
// => explicitly casts its "N/A for this type" columns (e.g. course_name is
// => NULL::VARCHAR on the SHS branch) so both SELECTs produce identical
// => column types, which UNION ALL requires
// => class_type is pulled through so the frontend can show "Free
// => (TESDA-Sponsored)" instead of fee_at_enrollment when applicable
export const getEnrollmentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT * FROM (
        SELECT
          e.public_id,
          'TESDA'                 AS enrollment_type,
          e.status,
          e.submitted_at,
          e.fee_at_enrollment,
          cl.class_type,
          c.title                 AS course_name,
          nct.certification_type  AS nc_level, -- => e.g. "NC II", used to build the parenthetical in the title
          s.sector                AS sector,
          NULL::VARCHAR(20)       AS track,
          NULL::VARCHAR(60)       AS cluster,
          NULL::VARCHAR(20)       AS school_year_completed,
          NULL::VARCHAR(30)       AS grade_level_completed,
          NULL::TEXT              AS last_school_attended
        FROM tesda_enrollments e
        LEFT JOIN tesda_courses c                       ON e.course_id  = c.course_id
        LEFT JOIN sectors       s                       ON c.sector_id  = s.sector_id
        LEFT JOIN tesda_batches cl                      ON e.batch_id   = cl.batch_id
        LEFT JOIN national_certification_types nct      ON c.certification_id = nct.certification_id
        WHERE e.student_id = $1

        UNION ALL

        SELECT
          e.public_id,
          'SHS'                    AS enrollment_type,
          e.status,
          e.submitted_at,
          NULL::NUMERIC(10,2)      AS fee_at_enrollment,
          NULL::VARCHAR(20)        AS class_type,
          NULL::VARCHAR(255)       AS course_name,
          NULL::VARCHAR(100)       AS nc_level, -- => SHS has no NC level, kept NULL to match the TESDA branch's column type
          NULL::VARCHAR(150)       AS sector,
          -- => track removed, shs_enrollments no longer has this column
          NULL::VARCHAR(20)        AS track,
          e.cluster,
          e.school_year_completed,
          e.grade_level_completed,
          e.last_school_attended
        FROM shs_enrollments e
        LEFT JOIN shs_batches cl        ON e.batch_id   = cl.batch_id
        WHERE e.student_id = $1
     ) combined
     ORDER BY submitted_at DESC`,
    [studentId]
  );
  return result.rows;
};

// GET ONE ENROLLMENT BY PUBLIC UUID
// => Same UNION ALL shape as getEnrollmentsByStudentId, extended with every
// => field both detail pages need. public_id is globally unique (UUID
// => default) across both tables, so at most one branch will ever match -
// => LIMIT 1 is just a safety net, not load-bearing logic
// => Ownership check (student_id) happens on BOTH branches to prevent IDOR
export const getEnrollmentByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT * FROM (
        SELECT
          e.public_id,
          'TESDA'                  AS enrollment_type,
          e.status,
          e.submitted_at,
          e.fee_at_enrollment,
          e.uli,
          cl.class_type,
          c.title                  AS course_name,
          nct.certification_type   AS nc_level, -- => used to build the parenthetical in the title
          s.sector                 AS sector,
          e.ncae_taken,
          e.ncae_where,
          e.ncae_when,
          e.is_tesda_scholar,
          e.scholarship_type,
          e.other_scholarship,
          cl.batch_name, -- => used to build "Batch Name (start - end)" on the Class/Batch card
          cl.start_date,
          cl.end_date,
          cl.groupchat_link,
          NULL::VARCHAR(20)        AS track,
          NULL::VARCHAR(60)        AS cluster,
          NULL::VARCHAR(20)        AS school_year_completed,
          NULL::VARCHAR(30)        AS grade_level_completed,
          NULL::TEXT               AS last_school_attended,
          NULL::VARCHAR(12)        AS lrn,
          NULL::VARCHAR(150)       AS emergency_name,
          NULL::VARCHAR(60)        AS emergency_relationship,
          NULL::VARCHAR(11)        AS emergency_contact_no,
          e.external_remarks,
          -- => full TESDA course detail, pulled straight from tesda_courses
          c.description             AS course_description,
          c.accreditation_no,
          c.date_accredited,
          c.expiration_date,
          c.amount                  AS course_amount,
          c.hours                   AS course_hours,
          job_opps.jobs              AS job_opportunities,
          NULL::VARCHAR(150)        AS cluster_name,
          NULL::JSON                AS cluster_courses
        FROM tesda_enrollments e
        LEFT JOIN tesda_courses c                    ON e.course_id  = c.course_id
        LEFT JOIN sectors       s                    ON c.sector_id  = s.sector_id
        LEFT JOIN tesda_batches cl                   ON e.batch_id   = cl.batch_id
        LEFT JOIN national_certification_types nct   ON c.certification_id = nct.certification_id
        -- => LATERAL subquery collapses all job title rows for this course
        -- => into one JSON array so the row count stays 1:1 with the enrollment
        LEFT JOIN LATERAL (
          SELECT json_agg(jo.job_title) AS jobs
          FROM tesda_job_opportunities jo
          WHERE jo.course_id = c.course_id
        ) job_opps ON true
        WHERE e.public_id = $1 AND e.student_id = $2

        UNION ALL

        SELECT
          e.public_id,
          'SHS'                     AS enrollment_type,
          e.status,
          e.submitted_at,
          NULL::NUMERIC(10,2)       AS fee_at_enrollment,
          NULL::VARCHAR(20)         AS uli,
          NULL::VARCHAR(20)         AS class_type,
          NULL::VARCHAR(255)        AS course_name,
          NULL::VARCHAR(100)        AS nc_level, -- => matches TESDA branch's column type for UNION ALL
          NULL::VARCHAR(150)        AS sector,
          NULL::BOOLEAN             AS ncae_taken,
          NULL::TEXT                AS ncae_where,
          NULL::VARCHAR(50)         AS ncae_when,
          NULL::BOOLEAN             AS is_tesda_scholar,
          NULL::VARCHAR(50)         AS scholarship_type,
          NULL::TEXT                AS other_scholarship,
          cl.batch_name, -- => shs_batches also has batch_name, keeps this column real on both branches
          cl.start_date,
          cl.end_date,
          cl.groupchat_link,
          -- => track removed, shs_enrollments no longer has this column
          NULL::VARCHAR(20)         AS track,
          e.cluster,
          e.school_year_completed,
          e.grade_level_completed,
          e.last_school_attended,
          e.lrn,
          e.emergency_name,
          e.emergency_relationship,
          e.emergency_contact_no,
          e.external_remarks,
          -- => TESDA-only columns, NULL on this branch to keep UNION ALL types aligned
          NULL::TEXT                AS course_description,
          NULL::VARCHAR(100)        AS accreditation_no,
          NULL::DATE                AS date_accredited,
          NULL::DATE                AS expiration_date,
          NULL::NUMERIC(10,2)       AS course_amount,
          NULL::INT                 AS course_hours,
          NULL::JSON                AS job_opportunities,
          -- => resolved cluster display name + BOTH Grade 11 and Grade 12
          -- => course rows for whichever cluster the student enrolled in
          scl.name                  AS cluster_name,
          cluster_courses.courses    AS cluster_courses
        FROM shs_enrollments e
        LEFT JOIN shs_batches cl        ON e.batch_id   = cl.batch_id
        -- => Resolved directly via the cluster_id FK on shs_enrollments -
        -- => the old join through e.cluster's text slug assumed shs_clusters
        -- => had a matching "value" column, which it never did
        LEFT JOIN shs_clusters scl       ON scl.cluster_id = e.cluster_id
        -- => LATERAL subquery pulls every active shs_courses row sharing that
        -- => cluster_id (i.e. the Grade 11 row AND the Grade 12 row) as one
        -- => JSON array, each with its own nested job opportunities
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'course_id',         sc.course_id,
              'title',             sc.title,
              'grade_level',       sc.grade_level,
              'description',       sc.description,
              'course_link',       sc.course_link,
              'status',            sc.status,
              'job_opportunities', (
                SELECT json_agg(jo.job_title)
                FROM shs_job_opportunities jo
                WHERE jo.course_id = sc.course_id
              )
            ) ORDER BY sc.grade_level
          ) AS courses
          FROM shs_courses sc
          -- => No status filter here on purpose. sc.status = 'active' only
          -- => controls whether a course is SELECTABLE on the public
          -- => enrollment form for NEW enrollees - it must not hide a
          -- => course from a student who is already mid-cluster.
          WHERE sc.cluster_id = scl.cluster_id
        ) cluster_courses ON true
        WHERE e.public_id = $1 AND e.student_id = $2
     ) combined
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] ?? null;
};
