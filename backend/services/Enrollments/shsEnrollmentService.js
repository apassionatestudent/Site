// => public/services/Enrollments/shsEnrollmentService.js
// => Split out of the old enrollmentService.js - SHS-only submission flow

import { pool } from '../../config/db.js';
import { uploadToR2 } from '../../middleware/upload.js';

import {
  insertStudentAccount,
  insertStudentProfile,
  insertStudentAddress,
} from '../../models/Enrollments/sharedEnrollmentModel.js';

import {
  insertShsEnrollment,
  insertShsFamilyMembers,
  insertShsDocuments,
  findClusterNameById,
} from '../../models/Enrollments/shsEnrollmentModel.js';

import { issuePasswordToken } from '../passwordTokenService.js';

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

  const psaBirthCertificateKey  = await uploadFile(files?.psaBirthCertificate,  'psaBirthCertificate');
  const grade10ReportCardKey    = await uploadFile(files?.grade10ReportCard,    'grade10ReportCard');
  const goodMoralCertificateKey = await uploadFile(files?.goodMoralCertificate, 'goodMoralCertificate');
  const escCertificateKey       = await uploadFile(files?.escCertificate,       'escCertificate');

  // => Build docs array once - reused for shs_documents insert
  const docs = [
    { type: 'PSA Birth Certificate',  key: psaBirthCertificateKey  },
    { type: 'Grade 10 Report Card',   key: grade10ReportCardKey    },
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
    const { enrollmentId, status } = await insertShsEnrollment(client, { studentId, body, academicData, familyData, clusterName });

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

    return { enrollmentId };

  } catch (err) {
    // => Any failure rolls back ALL inserts - no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
