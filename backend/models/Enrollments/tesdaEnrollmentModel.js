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
  const status = hasRealClass ? 'Pending' : 'Reserved';

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
      hasRealClass ? courseData.courseClass : null,
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
  // => tell the student their current status in the password-setup email
  return { enrollmentId: result.rows[0].enrollment_id, status };
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
