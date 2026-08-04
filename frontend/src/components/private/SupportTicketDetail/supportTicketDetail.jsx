import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosStudent from '../../../utils/axiosStudent.js';
import BackButton from '../BackButton/BackButton.jsx';
import LoadingState from '../LoadingState/loadingState.jsx';
import errorIcon from '../../../assets/icons/warning.png';
import infoIcon from '../../../assets/icons/info.png';
import './supportTicketDetail.css';

// => Maps each status to a CSS modifier class, same palette style as
// => Enrollment.jsx's statusClass so colors stay consistent app-wide
const statusClass = {
  'Open':         'status--open',
  'In Progress':  'status--progress',
  'Resolved':     'status--resolved',
  'Closed':       'status--closed',
};

// => Notice banner copy per status, mirrors the reviewed/pending/rejected
// => notices on tesdaEnrollmentDetail.jsx
const statusMessage = {
  'Open':         'Your ticket has been submitted and is awaiting review from our staff.',
  'In Progress':  'Our staff is currently looking into your concern.',
  'Resolved':     'This concern has been resolved. Thank you for reaching out.',
  'Closed':       'This ticket has been closed.',
};

// => Formats an ISO timestamp into a readable local date/time string,
// => consistent with how other Detail components display timestamps
const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function SupportTicketDetail() {
  const { publicId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchTicket = async () => {
      try {
        const response = await axiosStudent.get(`/student/support-tickets/${publicId}`);
        if (isMounted) setTicket(response.data);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.error || 'Failed to load this ticket.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTicket();
    return () => { isMounted = false; };
  }, [publicId]);

  return (
    <div className="stk-detail-page">
      <BackButton destination="Support Tickets" />

      {isLoading && <LoadingState message="Loading your ticket..." />}

      {!isLoading && (errorMessage || !ticket) && (
        <div className="stk-detail-empty">
          <img src={errorIcon} alt="" className="stk-detail-empty-icon" />
          <p>{errorMessage || 'Ticket not found.'}</p>
        </div>
      )}

      {!isLoading && ticket && (
        <div className="stk-detail">
          <div className="stk-detail-header">
            <div>
              <h1 className="stk-detail-title">{ticket.subject}</h1>
              <p className="stk-detail-sub">{ticket.concern_type}</p>
            </div>
            <span className={`stk-detail-badge ${statusClass[ticket.status] || ''}`}>
              {ticket.status}
            </span>
          </div>

          {/* => Status notice banner, same pattern as the reviewed/pending
              => banners on tesdaEnrollmentDetail.jsx */}
          <div className={`stk-notice ${statusClass[ticket.status] || ''}`}>
            <img src={infoIcon} alt="" className="stk-notice-icon" />
            <p>{statusMessage[ticket.status] || 'Status update pending.'}</p>
          </div>

          {/* => Details grid comes right after the notice, ahead of the
              => Concern and Staff Remarks sections */}
          <h2 className="stk-detail-section-title">Details</h2>
          <div className="stk-detail-grid stk-detail-grid--halves">
            <div className="stk-detail-card">
              <span className="stk-detail-label">Concern Type</span>
              <p className="stk-detail-value">{ticket.concern_type || '-'}</p>
            </div>
            <div className="stk-detail-card">
              <span className="stk-detail-label">Last Updated</span>
              <p className="stk-detail-value">{formatDateTime(ticket.updated_at)}</p>
            </div>
          </div>

          {/* => Concern and Staff Remarks now share the same bordered
              => box style (.stk-text-box), since both are free-text
              => blocks and should read as equivalent content */}
          <h2 className="stk-detail-section-title">Concern</h2>
          <div className="stk-text-box">
            <p>{ticket.message}</p>
          </div>

          <h2 className="stk-detail-section-title">Staff Remarks</h2>
          <div className="stk-text-box">
            <p>{ticket.external_remarks || 'No remarks yet.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
