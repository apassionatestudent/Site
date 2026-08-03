// services/PublicSupportTicket/publicSupportTicketService.js

import { insertPublicSupportTicket } from "../../models/PublicSupportTicket/publicSupportTicketModel.js";

// => Keep this list identical to the DB CHECK constraint and CONCERN_TYPES
// => in the frontend dropdown. No shared code, so update all three by hand.
const ALLOWED_CONCERN_TYPES = [
  "Course Clarification",
  "Enrollment Status Tracking",
  "Technical Issue",
  "Feedback",
  "Others",
];

// => Basic shape check, not a full RFC validator, just enough to catch typos
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// => Custom error type so the controller can tell validation failures (400)
// => apart from unexpected server/DB errors (500)
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// => Validation now lives here in the service instead of a middleware file
function validateTicketPayload({ fullName, contactNumber, email, concernType, concern }) {
  if (!fullName || !fullName.trim()) {
    throw new ValidationError("Full name is required.");
  }

  // => Matches the full_name VARCHAR(150) column - stops a Postgres error
  // => from bubbling up as an unhandled 500 on an oversized payload
  if (fullName.trim().length > 150) {
    throw new ValidationError("Full name is too long, please shorten it to 150 characters or fewer.");
  }

  if (!contactNumber || !contactNumber.trim()) {
    throw new ValidationError("Contact number is required.");
  }

  if (!/^09\d{9}$/.test(contactNumber.trim())) {
    throw new ValidationError("Contact number must start with 09 and be exactly 11 digits.");
  }

  if (!email || !email.trim()) {
    throw new ValidationError("Email is required.");
  }

  // => Length check runs BEFORE the regex test, bounding input size before
  // => it ever reaches EMAIL_REGEX
  if (email.trim().length > 255) {
    throw new ValidationError("Email address is too long.");
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError("Please enter a valid email address.");
  }

  if (!concernType || !ALLOWED_CONCERN_TYPES.includes(concernType)) {
    throw new ValidationError("Please select a valid concern type.");
  }

  if (!concern || !concern.trim()) {
    throw new ValidationError("Please describe your concern.");
  }

  // => Matches the TEXT column but stops obviously abusive payloads early
  if (concern.trim().length > 3000) {
    throw new ValidationError("Concern is too long, please shorten it to 3000 characters or fewer.");
  }
}

// => Validates, trims/normalizes, then hands off to the model
export async function submitPublicSupportTicket(payload) {
  validateTicketPayload(payload);

  const cleaned = {
    fullName: payload.fullName.trim(),
    contactNumber: payload.contactNumber.trim(),
    email: payload.email.trim().toLowerCase(),
    concernType: payload.concernType.trim(),
    concern: payload.concern.trim(),
  };

  return await insertPublicSupportTicket(cleaned);
}