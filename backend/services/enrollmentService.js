import { pool } from '../config/db.js';
import { uploadToR2 } from '../middleware/upload.js';

// => Import every model function - each handles exactly one table
import {
  insertStudentAccount,
  insertStudentProfile,
  insertStudentAddress,
  insertContactNumbers,
  insertContactPerson,
  insertLicensures,
  insertCompetencies,
  insertEnrollment,
  insertWorkExperience,
  insertTrainingSeminars,
  insertEnrollmentDocuments,
  insertStudentDocs,
} from '../models/enrollmentModel.js';

export const processEnrollmentSubmission = async (body, files) => {
  // => Parse the JSON strings that arrived via FormData
  const courseData = JSON.parse(body.courseData);
  const expData    = JSON.parse(body.expData);

  // => Upload files to R2 first, before the transaction
  // => R2 uploads are external HTTP calls - they can't be rolled back
  // => so we do them before entering the DB transaction
  const uploadFile = async (fileArray, fieldName) => {
    if (!fileArray?.[0]) return null;

    const file = fileArray[0];

    // => Key format: folder/fieldName_timestamp.ext
    // => Deterministic enough to avoid collisions without a UUID dependency
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
    const key = `primeenroll/student-docs/${fieldName}_${Date.now()}.${ext}`;

    return await uploadToR2(file.buffer, key, file.mimetype);
  };

  const birthCertKey = await uploadFile(files?.birthCert, 'birthCert');
  const schoolDocKey = await uploadFile(files?.schoolDoc, 'schoolDoc');
  const validIdKey   = await uploadFile(files?.validId,   'validId');

  // => Build the docs array once - reused for both enrollment_documents and student_docs
  // => Stores keys, not URLs - proxy route resolves them on demand
  const docs = [
    { type: 'PSA Birth Certificate',    key: birthCertKey },
    { type: 'Form 137 / Diploma / TOR', key: schoolDocKey },
    { type: 'Valid ID',                 key: validIdKey   },
  ].filter(d => d.key);

  // => Get a dedicated WebSocket client from the pool for the transaction
  // => pool.connect() gives a persistent client that supports BEGIN/COMMIT/ROLLBACK
  // => without the HTTP timeout that sql.transaction() has
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // => Steps must follow this exact order - each returns an ID the next step needs
    const studentId    = await insertStudentAccount(client, { email: body.email });
    const profileId    = await insertStudentProfile(client, { studentId, body, courseData });

    await insertStudentAddress(client, { profileId, body });
    await insertContactNumbers(client, { profileId, body });
    await insertContactPerson(client,  { profileId, body });

    // => Licensure and competency go to profile (permanent), not enrollment
    await insertLicensures(client,   { profileId, licensures:   expData.licensures   });
    await insertCompetencies(client, { profileId, competencies: expData.competencies });

    const enrollmentId = await insertEnrollment(client, { studentId, courseData });

    // => Work experience and trainings go to enrollment (per-submission snapshot)
    await insertWorkExperience(client,   { enrollmentId, workExperience: expData.workExperience });
    await insertTrainingSeminars(client, { enrollmentId, trainings:      expData.trainings      });

    // => Documents inserted last - depend on both enrollmentId and studentId
    await insertEnrollmentDocuments(client, { enrollmentId, docs });
    await insertStudentDocs(client,         { studentId,    docs });

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