// => public/models/Enrollments/shsEnrollmentModel.js
// => Split out of the old enrollmentModel.js - SHS-only insert functions,
//    all called from processShsEnrollmentSubmission in shsEnrollmentService.js

// SHS ENROLLMENT

// => Looks up a cluster's display name by id - used to populate the
// => legacy shs_enrollments.cluster text column alongside cluster_id below.
// => Runs on the same transaction client as the rest of the submission,
// => not the separate sql tag models/SHSEnrollment/shsClusterModel.js uses,
// => since this needs to participate in the same BEGIN/COMMIT.
export const findClusterNameById = async (client, clusterId) => {
  const result = await client.query(
    `SELECT name FROM shs_clusters WHERE cluster_id = $1 AND deleted_at IS NULL`,
    [clusterId]
  );
  return result.rows[0]?.name || null;
};

// => Core SHS enrollment transaction record - academic history, track/
// => cluster, emergency contact, and health info all live here (Step 2 + 3
// => fields that AREN'T identity/address/family, which live in the shared
// => student_profile/student_address tables or shs_family_members instead)
export const insertShsEnrollment = async (client, { studentId, body, academicData, familyData, clusterName }) => {
  const hasRealClass = !!academicData.class;

  // => Defaults to what the student picked - downgraded to Reserved below
  // => if the batch filled up between page load and this submit.
  // => reservedReason distinguishes WHY a Reserved status happened -
  // => 'explicit' means the student had nothing to choose from and picked
  // => Reserve themselves, 'downgraded' means their real batch pick filled
  // => up before this submit landed. Lets the frontend show accurate
  // => wording instead of one blended message for both cases.
  let batchId = hasRealClass ? parseInt(academicData.class, 10) : null;
  let status = hasRealClass ? 'Pending' : 'Reserved';
  let reservedReason = hasRealClass ? null : 'explicit';

  if (hasRealClass) {
    // => Same locked recheck as insertTesdaEnrollment - serializes
    // => concurrent submissions into the same batch
    await client.query('SELECT pg_advisory_xact_lock($1)', [batchId]);

    // => Same two-tier check as shsBatchModel.js's list query - if no
    // => row comes back at all, the batch was deleted/dissolved between
    // => page load and submit, which is also treated as full
    const capacityCheck = await client.query(
      `SELECT
         sb.max_students,
         sb.max_applicants,
         COUNT(*) FILTER (WHERE se.status = 'Approved') AS approved_count,
         COUNT(*) FILTER (WHERE se.status NOT IN ('Rejected', 'Dropped')) AS applicant_count
       FROM shs_batches sb
       LEFT JOIN shs_enrollments se ON se.batch_id = sb.batch_id
       WHERE sb.batch_id = $1
       GROUP BY sb.batch_id, sb.max_students, sb.max_applicants`,
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

  // => course_id dropped from this INSERT: a cluster is a fixed 2-year
  // => curriculum (G11 + G12 courses looked up via shs_courses.cluster_id),
  // => not a single course the student chooses. Column stays in the table
  // => (nullable) for historical rows, just no longer written here.
  const result = await client.query(
    `INSERT INTO shs_enrollments
       (student_id, lrn, batch_id,
        last_school_attended, school_address, grade_level_completed, school_year_completed,
        cluster, cluster_id, electives,
        emergency_name, emergency_relationship, emergency_contact_no, emergency_address,
        has_medical_condition, medical_condition_detail, allergies, maintenance_medication,
        status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      body.lrn,
      batchId,
      academicData.lastSchoolAttended,
      academicData.schoolAddress || null,
      academicData.gradeLevelCompleted,
      academicData.schoolYearCompleted,
      // => Legacy text column - populated from the cluster's name (resolved
      // => in shsEnrollmentService.js via cluster_id), not written directly
      // => from academicData anymore
      clusterName,
      // => cluster_id: the actual FK. This is what academicData.cluster now
      // => holds since SHSStep2.jsx switched to fetching clusters by id -
      // => previously this column was never written, which is why every
      // => submission was failing against its NOT NULL constraint
      academicData.cluster,
      academicData.electives || null,
      familyData.emergencyName,
      familyData.emergencyRelationship,
      familyData.emergencyContactNo,
      familyData.emergencyAddress,
      familyData.hasMedicalCondition,
      familyData.hasMedicalCondition === 'yes' ? (familyData.medicalConditionDetail || null) : null,
      familyData.allergies || null,
      familyData.maintenanceMedication || null,
      status,
    ]
  );
  // => Returns status alongside enrollmentId - the service needs it to
  // => tell the student their current status in the password-setup email.
  // => reservedReason lets the frontend distinguish an explicit Reserve
  // => pick from a submit-time capacity downgrade.
  return { enrollmentId: result.rows[0].enrollment_id, status, reservedReason };
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
      // => is_original explicitly TRUE - same reasoning as insertEnrollmentDocuments
      `INSERT INTO shs_documents (enrollment_id, document_type, document_key, uploaded_at, is_original)
       VALUES ($1, $2, $3, NOW(), TRUE)`,
      [enrollmentId, doc.type, doc.key]
    );
  }
};
