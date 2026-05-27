// => All functions receive `txn` - the scoped query function from sql.transaction()
// => This ensures every insert runs inside the same atomic transaction

// ─────────────────────────────────────────
// STUDENT ACCOUNT
// ─────────────────────────────────────────
export const insertStudentAccount = async (client, { email }) => {
  // => password_hash is NULL until student confirms email (per schema decision)
  const result = await client.query(
    `INSERT INTO student_accounts (username, password_hash, is_email_confirmed, is_active, created_at)
     VALUES ($1, NULL, FALSE, TRUE, NOW())
     RETURNING student_id`,
    [email]
  );
  return result.rows[0].student_id;
};

// ─────────────────────────────────────────
// STUDENT PROFILE
// ─────────────────────────────────────────
export const insertStudentProfile = async (client, { studentId, body, courseData }) => {
  const result = await client.query(
    `INSERT INTO student_profile
       (student_id, surname, first_name, middle_name, name_extension,
        sex, birthdate, birthplace_region, birthplace_province,
        birthplace_city_or_municipality, nationality,
        highest_educational_attainment, civil_status, employment_status,
        mother_name, father_name, client_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING profile_id`,
    [
      studentId,
      body.lastName,
      body.firstName,
      body.middleName     || null,
      body.nameExt        || null,
      body.sex,
      body.dob,
      body.region,
      body.province       || null,
      body.municipality,
      body.nationality,
      // => If 'Others' was selected, use the typed value; otherwise use the dropdown value
      body.educAttainment === 'others' ? body.educOther : body.educAttainment,
      body.civilStatus,
      body.employmentStatus,
      body.motherName,
      body.fatherName,
      courseData.clientType || null,
    ]
  );
  return result.rows[0].profile_id;
};

// ─────────────────────────────────────────
// STUDENT ADDRESS
// ─────────────────────────────────────────
export const insertStudentAddress = async (client, { profileId, body }) => {
  await client.query(
    `INSERT INTO student_address
       (profile_id, street, barangay_code, city_code, province_code, region_code, zip_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      profileId,
      body.mailStreet,
      body.mailBarangay  || null,
      body.mailCity      || null,
      body.mailProvince  || null,
      body.mailRegion,
      body.mailZip       || null,
    ]
  );
};

// ─────────────────────────────────────────
// CONTACT NUMBERS
// => Inserts one row per contact type that has a value
// ─────────────────────────────────────────
export const insertContactNumbers = async (client, { profileId, body }) => {
  const contacts = [
    { type: 'Mobile', value: body.mobile },
    { type: 'Tel',    value: body.telephone    || null },
    { type: 'Fax',    value: body.fax          || null },
    { type: 'Others', value: body.otherContact || null },
  ].filter(c => c.value); // => only insert rows that have a value

  for (const contact of contacts) {
    await client.query(
      `INSERT INTO contact_numbers (profile_id, contact_type, contact_value)
       VALUES ($1, $2, $3)`,
      [profileId, contact.type, contact.value]
    );
  }
};

// ─────────────────────────────────────────
// CONTACT PERSON (GUARDIAN)
// => Only inserted if guardianName was provided
// ─────────────────────────────────────────
export const insertContactPerson = async (client, { profileId, body }) => {
  if (!body.guardianName) return; // => skip if not a minor or not provided

  await client.query(
    `INSERT INTO contact_person (profile_id, contact_person_name, contact_number)
     VALUES ($1, $2, $3)`,
    [profileId, body.guardianName, null]
    // => guardian contact number not collected in the form yet
  );
};

// ─────────────────────────────────────────
// LICENSURE EXAMINATIONS
// => FK to profile_id - permanent student credential, not per-enrollment
// ─────────────────────────────────────────
export const insertLicensures = async (client, { profileId, licensures }) => {
  if (!Array.isArray(licensures)) return;

  for (const lic of licensures) {
    if (!lic.title) continue; // => skip blank rows

    await client.query(
      `INSERT INTO licensure_examination
         (profile_id, title, year_taken, examination_venue, rating, remarks, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        profileId,
        lic.title,
        lic.yearTaken  || null,
        lic.venue      || null,
        lic.rating     || null,
        lic.remarks    || null,
        lic.expiryDate || null,
      ]
    );
  }
};

// ─────────────────────────────────────────
// COMPETENCY ASSESSMENTS
// => FK to profile_id - permanent student credential, not per-enrollment
// ─────────────────────────────────────────
export const insertCompetencies = async (client, { profileId, competencies }) => {
  if (!Array.isArray(competencies)) return;

  for (const comp of competencies) {
    if (!comp.title) continue; // => skip blank rows

    await client.query(
      `INSERT INTO competency_assessment
         (profile_id, title, qualification_level, industry_sector,
          certificate_number, date_of_issuance, expiration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        profileId,
        comp.title,
        comp.qualificationLevel || null,
        comp.industrySector     || null,
        comp.certNumber         || null,
        comp.dateIssued         || null,
        comp.expirationDate     || null,
      ]
    );
  }
};

// ─────────────────────────────────────────
// ENROLLMENT
// ─────────────────────────────────────────
export const insertEnrollment = async (client, { studentId, courseData }) => {
  const result = await client.query(
    `INSERT INTO enrollment
       (student_id, course_id, class_id, assessment_type, fee_at_enrollment,
        is_shs, is_tesda_scholar, status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending', NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      courseData.course         || null,
      courseData.courseClass    || null,
      courseData.assessmentType || null,
      courseData.courseFee      || null,
      courseData.isSHS === 'yes',
      courseData.isScholar === 'yes',
    ]
  );
  return result.rows[0].enrollment_id;
};

// ─────────────────────────────────────────
// WORK EXPERIENCE
// => FK to enrollment_id - tied to this specific enrollment
// ─────────────────────────────────────────
export const insertWorkExperience = async (client, { enrollmentId, workExperience }) => {
  if (!Array.isArray(workExperience)) return;

  for (const exp of workExperience) {
    if (!exp.company) continue; // => skip blank rows

    await client.query(
      `INSERT INTO work_experience
         (enrollment_id, company, position, salary,
          date_from, date_to, appointment_status, years_exp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        enrollmentId,
        exp.company,
        exp.position          || null,
        exp.salary            || null,
        exp.dateFrom          || null,
        exp.dateTo            || null,
        exp.appointmentStatus || null,
        exp.yearsExp          || null,
      ]
    );
  }
};

// ─────────────────────────────────────────
// TRAINING / SEMINARS
// => FK to enrollment_id - tied to this specific enrollment
// ─────────────────────────────────────────
export const insertTrainingSeminars = async (client, { enrollmentId, trainings }) => {
  if (!Array.isArray(trainings)) return;

  for (const tr of trainings) {
    if (!tr.title) continue; // => skip blank rows

    await client.query(
      `INSERT INTO training_seminar
         (enrollment_id, title, venue, date_from, date_to, hours, conducted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        enrollmentId,
        tr.title,
        tr.venue       || null,
        tr.dateFrom    || null,
        tr.dateTo      || null,
        tr.hours       || null,
        tr.conductedBy || null,
      ]
    );
  }
};

// ─────────────────────────────────────────
// ENROLLMENT DOCUMENTS
// => Per-enrollment copies of uploaded files
// => Stores R2 object key - never a public URL
// ─────────────────────────────────────────
export const insertEnrollmentDocuments = async (client, { enrollmentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO enrollment_documents (enrollment_id, document_type, document_key, uploaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [enrollmentId, doc.type, doc.key]
    );
  }
};

// ─────────────────────────────────────────
// STUDENT DOCS
// => Permanent copies tied to the student account, not just this enrollment
// => Stores R2 object key - never a public URL
// ─────────────────────────────────────────
export const insertStudentDocs = async (client, { studentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      `INSERT INTO student_docs (student_id, document_type, document_key, uploaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [studentId, doc.type, doc.key]
    );
  }
};