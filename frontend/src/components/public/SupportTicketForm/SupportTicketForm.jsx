import { useState } from 'react';
import { Link } from 'react-router-dom';
import successIcon from '../../../assets/icons/success.png';
import './SupportTicketForm.css';

// => Keep this list identical to ALLOWED_CONCERN_TYPES in the backend
// => middleware and the DB CHECK constraint. No shared code, update all three.
const CONCERN_TYPES = [
  'Course Clarification',
  'Enrollment Status Tracking',
  'Technical Issue',
  'Feedback',
  'Others',
];

// => Capitalizes the first letter of each word, same restriction pattern
// => as TESDAStep1.jsx - only letters, spaces, hyphens, apostrophes allowed
const toTitleCase = (value) => {
  return value
    .replace(/[^a-zA-Z\s\-']/g, '')       // => Allow letters, spaces, hyphens, apostrophes (for names like O'Brien)
    .replace(/^\s+/, '')                    // => No leading spaces
    .replace(/\s{2,}/g, ' ')               // => Collapse multiple spaces into one
    .replace(/(^\w|(?<=[\s\-])\w)/g, (c) => c.toUpperCase()); // => Capitalize after space or hyphen
};

// => Validates Philippine mobile number, same rule as TESDAStep1.jsx
// => Must start with '09' and be exactly 11 digits
const validateMobile = (value) => {
  if (!value) return 'Contact number is required.';
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

// => Broad email format check, identical regex to TESDAStep1.jsx / SHSStep1.jsx
// => so all support ticket + enrollment forms enforce identically
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validateEmail = (value) => {
  if (!value) return 'Email is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return null;
};

const INITIAL_FORM = {
  fullName: '',
  contactNumber: '',
  email: '',
  concernType: '',
  concern: '',
};

export default function SupportTicketForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // => Inline field-level errors, same pattern as TESDAStep1.jsx
  const [contactError, setContactError] = useState('');
  const [emailError, setEmailError] = useState('');

  // => Generic handler for fields with no restriction (concernType, concern)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // => Full name restricted to letters/spaces/hyphens/apostrophes, title-cased as typed
  const handleFullNameChange = (e) => {
    setForm((prev) => ({ ...prev, fullName: toTitleCase(e.target.value) }));
  };

  // => Contact number: strip non-digits, cap at 11 digits, validate 09 prefix as typed
  const handleContactNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, contactNumber: raw }));
    setContactError(validateMobile(raw) || '');
  };

  // => Email: no character restriction (would block valid addresses), just live validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, email: value }));
    setEmailError(validateEmail(value) || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // => Re-check both restricted fields on submit in case the user never blurred them
    const contactCheck = validateMobile(form.contactNumber);
    const emailCheck = validateEmail(form.email);
    setContactError(contactCheck || '');
    setEmailError(emailCheck || '');

    if (contactCheck || emailCheck) {
      setErrorMessage('Please correct the errors above before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // => Adjust this URL if the project already has a shared API base constant elsewhere
      const response = await fetch('/api/public/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        // => Backend sends a plain { error: "..." } shape on 4xx/5xx
        throw new Error(data.error || 'Failed to submit ticket.');
      }

      // => Reset the form and show the confirmation modal on success
      setForm(INITIAL_FORM);
      setShowModal(true);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="support-ticket-section">
      <p className="support-ticket-intro">
        Submit a support ticket and be contacted by the administrative staff during office hours.
        Please review your concern before submitting. If you already have an account, sign in
        instead so your ticket is logged directly in your dashboard. Thank you!
      </p>

      <form className="support-ticket-form" onSubmit={handleSubmit}>
        <div className="support-ticket-field support-ticket-field-full">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="e.g. Juan Dela Cruz"
            value={form.fullName}
            onChange={handleFullNameChange}
            required
          />
        </div>

        <div className="support-ticket-field">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="juan.delacruz@example.com"
            className={emailError ? 'support-ticket-input--error' : ''}
            value={form.email}
            onChange={handleEmailChange}
            required
          />
          {emailError && <span className="support-ticket-inline-error">{emailError}</span>}
        </div>

        <div className="support-ticket-field">
          <label htmlFor="contactNumber">Contact Number</label>
          <input
            id="contactNumber"
            name="contactNumber"
            type="tel"
            placeholder="e.g. 09XXXXXXXXX"
            className={contactError ? 'support-ticket-input--error' : ''}
            value={form.contactNumber}
            maxLength={11}
            onChange={handleContactNumberChange}
            required
          />
          {contactError && <span className="support-ticket-inline-error">{contactError}</span>}
        </div>

        <div className="support-ticket-field support-ticket-field-full">
          <label htmlFor="concernType">Concern Type</label>
          <select
            id="concernType"
            name="concernType"
            value={form.concernType}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select a concern type</option>
            {CONCERN_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="support-ticket-field support-ticket-field-full">
          <label htmlFor="concern">Concern</label>
          <textarea
            id="concern"
            name="concern"
            rows={5}
            value={form.concern}
            onChange={handleChange}
            required
          />
        </div>

        {errorMessage && <p className="support-ticket-error">{errorMessage}</p>}

        <button type="submit" className="support-ticket-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      {/* => Confirmation modal, shown right after a successful submission */}
      {showModal && (
        <div className="support-ticket-modal-overlay">
          <div className="support-ticket-modal">
            <img src={successIcon} alt="Submitted" className="support-ticket-modal-icon" />
            <h3>Ticket Submitted</h3>
            <p>
              Thank you. Please wait for a response within 24 hours, excluding Friday,
              Saturday, and Sunday.
            </p>
            {/* => Plain link only, not a button - anonymous form, no student account
                => to link to, just points people who already have one toward login */}
            <Link to="/login" className="support-ticket-modal-login-link">
              Already have an account? Sign in
            </Link>
            <button
              type="button"
              className="support-ticket-modal-close"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}