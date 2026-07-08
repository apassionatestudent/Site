// => All insert functions receive `client` - a pg pool client inside a transaction
// => Each function handles exactly one table


// STUDENT ACCOUNT
// => username is nullable - only set if student provided an email
// => password_hash stays NULL until student sets up their account post-enrollment


// => Month name to index map - mirrors TESDAStep2's MONTHS array
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
        highest_educ_attainment,
        lrn, religion, religion_others)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING profile_id`,
    [
      studentId,
      body.lastName,
      body.firstName,
      body.middleName        || null,
      // => TESDA sends nameExtension, SHS sends suffix - same concept, different key
      body.nameExtension     || body.suffix || null,
      body.contactNo,
      body.facebookLink      || null,
      body.email             || null,
      // => TESDA sends nationality, SHS sends citizenship - same concept, different key
      body.nationality       || body.citizenship || null,
      body.sex,
      body.civilStatus       || null, // => TESDA-only - NULL on SHS submissions
      body.employmentStatus  || null, // => TESDA-only - NULL on SHS submissions
      `${body.birthYear}-${String(MONTHS.indexOf(body.birthMonth) + 1).padStart(2,'0')}-${String(body.birthDay).padStart(2,'0')}`,
      body.birthplaceRegion,
      body.birthplaceProvince || null,
      body.birthplaceCity,
      body.educAttainment     || null, // => TESDA-only - NULL on SHS submissions
      body.lrn                || null, // => SHS-only - NULL on TESDA submissions
      body.religion           || null, // => SHS-only - NULL on TESDA submissions
      body.religionOthers     || null, // => SHS-only - NULL on TESDA submissions
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

// SHS ENROLLMENT
// => Core SHS enrollment transaction record - academic history, track/
// => cluster, emergency contact, and health info all live here (Step 2 + 3
// => fields that AREN'T identity/address/family, which live in the shared
// => student_profile/student_address tables or shs_family_members instead)
export const insertShsEnrollment = async (client, { studentId, academicData, familyData, privacyAgreed }) => {
  // => No class picked because none were available for this branch+track+
  // => cluster combo (frontend shows "Reserve" instead of a dropdown in
  // => that case) - class_id stays NULL, status becomes 'Reserved' until
  // => an admin creates and assigns a real shs_classes row
  const status = academicData.class ? 'Pending' : 'Reserved';

  const result = await client.query(
    `INSERT INTO shs_enrollments
       (student_id, branch_id, class_id,
        last_school_attended, school_address, grade_level_completed, school_year_completed,
        track, cluster, electives,
        emergency_name, emergency_relationship, emergency_contact_no, emergency_address,
        has_medical_condition, medical_condition_detail, allergies, maintenance_medication,
        privacy_agreed,
        status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      academicData.branch || null,
      academicData.class  || null,
      academicData.lastSchoolAttended,
      academicData.schoolAddress || null,
      academicData.gradeLevelCompleted,
      academicData.schoolYearCompleted,
      academicData.track,
      academicData.cluster || null,
      academicData.electives || null,
      familyData.emergencyName,
      familyData.emergencyRelationship,
      familyData.emergencyContactNo,
      familyData.emergencyAddress,
      familyData.hasMedicalCondition,
      familyData.hasMedicalCondition === 'yes' ? (familyData.medicalConditionDetail || null) : null,
      familyData.allergies || null,
      familyData.maintenanceMedication || null,
      privacyAgreed,
      status,
    ]
  );
  return result.rows[0].enrollment_id;
};


// SHS FAMILY MEMBERS
// => One row per Father/Mother/Guardian actually provided - shsFamily's flat
// => fatherName/motherName/guardianName shape gets split into role-tagged rows here
// => The DEFERRED constraint trigger on shs_family_members (checked at COMMIT,
// => not per-row) validates the both-parents-or-guardian rule after this loop finishes

export const insertShsFamilyMembers = async (client, { studentId, familyData }) => {
  const members = [
    familyData.fatherName && {
      role: 'Father',
      fullName: familyData.fatherName,
      occupation: familyData.fatherOccupation || null,
      contactNo: familyData.fatherContactNo || null,
      relationshipToStudent: null, // => only Guardian rows carry this
    },
    familyData.motherName && {
      role: 'Mother',
      fullName: familyData.motherName,
      occupation: familyData.motherOccupation || null,
      contactNo: familyData.motherContactNo || null,
      relationshipToStudent: null,
    },
    familyData.guardianName && {
      role: 'Guardian',
      fullName: familyData.guardianName,
      occupation: familyData.guardianOccupation || null,
      contactNo: familyData.guardianContactNo || null,
      relationshipToStudent: familyData.guardianRelationship || null,
    },
  ].filter(Boolean); // => drops any role that wasn't provided

  for (const m of members) {
    await client.query(
      `INSERT INTO shs_family_members
         (student_id, role, full_name, occupation, contact_no, relationship_to_student)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [studentId, m.role, m.fullName, m.occupation, m.contactNo, m.relationshipToStudent]
    );
  }
};


// SHS DOCUMENTS
// => Same shape/pattern as insertEnrollmentDocuments, wired to shs_enrollments
// => and the separate shs_documents table instead of tesda_documents

export const insertShsDocuments = async (client, { enrollmentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO shs_documents (enrollment_id, document_type, document_key, uploaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [enrollmentId, doc.type, doc.key]
    );
  }
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
      `INSERT INTO tesda_documents (enrollment_id, document_type, document_key, uploaded_at)
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
          COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
          e.fee_at_enrollment,
          cl.class_type,
          c.title                 AS course_name,
          s.sector                AS sector,
          NULL::VARCHAR(20)       AS track,
          NULL::VARCHAR(60)       AS cluster,
          NULL::VARCHAR(20)       AS school_year_completed,
          NULL::VARCHAR(30)       AS grade_level_completed,
          NULL::TEXT              AS last_school_attended
        FROM tesda_enrollments e
        LEFT JOIN courses       c        ON e.course_id  = c.course_id
        LEFT JOIN sectors       s        ON c.sector_id  = s.sector_id
        LEFT JOIN tesda_classes cl       ON e.class_id   = cl.class_id
        LEFT JOIN branches      b_direct ON e.branch_id  = b_direct.branch_id
        LEFT JOIN branches      b_class  ON cl.branch_id = b_class.branch_id
        WHERE e.student_id = $1

        UNION ALL

        SELECT
          e.public_id,
          'SHS'                    AS enrollment_type,
          e.status,
          e.submitted_at,
          COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
          NULL::NUMERIC(10,2)      AS fee_at_enrollment,
          NULL::VARCHAR(20)        AS class_type,
          NULL::VARCHAR(255)       AS course_name,
          NULL::VARCHAR(150)       AS sector,
          e.track,
          e.cluster,
          e.school_year_completed,
          e.grade_level_completed,
          e.last_school_attended
        FROM shs_enrollments e
        LEFT JOIN shs_classes cl        ON e.class_id   = cl.class_id
        LEFT JOIN branches    b_direct  ON e.branch_id  = b_direct.branch_id
        LEFT JOIN branches    b_class   ON cl.branch_id = b_class.branch_id
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
          COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
          e.fee_at_enrollment,
          e.uli,
          cl.class_type,
          c.title                  AS course_name,
          s.sector                 AS sector,
          e.ncae_taken,
          e.ncae_where,
          e.ncae_when,
          e.is_tesda_scholar,
          e.scholarship_type,
          e.other_scholarship,
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
          NULL::VARCHAR(11)        AS emergency_contact_no
        FROM tesda_enrollments e
        LEFT JOIN courses       c        ON e.course_id  = c.course_id
        LEFT JOIN sectors       s        ON c.sector_id  = s.sector_id
        LEFT JOIN tesda_classes cl       ON e.class_id   = cl.class_id
        LEFT JOIN branches      b_direct ON e.branch_id  = b_direct.branch_id
        LEFT JOIN branches      b_class  ON cl.branch_id = b_class.branch_id
        WHERE e.public_id = $1 AND e.student_id = $2

        UNION ALL

        SELECT
          e.public_id,
          'SHS'                     AS enrollment_type,
          e.status,
          e.submitted_at,
          COALESCE(b_direct.branch_name, b_class.branch_name) AS branch_name,
          NULL::NUMERIC(10,2)       AS fee_at_enrollment,
          NULL::VARCHAR(20)         AS uli,
          NULL::VARCHAR(20)         AS class_type,
          NULL::VARCHAR(255)        AS course_name,
          NULL::VARCHAR(150)        AS sector,
          NULL::BOOLEAN             AS ncae_taken,
          NULL::TEXT                AS ncae_where,
          NULL::VARCHAR(50)         AS ncae_when,
          NULL::BOOLEAN             AS is_tesda_scholar,
          NULL::VARCHAR(50)         AS scholarship_type,
          NULL::TEXT                AS other_scholarship,
          cl.start_date,
          cl.end_date,
          cl.groupchat_link,
          e.track,
          e.cluster,
          e.school_year_completed,
          e.grade_level_completed,
          e.last_school_attended,
          e.lrn,
          e.emergency_name,
          e.emergency_relationship,
          e.emergency_contact_no
        FROM shs_enrollments e
        LEFT JOIN shs_classes cl        ON e.class_id   = cl.class_id
        LEFT JOIN branches    b_direct  ON e.branch_id  = b_direct.branch_id
        LEFT JOIN branches    b_class   ON cl.branch_id = b_class.branch_id
        WHERE e.public_id = $1 AND e.student_id = $2
     ) combined
     LIMIT 1`,
    [publicId, studentId]
  );
  return result.rows[0] ?? null;
};