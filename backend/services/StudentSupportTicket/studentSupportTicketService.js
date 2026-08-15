// services/StudentSupportTicket/studentSupportTicketService.js

import {
  getSupportTicketsByStudent,
  getSupportTicketDetailByPublicId,
  insertSupportTicket,
} from "../../models/StudentSupportTicket/studentSupportTicketModel.js";

import { Student } from "../../models/studentModel.js";
import { ACTIVITY_ACTIONS } from "../../constants/activityActions.js";
import { logActivity } from "../Logs/logsService.js";

// => Kept identical in spirit to publicSupportTicketService.js's list, but
// => duplicated here rather than imported, per no-shared-code policy
const ALLOWED_CONCERN_TYPES = [
  "Course Clarification",
  "Enrollment Status Tracking",
  "Technical Issue",
  "Feedback",
  "Others",
];

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateTicketPayload({ subject, concernType, concern }) {
  if (!subject || !subject.trim()) {
    throw new ValidationError("Subject is required.");
  }

  // => Matches the subject VARCHAR(200) column
  if (subject.trim().length > 200) {
    throw new ValidationError("Subject is too long, please shorten it to 200 characters or fewer.");
  }

  if (!concernType || !ALLOWED_CONCERN_TYPES.includes(concernType)) {
    throw new ValidationError("Please select a valid concern type.");
  }

  if (!concern || !concern.trim()) {
    throw new ValidationError("Please describe your concern.");
  }

  // => message is TEXT with no hard DB limit, this just stops abusive payloads
  if (concern.trim().length > 3000) {
    throw new ValidationError("Concern is too long, please shorten it to 3000 characters or fewer.");
  }
}

export async function submitStudentSupportTicket(studentId, payload) {
  validateTicketPayload(payload);

  const subject = payload.subject.trim();
  const concernType = payload.concernType.trim();

  const ticket = await insertSupportTicket({
    studentId,
    subject,
    concernType,
    message: payload.concern.trim(),
  });

  // => Fetch display name for the log's actor_name snapshot - ticket
  // => submission is low-frequency enough that a fresh lookup here is fine
  const nameRow = await Student.findNameById(studentId);
  const actorName = nameRow
      ? [nameRow.first_name, nameRow.last_name].filter(Boolean).join(' ')
      : 'Student';

  // => entity_type/entity_id point at the new ticket, unlike account-level
  // => actions - this is the first entity-scoped log on the student side
  await logActivity({
      actorType: 'Student',
      actorId: studentId,
      actorName,
      entityType: 'SupportTicket',
      entityId: ticket.ticket_id,
      action: ACTIVITY_ACTIONS.CREATE,
      actionDetail: `Submitted support ticket: "${subject}" (${concernType})`,
  });

  return ticket;
}

export async function listStudentSupportTickets(studentId) {
  return await getSupportTicketsByStudent(studentId);
}

export async function getStudentSupportTicketDetail(studentId, publicId) {
  return await getSupportTicketDetailByPublicId(publicId, studentId);
}