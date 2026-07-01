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

  // => Upload files to R2 BEFORE the DB transaction
  // => R2 uploads are external HTTP calls — they cannot be rolled back
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

  // => Build docs array once — reused for both enrollment_documents and student_docs
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

    // => Step order matters — each insert returns an ID the next one needs
    // => 1. Create account (nullable username if no email provided)
    const studentId = await insertStudentAccount(client, { email: body.email });

    // => 2. Profile (Steps 1 + 2 personal info)
    await insertStudentProfile(client, { studentId, body });

    // => 3. Address (Step 1)
    await insertStudentAddress(client, { studentId, body });

    // => 4. Guardian (Step 2 — only inserted if student is a minor)
    await insertStudentGuardian(client, { studentId, body });

    // => 5. Core enrollment record (Step 4 + Step 5)
    const enrollmentId = await insertTesdaEnrollment(client, {
      studentId,
      courseData,
      ncaeData,
      scholarshipData,
    });

    // => 6. Client classifications (Step 3 — one row per checked box)
    await insertClientClassifications(client, {
      enrollmentId,
      classifications,
      othersText,
    });

    // => 7. Documents (Step 5 — inserted last, depend on both IDs)
    await insertEnrollmentDocuments(client, { enrollmentId, docs });
    await insertStudentDocs(client,         { studentId,    docs });

    await client.query('COMMIT');
    return { enrollmentId };

  } catch (err) {
    // => Any failure rolls back ALL inserts — no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // => Always release back to the pool whether it succeeded or failed
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