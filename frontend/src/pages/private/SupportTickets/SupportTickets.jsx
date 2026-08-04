import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import './supportTickets.css';
import axiosStudent from '../../../utils/axiosStudent.js';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';
import AddSupportTicketModal from '../../../components/private/AddSupportTicketModal/addSupportTicketModal.jsx';

// icons
import errorIcon from '../../../assets/icons/warning.png';
import emptyIcon from '../../../assets/icons/empty-classes.png';
import calendarIcon from '../../../assets/icons/calendar.png';

// => Maps each status to a CSS modifier class, same fixed palette style
// => as Enrollment.jsx's statusClass so colors read consistently app-wide
const statusClass = {
  'Open':         'status--open',
  'In Progress':  'status--progress',
  'Resolved':     'status--resolved',
  'Closed':       'status--closed',
};

// => Formats ISO date string to readable date, same shape as Enrollment.jsx
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

function SupportTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // => seconds remaining, null if not rate limited
  const [showModal, setShowModal] = useState(false);

  // => Wrapped in useCallback so RateLimitNotice can call this exact same
  // => function again once its countdown finishes, matching Enrollment.jsx
  const fetchTickets = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setRateLimitInfo(null);
    try {
      const response = await axiosStudent.get('/student/support-tickets');
      setTickets(response.data);
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        setRateLimitInfo(retryAfter);
      } else {
        setListError('Failed to fetch support tickets.');
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // => Called by the modal after a successful submission, refetches
  // => instead of guessing the shape of a locally-appended row
  const handleTicketCreated = () => {
    fetchTickets();
  };

  const handleCardClick = (ticket) => {
    navigate(`/dashboard/supporttickets/${ticket.public_id}`);
  };

  return (
    <div className="stk-page">
      <div className="stk-header">
        <h1 className="stk-title">
          {tickets.length > 1 ? 'Support Tickets' : 'Support Ticket'}
        </h1>
        <p className="stk-subtitle">
          Click on any ticket to view its full details.
        </p>
      </div>

      {rateLimitInfo && (
        <div className="stk-empty">
          <img src={errorIcon} alt="" className="stk-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchTickets} />
        </div>
      )}

      {!rateLimitInfo && listLoading && (
        <LoadingState message="Loading your support tickets..." />
      )}

      {!rateLimitInfo && listError && (
        <div className="stk-empty">
          <img src={errorIcon} alt="" className="stk-empty-icon" />
          <p>{listError}</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && tickets.length === 0 && (
        <div className="stk-empty">
          <img src={emptyIcon} alt="" className="stk-empty-icon" />
          <p>You have not submitted any support tickets yet.</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && tickets.length > 0 && (
        <ul className="stk-list">
          {tickets.map((ticket, index) => (
            <li
              key={ticket.public_id}
              className="stk-card"
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => handleCardClick(ticket)}
            >
              {/* => Left accent bar colored by status */}
              <div className={`stk-card-bar ${statusClass[ticket.status] || ''}`} />

              <div className="stk-card-body">
                <div className="stk-card-top">
                  <div>
                    <p className="stk-card-subject">{ticket.subject}</p>
                    <p className="stk-card-type">{ticket.concern_type}</p>
                  </div>
                  <span className={`stk-card-badge ${statusClass[ticket.status] || ''}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="stk-card-meta">
                  <span>
                    <img src={calendarIcon} alt="" className="stk-card-meta-icon" />
                    Submitted {formatDate(ticket.created_at)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* => fixed bottom-right FAB, green, matches the admin dashboard's
          => create-action convention */}
      <button
        type="button"
        className="stk-fab"
        onClick={() => setShowModal(true)}
        aria-label="New Support Ticket"
      >
        +
      </button>

      {showModal && (
        <AddSupportTicketModal
          onClose={() => setShowModal(false)}
          onCreated={handleTicketCreated}
        />
      )}
    </div>
  );
}

export default SupportTickets;
