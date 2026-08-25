// => public/models/Enrollments/tesdaEnrollmentModel.js
// => Split out of the old enrollmentModel.js - TESDA-only insert functions,
//    all called from processTesdaEnrollmentSubmission in tesdaEnrollmentService.js

// TESDA ENROLLMENT
// => Replaces the old `enrollment` table insert
// => ncae_taken stored as BOOLEAN; ncae_where/when only if ncae_taken is true
// => scholarship_type / other_scholarship only if is_tesda_scholar is true
export const insertTesdaEnrollment = async (client, { studentId, courseData, ncaeData, scholarshipData }) => {
  // => Mirrors insertShsEnrollment's Reserve handling: 'reserve' isn't a real
  // => class_id, it's the frontend's placeholder for "no open section yet."
  const hasRealClass = courseData.courseClass && courseData.courseClass !== 'reserve';

  // => Defaults to what the student picked - downgraded to Reserved below
  // => if the batch filled up between page load and this submit.
  // => reservedReason distinguishes WHY a Reserved status happened -
  // => 'explicit' means the student had nothing to choose from and picked
  // => Reserve themselves, 'downgraded' means their real batch pick filled
  // => up before this submit landed. Lets the frontend show accurate
  // => wording instead of one blended message for both cases.
  let batchId = hasRealClass ? parseInt(courseData.courseClass, 10) : null;
  let status = hasRealClass ? 'Pending' : 'Reserved';
  let reservedReason = hasRealClass ? null : 'explicit';

  if (hasRealClass) {
    // => Serializes concurrent submissions into the same batch - same
    // => pg_advisory_xact_lock pattern the admin side uses for approvals,
    // => so two near-simultaneous submissions can't both slip past a
    // => plain read-then-insert capacity check
    await client.query('SELECT pg_advisory_xact_lock($1)', [batchId]);

    // => Same two-tier check as tesdaBatchModel.js's list query - if no
    // => row comes back at all, the batch was deleted/dissolved between
    // => page load and submit, which is also treated as full
    const capacityCheck = await client.query(
      `SELECT
         cb.max_students,
         cb.max_applicants,
         COUNT(*) FILTER (WHERE te.status = 'Approved') AS approved_count,
         COUNT(*) FILTER (WHERE te.status NOT IN ('Rejected', 'Dropped')) AS applicant_count
       FROM tesda_batches cb
       LEFT JOIN tesda_enrollments te ON te.batch_id = cb.batch_id
       WHERE cb.batch_id = $1
       GROUP BY cb.batch_id, cb.max_students, cb.max_applicants`,
      [batchId]
    );

    const row = capacityCheck.rows[0];
    const isFull = !row
      || Number(row.approved_count) >= row.max_students
      || Number(row.applicant_count) >= row.max_applicants;

    // => Graceful fallback instead of rejecting the submission outright -
    // => documents are already uploaded to R2 by this point, so failing
    // => here would orphan them and force the student to redo the form
    if (isFull) {
      batchId = null;
      status = 'Reserved';
      reservedReason = 'downgraded';
    }
  }

  const result = await client.query(
    `INSERT INTO tesda_enrollments
       (student_id, course_id, batch_id, fee_at_enrollment,
        ncae_taken, ncae_where, ncae_when,
        is_tesda_scholar, scholarship_type, other_scholarship,
        status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      courseData.course       || null,
      batchId,
      courseData.courseFee    || null,
      ncaeData.takenBefore === 'yes',
      ncaeData.takenBefore === 'yes' ? (ncaeData.where || null) : null,
      ncaeData.takenBefore === 'yes' ? (ncaeData.when  || null) : null,
      scholarshipData.isScholar === 'yes',
      scholarshipData.isScholar === 'yes' ? (scholarshipData.scholarshipType  || null) : null,
      scholarshipData.isScholar === 'yes' ? (scholarshipData.otherScholarship || null) : null,
      status,
    ]
  );
  // => Returns status alongside enrollmentId - the service needs it to
  // => tell the student their current status in the password-setup email.
  // => reservedReason lets the frontend distinguish an explicit Reserve
  // => pick from a submit-time capacity downgrade.
  return { enrollmentId: result.rows[0].enrollment_id, status, reservedReason };
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
// => References tesda_enrollments, feeds into the tesda_documents table
export const insertEnrollmentDocuments = async (client, { enrollmentId, docs }) => {
  for (const doc of docs) {
    await client.query(
      // => is_original explicitly TRUE - these are the docs the student
      //    submitted at enrollment time, locked from admin deletion
      `INSERT INTO tesda_documents (enrollment_id, document_type, document_key, uploaded_at, is_original)
       VALUES ($1, $2, $3, NOW(), TRUE)`,
      [enrollmentId, doc.type, doc.key]
    );
  }
};


// GET COURSE SECTOR + FEE (for re-enrollment)
// => Authoritative source for fee_at_enrollment and the same-sector check -
// => never trust a client-supplied course fee or sector value
export const getCourseSectorAndFee = async (client, courseId) => {
  const result = await client.query(
    `SELECT sector_id, amount, deleted_at
     FROM tesda_courses
     WHERE course_id = $1`,
    [courseId]
  );
  return result.rows[0] || null;
};

// GET MOST RECENT TESDA ENROLLMENT (for re-enrollment carryover)
// => Used by processTesdaReEnrollmentSubmission to carry over NCAE and
// => Scholarship answers, since the re-enrollment modal doesn't ask
// => these questions again. Returns null if the student has never had a
// => TESDA enrollment before (first-ever TESDA enrollment via cross mode).
export const getMostRecentTesdaEnrollmentData = async (client, studentId) => {
  const result = await client.query(
    `SELECT enrollment_id, ncae_taken, ncae_where, ncae_when,
            is_tesda_scholar, scholarship_type, other_scholarship
     FROM tesda_enrollments
     WHERE student_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] || null;
};

// GET CLASSIFICATIONS FOR AN ENROLLMENT (for re-enrollment carryover)
export const getClientClassificationsByEnrollmentId = async (client, enrollmentId) => {
  const result = await client.query(
    `SELECT classification_value, others_text
     FROM tesda_client_classifications
     WHERE enrollment_id = $1`,
    [enrollmentId]
  );
  return result.rows;
};

// INSERT CLASSIFICATIONS CARRIED OVER FROM A PRIOR ENROLLMENT
// => Same target table as insertClientClassifications above, but takes
// => fully formed rows (each with its own others_text already resolved)
// => instead of a flat array + one shared othersText, since carried-over
// => rows already know their own others_text from the prior enrollment
export const insertCarriedOverClassifications = async (client, { enrollmentId, rows }) => {
  for (const row of rows) {
    await client.query(
      `INSERT INTO tesda_client_classifications (enrollment_id, classification_value, others_text)
       VALUES ($1, $2, $3)`,
      [enrollmentId, row.classification_value, row.others_text]
    );
  }
};
