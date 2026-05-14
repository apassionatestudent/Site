import React, { useEffect, useState } from 'react';
import './SupportTickets.css';

const initialTickets = [
  {
    id: 1,
    subject: 'Unable to login',
    description: 'I receive an error when trying to log in with my credentials.',
    status: 'Open',
    createdAt: '2026-05-13',
  },
  {
    id: 2,
    subject: 'Page layout issue',
    description: 'Support tickets page is not rendering correctly in mobile view.',
    status: 'Pending',
    createdAt: '2026-05-12',
  },
];

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Open');

  useEffect(() => {
    setTickets(initialTickets);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!subject.trim() || !description.trim()) {
      return;
    }

    const newTicket = {
      id: Date.now(),
      subject: subject.trim(),
      description: description.trim(),
      status,
      createdAt: new Date().toLocaleDateString(),
    };

    setTickets([newTicket, ...tickets]);
    setSubject('');
    setDescription('');
    setStatus('Open');
  };

  return (
    <div className="support-tickets-page">
      <header className="support-tickets-header">
        <h1>Support Tickets</h1>
        <p>View existing tickets or submit a new request for assistance.</p>
      </header>

      <section className="ticket-form-section">
        <h2>Create New Ticket</h2>
        <form className="ticket-form" onSubmit={handleSubmit}>
          <label>
            Subject
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Enter ticket subject"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue in detail"
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>

          <button type="submit">Submit Ticket</button>
        </form>
      </section>

      <section className="ticket-list-section">
        <h2>Current Tickets</h2>
        {tickets.length === 0 ? (
          <p>No tickets available.</p>
        ) : (
          <ul className="ticket-list">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="ticket-card">
                <div className="ticket-card-header">
                  <h3>{ticket.subject}</h3>
                  <span className={`ticket-status ticket-status-${ticket.status.toLowerCase()}`}>
                    {ticket.status}
                  </span>
                </div>
                <p>{ticket.description}</p>
                <small>Created: {ticket.createdAt}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SupportTickets;
