import { pool } from '../config/db.js';
import { uploadToR2 } from '../middleware/upload.js';

import {
  insertStudentAccount,
  insertStudentProfile,
  insertStudentAddress,
  insertStudentGuardian,
  insertTesdaEnrollment,
  insertClientClassifications,
  insertEnrollmentDocuments,
  insertStudentDocs,
  insertShsEnrollment,
  insertShsFamilyMembers,
  insertShsDocuments,
  getEnrollmentsByStudentId,
  getEnrollmentByPublicId,
} from '../models/enrollmentModel.js';

export const processEnrollmentSubmission = async (body, files) => {
  // => Parse the JSON blobs sent via FormData
  // => Each step's data is stringified on the frontend before appending to FormData
  const courseData       = JSON.parse(body.courseData);       // => Step 5: branch/course/class/fee
  const ncaeData         = JSON.parse(body.ncaeData);         // => Step 4: takenBefore/where/when
  const scholarshipData  = JSON.parse(body.scholarshipData);  // => Step 5: isScholar/type/other
  const classifications  = JSON.parse(body.classifications);  // => Step 3: array of selected values
  const othersText       = body.othersText || null;           // => Step 3: 'others' free text if applicable

  // => Email is required server-side too - TESDAStep1.jsx disables Next
  // => until a valid email is typed, but that's a UI convenience, not a
  // => security boundary. A direct API call could otherwise skip it, and
  // => student_profile.email is NOT NULL, so a missing email would
  // => otherwise surface as a raw, unhelpful Postgres error instead of
  // => this clean validation message.
  if (!body.email || !body.email.trim()) {
    throw Object.assign(new Error('Email address is required.'), { statusCode: 400 });
  }

  // => Upload files to R2 BEFORE the DB transaction
  // => R2 uploads are external HTTP calls - they cannot be rolled back
  // => If the DB transaction fails later, orphaned R2 files are acceptable
  // => (much better than a committed DB row with no file)
  const uploadFile = async (fileArray, fieldName) => {
    if (!fileArray?.[0]) return null;

    const file = fileArray[0];

    // => Key format: folder/fieldName_timestamp.ext
    // => Timestamp is enough to avoid collisions at this scale
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
    const key = `primeenroll/student-docs/${fieldName}_${Date.now()}.${ext}`;

    return await uploadToR2(file.buffer, key, file.mimetype);
  };

  const birthCertKey = await uploadFile(files?.birthCert, 'birthCert');
  const schoolDocKey = await uploadFile(files?.schoolDoc, 'schoolDoc');
  const validIdKey   = await uploadFile(files?.validId,   'validId');

  // => Build docs array once - reused for both tesda_documents and student_docs
  // => filter() drops any that weren't uploaded
  const docs = [
    { type: 'PSA Birth Certificate',    key: birthCertKey },
    { type: 'Form 137 / Diploma / TOR', key: schoolDocKey },
    { type: 'Valid ID',                 key: validIdKey   },
  ].filter(d => d.key);

  // => Get a dedicated client from the pool for the transaction
  // => pool.connect() gives a persistent client that supports BEGIN/COMMIT/ROLLBACK
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // => Step order matters - each insert returns an ID the next one needs
    // => 1. Create account (nullable username if no email provided)
    const studentId = await insertStudentAccount(client, { email: body.email });

    // => 2. Profile (Steps 1 + 2 personal info)
    await insertStudentProfile(client, { studentId, body });

    // => 3. Address (Step 1)
    await insertStudentAddress(client, { studentId, body });

    // => 4. Guardian (Step 2 - only inserted if student is a minor)
    await insertStudentGuardian(client, { studentId, body });

    // => 5. Core enrollment record (Step 4 + Step 5)
    const enrollmentId = await insertTesdaEnrollment(client, {
      studentId,
      courseData,
      ncaeData,
      scholarshipData,
    });

    // => 6. Client classifications (Step 3 - one row per checked box)
    await insertClientClassifications(client, {
      enrollmentId,
      classifications,
      othersText,
    });

    // => 7. Documents (Step 5 - inserted last, depend on enrollmentId)
    // => student_docs intentionally skipped - enrollment documents are the single source of truth
    // => profile-level doc storage deferred until a separate document upload flow is built
    await insertEnrollmentDocuments(client, { enrollmentId, docs });

    await client.query('COMMIT');
    return { enrollmentId };

  } catch (err) {
    // => Any failure rolls back ALL inserts - no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // => Always release back to the pool whether it succeeded or failed
    client.release();
  }
};

export const processShsEnrollmentSubmission = async (body, files) => {
  // => Parse the JSON blobs sent via FormData - same pattern as processEnrollmentSubmission
  const academicData  = JSON.parse(body.academicData); // => Step 2: school info, track/cluster, branch
  const familyData     = JSON.parse(body.familyData);   // => Step 3: father/mother/guardian, emergency, health
  const privacyAgreed  = body.privacyAgreed === 'true';  // => FormData sends booleans as strings

 // => Consent must be checked server-side too - the frontend disables the
  // => Submit button until agreed, but that's a UI convenience, not a
  // => security boundary. A direct API call could otherwise skip it.
  if (!privacyAgreed) {
    throw Object.assign(new Error('Data privacy consent is required.'), { statusCode: 400 });
  }

  // => Email is required server-side too - same reasoning as TESDA's
  // => guard in processEnrollmentSubmission above
  if (!body.email || !body.email.trim()) {
    throw Object.assign(new Error('Email address is required.'), { statusCode: 400 });
  }

  // => Guards mirroring the DB CHECK constraints on shs_enrollments -
  // => catches an incomplete/bad submission here with a clear message,
  // => instead of letting a raw Postgres constraint-violation reach the client
  if (!['none', 'yes'].includes(familyData.hasMedicalCondition)) {
    throw Object.assign(new Error('Medical condition status is required.'), { statusCode: 400 });
  }

  // => Upload files to R2 BEFORE the DB transaction - same reasoning as
  // => processEnrollmentSubmission: R2 calls can't be rolled back, so an
  // => orphaned R2 file on a failed DB transaction is an acceptable tradeoff
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
    // const enrollmentId = await insertShsEnrollment(client, { studentId, academicData, familyData, privacyAgreed });
    const enrollmentId = await insertShsEnrollment(client, { studentId, body, academicData, familyData });
    // => 5. Family members - one row each for whichever of Father/Mother/
    // => Guardian were provided. The DEFERRED constraint trigger on
    // => shs_family_members checks the both-parents-or-guardian rule at
    // => COMMIT time, after every row in this step has landed.
    await insertShsFamilyMembers(client, { studentId, familyData });

    // => 6. Documents - inserted last, depend on enrollmentId
    await insertShsDocuments(client, { enrollmentId, docs });

    await client.query('COMMIT');
    return { enrollmentId };

  } catch (err) {
    // => Any failure rolls back ALL inserts - no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// => Calls the model to get all enrollments for the logged-in student
export const getStudentEnrollments = async (studentId) => {
  return await getEnrollmentsByStudentId(pool, studentId);
};

// => Calls the model to get one enrollment by UUID, ownership-checked
export const getStudentEnrollmentDetail = async (publicId, studentId) => {
  return await getEnrollmentByPublicId(pool, publicId, studentId);
};