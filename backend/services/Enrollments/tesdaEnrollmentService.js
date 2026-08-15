// => public/services/Enrollments/tesdaEnrollmentService.js
// => Split out of the old enrollmentService.js - TESDA-only submission flow.
// => Renamed from processEnrollmentSubmission to processTesdaEnrollmentSubmission
//    so it reads symmetrically with processShsEnrollmentSubmission now that
//    they live in separate files. This is an internal rename only - the
//    route path (/api/enrollment/submit) is unchanged, so nothing on the
//    frontend needs to be touched for this rename.

import { pool } from '../../config/db.js';
import { uploadToR2 } from '../../middleware/upload.js';

import {
  insertStudentAccount,
  insertStudentProfile,
  insertStudentAddress,
  insertStudentGuardian,
} from '../../models/Enrollments/sharedEnrollmentModel.js';

import {
  insertTesdaEnrollment,
  insertClientClassifications,
  insertEnrollmentDocuments,
} from '../../models/Enrollments/tesdaEnrollmentModel.js';

import { issuePasswordToken } from '../passwordTokenService.js';
import { logActivity } from '../Logs/logsService.js';
import { ACTIVITY_ACTIONS } from '../../constants/activityActions.js';

export const processTesdaEnrollmentSubmission = async (body, files) => {
  // => Parse the JSON blobs sent via FormData
  // => Each step's data is stringified on the frontend before appending to FormData
  const courseData       = JSON.parse(body.courseData);       // => Step 5: course/class/fee (sector is read-only, derived, not submitted)
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

  // => Build docs array once - reused for tesda_documents
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

    // => Returns status alongside enrollmentId - the service needs it to
    // => tell the student their current status in the password-setup email.
    // => reservedReason distinguishes an explicit Reserve pick from a
    // => submit-time capacity downgrade, for the InformationModal variant
    const { enrollmentId, status, reservedReason } = await insertTesdaEnrollment(client, {
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
      entityType: 'tesda_enrollment',
      entityId: enrollmentId,
      actorType: 'Student',
      actorId: studentId,
      actorName: `${body.firstName} ${body.lastName}`,
      action: ACTIVITY_ACTIONS.CREATE,
      actionDetail: `Submitted TESDA enrollment application, status: ${status}`,
    });

    // => status/reservedReason are already returned by insertTesdaEnrollment -
    // => passed through here so the controller can tell the frontend
    // => whether this landed as Pending, an explicit Reserve pick, or a
    // => submit-time capacity downgrade to Reserved
    return { enrollmentId, status, reservedReason };

  } catch (err) {
    // => Any failure rolls back ALL inserts - no partial records ever persist
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // => Always release back to the pool whether it succeeded or failed
    client.release();
  }
};
