import { useState } from 'react';
import toast from 'react-hot-toast';
import axiosStudent from '../../../utils/axiosStudent.js';
import closeIcon from '../../../assets/icons/close.png';
import './addSupportTicketModal.css';

// => Keep this list identical to ALLOWED_CONCERN_TYPES in
// => studentSupportTicketService.js. No shared code, update both by hand.
const CONCERN_TYPES = [
  'Course Clarification',
  'Enrollment Status Tracking',
  'Technical Issue',
  'Feedback',
  'Others',
];

const INITIAL_FORM = {
  subject: '',
  concernType: '',
  concern: '',
};

// => onClose closes the modal, onCreated is called with the new ticket
// => so the parent list page can refresh without a full re-fetch
export default function AddSupportTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // => axiosStudent, never raw fetch, so the CSRF header is attached
      const response = await axiosStudent.post('/student/support-tickets', form);
      toast.success('Support ticket submitted.');
      onCreated?.(response.data);
      onClose();
    } catch (error) {
      // => backend sends { error: "..." } on 4xx/5xx
      const message = error.response?.data?.error || 'Failed to submit ticket.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stk-modal-overlay" onClick={onClose}>
      {/* => stopPropagation so clicking inside the modal card doesn't
          => bubble up and trigger the overlay's onClose */}
      <div className="stk-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="stk-modal-header">
          <h3>New Support Ticket</h3>
          <button type="button" className="stk-modal-close-btn" onClick={onClose}>
            <img src={closeIcon} alt="Close" className="stk-close-icon" />
          </button>
        </div>

        <form className="stk-modal-form" onSubmit={handleSubmit}>
          <div className="stk-modal-field">
            <label htmlFor="subject">Subject <span className="stk-required">*</span></label>
            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="Short summary of your concern"
              value={form.subject}
              onChange={handleChange}
              maxLength={200}
              required
            />
          </div>

          <div className="stk-modal-field">
            <label htmlFor="concernType">Concern Type <span className="stk-required">*</span></label>
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

          <div className="stk-modal-field">
            <label htmlFor="concern">Concern <span className="stk-required">*</span></label>
            <textarea
              id="concern"
              name="concern"
              rows={5}
              value={form.concern}
              onChange={handleChange}
              maxLength={3000}
              required
            />
          </div>

          {errorMessage && <p className="stk-modal-error">{errorMessage}</p>}

          <button type="submit" className="stk-modal-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
