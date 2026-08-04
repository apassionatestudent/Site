// services/StudentSupportTicket/studentSupportTicketService.js

import {
  getSupportTicketsByStudent,
  getSupportTicketDetailByPublicId,
  insertSupportTicket,
} from "../../models/StudentSupportTicket/studentSupportTicketModel.js";

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

  return await insertSupportTicket({
    studentId,
    subject: payload.subject.trim(),
    concernType: payload.concernType.trim(),
    message: payload.concern.trim(),
  });
}

export async function listStudentSupportTickets(studentId) {
  return await getSupportTicketsByStudent(studentId);
}

export async function getStudentSupportTicketDetail(studentId, publicId) {
  return await getSupportTicketDetailByPublicId(publicId, studentId);
}