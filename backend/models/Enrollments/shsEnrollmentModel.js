// => public/models/Enrollments/shsEnrollmentModel.js
// => Split out of the old enrollmentModel.js - SHS-only insert functions,
//    all called from processShsEnrollmentSubmission in shsEnrollmentService.js

// SHS ENROLLMENT
// => Core SHS enrollment transaction record - academic history, track/
// => cluster, emergency contact, and health info all live here (Step 2 + 3
// => fields that AREN'T identity/address/family, which live in the shared
// => student_profile/student_address tables or shs_family_members instead)
export const insertShsEnrollment = async (client, { studentId, body, academicData, familyData }) => {
  const status = academicData.class ? 'Pending' : 'Reserved';

  // => course_id dropped from this INSERT: a cluster is a fixed 2-year
  // => curriculum (G11 + G12 courses looked up via shs_courses.cluster_id),
  // => not a single course the student chooses. Column stays in the table
  // => (nullable) for historical rows, just no longer written here.
  const result = await client.query(
    `INSERT INTO shs_enrollments
       (student_id, lrn, batch_id,
        last_school_attended, school_address, grade_level_completed, school_year_completed,
        cluster, electives,
        emergency_name, emergency_relationship, emergency_contact_no, emergency_address,
        has_medical_condition, medical_condition_detail, allergies, maintenance_medication,
        status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
     RETURNING enrollment_id`,
    [
      studentId,
      body.lrn,
      academicData.class  || null,
      academicData.lastSchoolAttended,
      academicData.schoolAddress || null,
      academicData.gradeLevelCompleted,
      academicData.schoolYearCompleted,
      // => track removed, shs_enrollments no longer has this column since only one track is offered
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
      // => is_original explicitly TRUE - same reasoning as insertEnrollmentDocuments
      `INSERT INTO shs_documents (enrollment_id, document_type, document_key, uploaded_at, is_original)
       VALUES ($1, $2, $3, NOW(), TRUE)`,
      [enrollmentId, doc.type, doc.key]
    );
  }
};
