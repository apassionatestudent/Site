// => public/services/Enrollments/shsEnrollmentService.js
// => Split out of the old enrollmentService.js - SHS-only submission flow

import { pool } from '../../config/db.js';
import { uploadToR2 } from '../../middleware/upload.js';

import {
  insertStudentAccount,
  insertStudentProfile,
  insertStudentAddress,
  getDuplicateStudentAccount,
} from '../../models/Enrollments/sharedEnrollmentModel.js';

import {
  insertShsEnrollment,
  insertShsFamilyMembers,
  insertShsDocuments,
  findClusterNameById,
  getMostRecentShsEnrollmentData,
} from '../../models/Enrollments/shsEnrollmentModel.js';

import { issuePasswordToken } from '../passwordTokenService.js';
import { logActivity } from '../Logs/logsService.js';
import { ACTIVITY_ACTIONS } from '../../constants/activityActions.js';

import { getStudentNameById } from '../../models/Enrollments/sharedEnrollmentModel.js';
import { getEnrollmentEligibility } from './enrollmentEligibilityService.js';

export const processShsEnrollmentSubmission = async (body, files) => {
  // => Parse the JSON blobs sent via FormData - same pattern as processTesdaEnrollmentSubmission
  const academicData  = JSON.parse(body.academicData); // => Step 2: school info, track/cluster
  const familyData     = JSON.parse(body.familyData);   // => Step 3: father/mother/guardian, emergency, health
  const privacyAgreed  = body.privacyAgreed === 'true';  // => FormData sends booleans as strings

 // => Consent must be checked server-side too - the frontend disables the
  // => Submit button until agreed, but that's a UI convenience, not a
  // => security boundary. A direct API call could otherwise skip it.
  if (!privacyAgreed) {
    throw Object.assign(new Error('Data privacy consent is required.'), { statusCode: 400 });
  }

  // => Email is required server-side too - same reasoning as TESDA's
  // => guard in processTesdaEnrollmentSubmission
  if (!body.email || !body.email.trim()) {
    throw Object.assign(new Error('Email address is required.'), { statusCode: 400 });
  }

  // => Duplicate enrollment guard - same reasoning as TESDA's guard in
  // => processTesdaEnrollmentSubmission. This path always creates a brand
  // => new student_accounts row, so a matching email or facebook_link
  // => would otherwise slip through (email raw-crashes the DB, facebook
  // => link has no constraint backing it at all).
  const duplicateAccount = await getDuplicateStudentAccount(pool, {
    email: body.email.trim(),
    facebookLink: (body.facebookLink || '').trim(),
  });
  if (duplicateAccount) {
    const fieldLabel = duplicateAccount.matched_field === 'email' ? 'email address' : 'Facebook link';
    throw Object.assign(
      new Error(`An account with this ${fieldLabel} already exists. Please log in and use the Re-enroll option instead.`),
      { statusCode: 400 }
    );
  }

  // => Guards mirroring the DB CHECK constraints on shs_enrollments -
  // => catches an incomplete/bad submission here with a clear message,
  // => instead of letting a raw Postgres constraint-violation reach the client
  if (!['none', 'yes'].includes(familyData.hasMedicalCondition)) {
    throw Object.assign(new Error('Medical condition status is required.'), { statusCode: 400 });
  }

  // => academicData.cluster is now a cluster_id (SHSStep2.jsx fetches
  // => clusters by id), required for the cluster_id FK on shs_enrollments
  if (!academicData.cluster) {
    throw Object.assign(new Error('Cluster selection is required.'), { statusCode: 400 });
  }

  // => Upload files to R2 BEFORE the DB transaction - same reasoning as
  // => processTesdaEnrollmentSubmission: R2 calls can't be rolled back, so
  // => an orphaned R2 file on a failed DB transaction is an acceptable tradeoff
  const uploadFile = async (fileArray, fieldName) => {
    if (!fileArray?.[0]) return null;

    const file = fileArray[0];
    // => SHS uploads are JPG/PNG only (no PDF, unlike TESDA's uploadFile)
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `primeenroll/shs-docs/${fieldName}_${Date.now()}.${ext}`;

    return await uploadToR2(file.buffer, key, file.mimetype);
  };

  // => grade10ReportCard can now carry up to 2 files (front/back) - this
  // => uploads each one to R2 and returns an array of keys instead of a
  // => single key. The index suffix on the R2 key keeps both files from
  // => colliding if they land in the same millisecond.
  const uploadFiles = async (fileArray, fieldName) => {
    if (!fileArray?.length) return [];

    return Promise.all(fileArray.map(async (file, index) => {
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const key = `primeenroll/shs-docs/${fieldName}_${Date.now()}_${index}.${ext}`;
      return await uploadToR2(file.buffer, key, file.mimetype);
    }));
  };

  const psaBirthCertificateKey  = await uploadFile(files?.psaBirthCertificate,  'psaBirthCertificate');
  const grade10ReportCardKeys   = await uploadFiles(files?.grade10ReportCard,   'grade10ReportCard');
  const goodMoralCertificateKey = await uploadFile(files?.goodMoralCertificate, 'goodMoralCertificate');
  const escCertificateKey       = await uploadFile(files?.escCertificate,       'escCertificate');

  // => Build docs array once - reused for shs_documents insert
  // => grade10ReportCard contributes one row per uploaded file (1 or 2),
  // => all sharing the same document_type label
  const docs = [
    { type: 'PSA Birth Certificate',  key: psaBirthCertificateKey  },
    ...grade10ReportCardKeys.map((key) => ({ type: 'Grade 10 Report Card', key })),
    { type: 'Good Moral Certificate', key: goodMoralCertificateKey },
    { type: 'ESC Certificate',        key: escCertificateKey       },
  ].filter(d => d.key);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // => Resolve cluster_id -> name early, inside the transaction, so an
    // => invalid/stale cluster_id fails fast with a clear 400 instead of
    // => hitting the NOT NULL constraint on shs_enrollments.cluster later
    const clusterName = await findClusterNameById(client, academicData.cluster);
    if (!clusterName) {
      throw Object.assign(new Error('Selected cluster was not found.'), { statusCode: 400 });
    }

    // => 1. Create account - same shared function TESDA uses, since
    // => student_accounts isn't program-specific
    const studentId = await insertStudentAccount(client, { email: body.email });

    // => 2. Profile - SHARED student_profile table per your direction.
    // => Same insertStudentProfile function TESDA uses - body already has
    // => SHS's own key names (citizenship, suffix, lrn, religion, etc.);
    // => the model function resolves both TESDA's and SHS's key names internally.
    await insertStudentProfile(client, { studentId, body });

    // => 3. Address - SHARED student_address table, same function as TESDA,
    // => no changes needed since key names already matched
    await insertStudentAddress(client, { studentId, body });

    // => 4. Core SHS enrollment record (academic + track/cluster + emergency + health)
    // => status returned alongside enrollmentId - needed below so the
    // => password-setup email reflects the real assigned status
    // => reservedReason distinguishes an explicit Reserve pick from a
    // => submit-time capacity downgrade, for the InformationModal variant
    const { enrollmentId, status, reservedReason } = await insertShsEnrollment(client, { studentId, body, academicData, familyData, clusterName });

    // => 5. Family members - one row each for whichever of Father/Mother/
    // => Guardian were provided. The DEFERRED constraint trigger on
    // => shs_family_members checks the both-parents-or-guardian rule at
    // => COMMIT time, after every row in this step has landed.
    await insertShsFamilyMembers(client, { studentId, familyData });

    // => 6. Documents - inserted last, depend on enrollmentId
    await insertShsDocuments(client, { enrollmentId, docs });

    await client.query('COMMIT');

    // => Password setup email fires AFTER commit, wrapped in its own
    // => try/catch so a Resend or token-table failure never turns a
    // => successful enrollment into a 500 response for the student
    try {
      await issuePasswordToken({ studentId, email: body.email, purpose: 'setup', enrollmentStatus: status });
    } catch (emailErr) {
      console.error('Password setup email failed to send:', emailErr);
    }

    // => Activity log fires after COMMIT, same reasoning as the password
    // => email above. logActivity() never throws (it catches internally in
    // => logsService.js), so this can never turn a successful enrollment
    // => into a failed response for the student.
    // => actorName is pulled straight from body instead of a fresh
    // => Student.findNameById() lookup, since the profile was just written
    // => in this same transaction, no need to re-query what we just inserted.
    await logActivity({
      entityType: 'shs_enrollment',
      entityId: enrollmentId,
      actorType: 'Student',
      actorId: studentId,
      actorName: `${body.firstName} ${body.lastName}`,
      action: ACTIVITY_ACTIONS.CREATE,
      actionDetail: `Submitted SHS enrollment application, status: ${status}`,
    });

    // => status/reservedReason are already returned by insertShsEnrollment -
    // => passed through here so the controller can tell the frontend
    // => whether this landed as Pending, an explicit Reserve pick, or a
    // => submit-time capacity downgrade to Reserved
    return { enrollmentId, status, reservedReason };

  } catch (err) {
    // => Any failure rolls back ALL inserts - no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// => POST /api/enrollment/re-enroll/shs
// => Re-enrollment for an EXISTING student picking up SHS. Skips
// => student_accounts / student_profile / student_address entirely, and
// => intentionally skips insertShsFamilyMembers too - shs_family_members
// => is keyed by student_id with UNIQUE(student_id, role), not per-enrollment,
// => so those rows already exist from the student's first submission and
// => calling insertShsFamilyMembers again would violate that constraint.
// => Academic history, emergency contact, and health info aren't re-asked
// => by AddEnrollmentModal.jsx either, so they're carried over from the
// => student's most recent SHS enrollment (see getMostRecentShsEnrollmentData).
export const processShsReEnrollmentSubmission = async (studentId, body, files) => {
  if (!body.clusterId) {
    throw Object.assign(new Error('Cluster selection is required.'), { statusCode: 400 });
  }

  // => Re-verify eligibility server-side - same reasoning as the TESDA
  // => re-enrollment flow, the frontend eligibility prop is UI-only
  const eligibility = await getEnrollmentEligibility(studentId);
  if (!eligibility.canEnrollSHS) {
    throw Object.assign(new Error('You are not currently eligible to enroll in SHS.'), { statusCode: 400 });
  }

  // => Same upload helpers as processShsEnrollmentSubmission, duplicated
  // => on purpose per this project's no-shared-abstraction convention
  const uploadFile = async (fileArray, fieldName) => {
    if (!fileArray?.[0]) return null;
    const file = fileArray[0];
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `primeenroll/shs-docs/${fieldName}_${Date.now()}.${ext}`;
    return await uploadToR2(file.buffer, key, file.mimetype);
  };

  const uploadFiles = async (fileArray, fieldName) => {
    if (!fileArray?.length) return [];
    return Promise.all(fileArray.map(async (file, index) => {
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const key = `primeenroll/shs-docs/${fieldName}_${Date.now()}_${index}.${ext}`;
      return await uploadToR2(file.buffer, key, file.mimetype);
    }));
  };

  const psaBirthCertificateKey  = await uploadFile(files?.psaBirthCertificate,  'psaBirthCertificate');
  const grade10ReportCardKeys   = await uploadFiles(files?.grade10ReportCard,   'grade10ReportCard');
  const goodMoralCertificateKey = await uploadFile(files?.goodMoralCertificate, 'goodMoralCertificate');
  const escCertificateKey       = await uploadFile(files?.escCertificate,       'escCertificate');

  const docs = [
    { type: 'PSA Birth Certificate',  key: psaBirthCertificateKey  },
    ...grade10ReportCardKeys.map((key) => ({ type: 'Grade 10 Report Card', key })),
    { type: 'Good Moral Certificate', key: goodMoralCertificateKey },
    { type: 'ESC Certificate',        key: escCertificateKey       },
  ].filter(d => d.key);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const clusterName = await findClusterNameById(client, body.clusterId);
    if (!clusterName) {
      throw Object.assign(new Error('Selected cluster was not found.'), { statusCode: 400 });
    }

    // => Carry over academic history, emergency contact, health info, and
    // => LRN from this student's most recent SHS enrollment, per your
    // => direction. These are NOT NULL on shs_enrollments, so a student
    // => re-enrolling into SHS for the very first time (e.g. coming from a
    // => cleared TESDA enrollment) has nothing to carry over - that case
    // => is rejected explicitly below rather than silently inserting
    // => NULLs into required columns.
    const priorEnrollment = await getMostRecentShsEnrollmentData(client, studentId);
    if (!priorEnrollment) {
      throw Object.assign(
        new Error('No prior SHS enrollment found to carry information over from. Please contact support to complete this enrollment.'),
        { statusCode: 400 }
      );
    }

    const academicData = {
      lastSchoolAttended: priorEnrollment.last_school_attended,
      schoolAddress: priorEnrollment.school_address,
      gradeLevelCompleted: priorEnrollment.grade_level_completed,
      schoolYearCompleted: priorEnrollment.school_year_completed,
      electives: priorEnrollment.electives,
      cluster: body.clusterId,
      class: body.batchId || null,
    };

    const familyData = {
      emergencyName: priorEnrollment.emergency_name,
      emergencyRelationship: priorEnrollment.emergency_relationship,
      emergencyContactNo: priorEnrollment.emergency_contact_no,
      emergencyAddress: priorEnrollment.emergency_address,
      hasMedicalCondition: priorEnrollment.has_medical_condition,
      medicalConditionDetail: priorEnrollment.medical_condition_detail,
      allergies: priorEnrollment.allergies,
      maintenanceMedication: priorEnrollment.maintenance_medication,
    };

    const { enrollmentId, status, reservedReason } = await insertShsEnrollment(client, {
      studentId,
      body: { lrn: priorEnrollment.lrn },
      academicData,
      familyData,
      clusterName,
    });

    // => insertShsFamilyMembers intentionally NOT called here - see the
    // => note at the top of this function

    await insertShsDocuments(client, { enrollmentId, docs });

    await client.query('COMMIT');

    // => No password setup email here - existing student, existing account

    const studentName = await getStudentNameById(pool, studentId);
    await logActivity({
      entityType: 'shs_enrollment',
      entityId: enrollmentId,
      actorType: 'Student',
      actorId: studentId,
      actorName: studentName ? `${studentName.first_name} ${studentName.last_name}` : 'Student',
      action: ACTIVITY_ACTIONS.CREATE,
      actionDetail: `Submitted SHS re-enrollment application, status: ${status}`,
    });

    return { enrollmentId, status, reservedReason };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};