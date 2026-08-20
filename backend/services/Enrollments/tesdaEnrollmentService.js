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

// => Reused straight from the public enrollment form's own requirements
// => fetch - the authoritative source for what's actually required for a
// => course, called directly here since services can call models across
// => feature folders without going through HTTP
import { getRequirementsByCourseId } from '../../models/TESDAEnrollment/tesdaCourseModel.js';

import { issuePasswordToken } from '../passwordTokenService.js';
import { logActivity } from '../Logs/logsService.js';
import { ACTIVITY_ACTIONS } from '../../constants/activityActions.js';

// => Maps a file's mimetype to the extension used in its R2 object key -
// => previously only checked for pdf vs "everything else defaults to
// => jpg", which silently mislabeled PNG uploads with a .jpg extension
const EXTENSION_BY_MIME = {
  'application/pdf': 'pdf',
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
};

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

  // => Authoritative source of what this course actually requires right
  // => now - never trusts the client-supplied documentRequirements field
  // => for this. courseData.course was already parsed above.
  const courseRequirements = await getRequirementsByCourseId(courseData.course);

  // => Keyed by requirement_id as a string, matching the id parsed out of
  // => each field name below
  const requirementsById = new Map(
    courseRequirements.map(r => [String(r.requirement_id), r])
  );

  // => Groups incoming files by requirement_id, read straight out of the
  // => fieldname itself ("req_<requirement_id>" per TESDAStep3.jsx) rather
  // => than trusted from any client-supplied label
  const filesByRequirementId = new Map();
  for (const file of files || []) {
    const match = /^req_(\d+)$/.exec(file.fieldname);
    if (!match) {
      console.warn(`Skipping upload for unrecognized field: ${file.fieldname}`);
      continue;
    }

    const requirementId = match[1];

    // => Field doesn't correspond to a requirement currently configured
    // => for this course - either stale (admin edited/removed it after
    // => the student loaded the form) or a forged field. Either way,
    // => rejected outright rather than silently dropped or trusted.
    if (!requirementsById.has(requirementId)) {
      throw Object.assign(
        new Error("One of the submitted documents no longer matches this course's requirements. Please refresh and try again."),
        { statusCode: 400 }
      );
    }

    if (!filesByRequirementId.has(requirementId)) {
      filesByRequirementId.set(requirementId, []);
    }
    filesByRequirementId.get(requirementId).push(file);
  }

  // => Enforce max_files per requirement, using the DB value
  for (const [requirementId, fileGroup] of filesByRequirementId) {
    const requirement = requirementsById.get(requirementId);
    if (fileGroup.length > requirement.max_files) {
      throw Object.assign(
        new Error(`You can upload up to ${requirement.max_files} file(s) for "${requirement.document_type}".`),
        { statusCode: 400 }
      );
    }
  }

  // => Enforce is_required - every required document needs at least one
  // => uploaded file, checked against the full DB list, not just what
  // => was submitted
  for (const requirement of courseRequirements) {
    if (requirement.is_required && !filesByRequirementId.has(String(requirement.requirement_id))) {
      throw Object.assign(
        new Error(`"${requirement.document_type}" is required.`),
        { statusCode: 400 }
      );
    }
  }

  // => Upload files to R2 BEFORE the DB transaction
  // => R2 uploads are external HTTP calls - they cannot be rolled back
  // => If the DB transaction fails later, orphaned R2 files are acceptable
  // => (much better than a committed DB row with no file). All validation
  // => above runs first so nothing gets uploaded for a submission that's
  // => going to be rejected anyway.
  const docs = [];
  for (const [requirementId, fileGroup] of filesByRequirementId) {
    const requirement = requirementsById.get(requirementId);

    for (const file of fileGroup) {
      const ext = EXTENSION_BY_MIME[file.mimetype] || 'jpg';
      const key = `primeenroll/student-docs/req_${requirementId}_${Date.now()}_${docs.length}.${ext}`;
      const uploadedKey = await uploadToR2(file.buffer, key, file.mimetype);

      // => document_type comes from the DB row, never from the client
      docs.push({ type: requirement.document_type, key: uploadedKey });
    }
  }

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
