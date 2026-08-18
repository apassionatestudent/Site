import { useState, useEffect } from 'react';
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
  email: '',
  concernType: '',
  concern: '',
};

// => must match CHATBOT_TRANSCRIPT_KEY in chatbotWidget.jsx exactly - the
//    widget writes here right before opening this page in a new tab
const CHATBOT_TRANSCRIPT_KEY = 'chatbot_transcript';

export default function SupportTicketForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // => Inline field-level errors, same pattern as TESDAStep1.jsx
  const [emailError, setEmailError] = useState('');

  // => true when the concern field was prefilled from a chatbot handoff,
  //    controls the visible "conversation attached" indicator below
  const [chatAttached, setChatAttached] = useState(false);

  // => Runs once on mount - picks up the transcript the chatbot widget
  //    stored in localStorage right before opening this tab, prefills
  //    the concern field, then clears the key immediately so it never
  //    leaks into a later unrelated ticket submission
  // => localStorage, not sessionStorage - see handleEscalateClick's
  //    comment in chatbotWidget.jsx for why
  useEffect(() => {
    const transcript = localStorage.getItem(CHATBOT_TRANSCRIPT_KEY);
    if (transcript) {
      setForm((prev) => ({ ...prev, concern: transcript }));
      setChatAttached(true);
      localStorage.removeItem(CHATBOT_TRANSCRIPT_KEY);
    }
  }, []);

  // => lets the user discard the attached transcript and start the
  //    concern field fresh, without needing to select-all/delete manually
  const handleClearTranscript = () => {
    setForm((prev) => ({ ...prev, concern: '' }));
    setChatAttached(false);
  };

  // => Generic handler for fields with no restriction (concernType, concern)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // => Full name restricted to letters/spaces/hyphens/apostrophes, title-cased as typed
  const handleFullNameChange = (e) => {
    setForm((prev) => ({ ...prev, fullName: toTitleCase(e.target.value) }));
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

    // => Re-check the restricted field on submit in case the user never blurred it
    const emailCheck = validateEmail(form.email);
    setEmailError(emailCheck || '');

    if (emailCheck) {
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

        <div className="support-ticket-field support-ticket-field-full">
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

          {/* => only shown when the concern field was prefilled from a
                 chatbot escalation, lets the admin's context be visible
                 to the user too, and gives an easy way to remove it */}
          {chatAttached && (
            <div className="support-ticket-chat-attached">
              <span>Your chatbot conversation was attached below for context.</span>
              <button type="button" onClick={handleClearTranscript}>
                Remove
              </button>
            </div>
          )}

          <textarea
            id="concern"
            name="concern"
            rows={chatAttached ? 10 : 5}
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