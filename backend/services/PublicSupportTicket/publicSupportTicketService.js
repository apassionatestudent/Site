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

// => Regex-free email shape check. Even a simplified regex like
// => /^[^\s@]+@[^\s@]+\.[^\s@]+$/ still trips js/polynomial-redos, since
// => the [^\s@]+ before the dot overlaps with the literal "." after it,
// => creating backtracking ambiguity on crafted input. Plain string methods
// => below do the same structural check with zero regex, so there is no
// => quantifier for an attacker to exploit at all.
function isValidEmailShape(value) {
  const trimmed = value.trim();

  // => No whitespace anywhere in the address
  if (/\s/.test(trimmed)) return false;

  const atIndex = trimmed.indexOf('@');
  const lastAtIndex = trimmed.lastIndexOf('@');

  // => Must have exactly one "@", and it can't be the first character
  if (atIndex <= 0 || atIndex !== lastAtIndex) return false;

  const domain = trimmed.slice(atIndex + 1);
  const dotIndex = domain.indexOf('.');

  // => Domain must contain a dot that isn't the first or last character
  if (dotIndex <= 0 || domain.endsWith('.')) return false;

  return true;
}

// => Custom error type so the controller can tell validation failures (400)
// => apart from unexpected server/DB errors (500)
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// => Validation now lives here in the service instead of a middleware file
// => contactNumber removed - public tickets are anonymous, email alone is enough to respond
function validateTicketPayload({ fullName, email, concernType, concern }) {
  if (!fullName || !fullName.trim()) {
    throw new ValidationError("Full name is required.");
  }

  // => Matches the full_name VARCHAR(150) column - stops a Postgres error
  // => from bubbling up as an unhandled 500 on an oversized payload
  if (fullName.trim().length > 150) {
    throw new ValidationError("Full name is too long, please shorten it to 150 characters or fewer.");
  }

  

  if (!email || !email.trim()) {
    throw new ValidationError("Email is required.");
  }

  // => Length check still runs first, no reason to drop this even
  // => though isValidEmailShape() carries no regex risk
  if (email.trim().length > 255) {
    throw new ValidationError("Email address is too long.");
  }

  if (!isValidEmailShape(email)) {
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
    email: payload.email.trim().toLowerCase(),
    concernType: payload.concernType.trim(),
    concern: payload.concern.trim(),
  };

  return await insertPublicSupportTicket(cleaned);
}