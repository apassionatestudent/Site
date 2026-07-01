// => All insert functions receive `client` - a pg pool client inside a transaction
// => Each function handles exactly one table


// STUDENT ACCOUNT
// => username is nullable - only set if student provided an email
// => password_hash stays NULL until student sets up their account post-enrollment


// => Month name to index map — mirrors TESDAStep2's MONTHS array
// => TESDAStep2 sends birthMonth as a name (e.g. 'August'), not a number
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

export const insertStudentAccount = async (client, { email }) => {
  const result = await client.query(
    `INSERT INTO student_accounts (username, password_hash, is_email_confirmed, is_active, created_at)
     VALUES ($1, NULL, FALSE, TRUE, NOW())
     RETURNING student_id`,
    [email || null]
  );
  return result.rows[0].student_id;
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
        highest_educ_attainment)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING profile_id`,
    [
      studentId,
      body.lastName,
      body.firstName,
      body.middleName       || null,
      body.nameExtension    || null,
      body.contactNo,
      body.facebookLink     || null,
      body.email            || null,
      body.nationality,
      body.sex,
      body.civilStatus,
      body.employmentStatus,
      // => TESDAStep2 sends birthMonth as a month name (e.g. 'August'), not a number
      // => MONTHS.indexOf() gives 0-based index, +1 converts to 1-based before padding
      `${body.birthYear}-${String(MONTHS.indexOf(body.birthMonth) + 1).padStart(2,'0')}-${String(body.birthDay).padStart(2,'0')}`,
      // => Keys now match tesdaPersonal state: birthplaceRegion/Province/City
      body.birthplaceRegion,
      body.birthplaceProvince || null,
      body.birthplaceCity,
      body.educAttainment,
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

export const insertStudentGuardian = async (client, { studentId, body }) => {
  if (!body.guardianName) return; // => skip if not a minor or not provided

  await client.query(
    `INSERT INTO student_guardian (student_id, guardian_name, guardian_address)
     VALUES ($1, $2, $3)`,
    [
      studentId,
      body.guardianName,
      body.guardianAddress || null,
    ]
  );
};


// TESDA ENROLLMENT
// => Replaces the old `enrollment` table insert
// => ncae_taken stored as BOOLEAN; ncae_where/when only if ncae_taken is true
// => scholarship_type / other_scholarship only if is_tesda_scholar is true

export const insertTesdaEnrollment = async (client, { studentId, courseData, ncaeData, scholarshipData }) => {
  const result = await client.query(
    `INSERT INTO tesda_enrollments
       (student_id, branch_id, course_id, class_id, fee_at_enrollment,
        ncae_taken, ncae_where, ncae_when,
        is_tesda_scholar, scholarship_type, other_scholarship,
        status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pending', NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      // => tesdaCourse keys: branch / course / courseClass (not branchId/courseId/classId)
      courseData.branch       || null,
      courseData.course       || null,
      courseData.courseClass  || null,
      courseData.courseFee    || null,
      ncaeData.takenBefore === 'yes',
      ncaeData.takenBefore === 'yes' ? (ncaeData.where || null) : null,
      ncaeData.takenBefore === 'yes' ? (ncaeData.when  || null) : null,
      scholarshipData.isScholar === 'yes',
      scholarshipData.isScholar === 'yes' ? (scholarshipData.scholarshipType  || null) : null,
      scholarshipData.isScholar === 'yes' ? (scholarshipData.otherScholarship || null) : null,
    ]
  );
  return result.rows[0].enrollment_id;
};


// TESDA CLIENT CLASSIFICATIONS
// => One row per selected classification (Step 3 checkboxes)
// => others_text only written when classification_value = 'others'

export const insertClientClassifications = async (client, { enrollmentId, classifications, othersText }) => {
  if (!Array.isArray(classifications) || classifications.length === 0) return;

  for (const value of classifications) {
    await client.query(
      `INSERT INTO tesda_client_classifications (enrollment_id, classification_value, others_text)
       VALUES ($1, $2, $3)`,
      [
        enrollmentId,
        value,
        value === 'others' ? (othersText || null) : null,
      ]
    );
  }
};


// ENROLLMENT DOCUMENTS
// => Per-enrollment copies of uploaded files
// => Stores R2 object key - never a public URL
// => Now references tesda_enrollments instead of the old enrollment table

export const insertEnrollmentDocuments = async (client, { enrollmentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO enrollment_documents (enrollment_id, document_type, document_key, uploaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [enrollmentId, doc.type, doc.key]
    );
  }
};


// STUDENT DOCS
// => Permanent copies tied to the student account, not just this enrollment
// => Stores R2 object key - never a public URL

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
// => Joins tesda_enrollments with courses, sectors, branches, and classes
// => branch resolved via COALESCE: direct branch_id first, class's branch as fallback
// => groupchat_link pulled from classes (not enrollment) per architectural decision

export const getEnrollmentsByStudentId = async (pool, studentId) => {
  const result = await pool.query(
    `SELECT
        e.public_id,
        c.title               AS course_name,
        s.sector              AS sector,
        e.status,
        e.submitted_at,
        e.fee_at_enrollment,
        e.is_tesda_scholar,
        e.scholarship_type,
        e.ncae_taken,
        COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
        cl.start_date,
        cl.end_date,
        cl.groupchat_link
      FROM tesda_enrollments e
      LEFT JOIN courses     c         ON e.course_id  = c.course_id
      LEFT JOIN sectors     s         ON c.sector_id  = s.sector_id
      LEFT JOIN classes     cl        ON e.class_id   = cl.class_id
      LEFT JOIN branches    b_direct  ON e.branch_id  = b_direct.branch_id
      LEFT JOIN branches    b_class   ON cl.branch_id = b_class.branch_id
      WHERE e.student_id = $1
      ORDER BY e.submitted_at DESC`,
    [studentId]
  );
  return result.rows;
};


// GET ONE ENROLLMENT BY PUBLIC UUID
// => Ownership check against student_id prevents IDOR
// => Returns null if not found or belongs to a different student

export const getEnrollmentByPublicId = async (pool, publicId, studentId) => {
  const result = await pool.query(
    `SELECT
        e.public_id,
        c.title               AS course_name,
        s.sector              AS sector,
        e.status,
        e.submitted_at,
        e.fee_at_enrollment,
        e.is_tesda_scholar,
        e.scholarship_type,
        e.other_scholarship,
        e.ncae_taken,
        e.ncae_where,
        e.ncae_when,
        COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
        cl.start_date,
        cl.end_date,
        cl.groupchat_link
      FROM tesda_enrollments e
      LEFT JOIN courses     c         ON e.course_id  = c.course_id
      LEFT JOIN sectors     s         ON c.sector_id  = s.sector_id
      LEFT JOIN classes     cl        ON e.class_id   = cl.class_id
      LEFT JOIN branches    b_direct  ON e.branch_id  = b_direct.branch_id
      LEFT JOIN branches    b_class   ON cl.branch_id = b_class.branch_id
      WHERE e.public_id  = $1
        AND e.student_id = $2`,
    [publicId, studentId]
  );
  return result.rows[0] ?? null;
};