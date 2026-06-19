import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import './Documents.css';

import { apiFetch, RateLimitError } from '../../../utils/api.js';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

// icons
import loadingIcon   from "../../../assets/icons/loading.png";
import errorIcon     from "../../../assets/icons/warning.png";
import clipboardIcon from "../../../assets/icons/clipboard.png";
import calendarIcon  from "../../../assets/icons/calendar.png";

// => Maps document source to a CSS modifier class for the left accent bar and badge
const sourceClass = {
  'enrollment': 'source--enrollment',
  'profile':    'source--profile',
};

// => Human-readable label for the document source
const sourceLabel = {
  'enrollment': 'Enrollment Doc',
  'profile':    'Profile Doc',
};

// => Formats ISO date string to readable date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

function Documents() {
  const navigate = useNavigate();

  const [documents,   setDocuments]   = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError,   setListError]   = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // => seconds remaining, null if not rate limited

  // => Wrapped in useCallback so RateLimitNotice can call this exact same
  // => function again once its countdown finishes, instead of duplicating
  // => the fetch logic in a separate "retry" function.
  const fetchDocuments = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setRateLimitInfo(null);
    try {
      const data = await apiFetch('/api/documents/my-documents', {
        credentials: 'include', // => sends the httpOnly JWT cookie
      });
      setDocuments(data.documents);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimitInfo(err.retryAfter);
      } else {
        setListError('Failed to fetch documents.');
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  // => Fetch all documents for the logged-in student on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCardClick = (publicId) => {
    // => Navigate to the detail page using the document's public UUID
    navigate(`/dashboard/documents/${publicId}`);
  };

  // => Group documents: enrollment docs first, then profile docs
  const enrollmentDocs = documents.filter(d => d.source === 'enrollment');
  const profileDocs    = documents.filter(d => d.source === 'profile');

  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1 className="docs-title">Documents</h1>
        <p className="docs-subtitle">
          Click on any document to preview it.
        </p>
      </div>

      {rateLimitInfo && (
        <div className="docs-empty">
          <img src={errorIcon} alt="" className="docs-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchDocuments} />
        </div>
      )}

      {!rateLimitInfo && listLoading && (
        <div className="docs-empty">
          <img src={loadingIcon} alt="loading..." className="docs-empty-icon" />
          <p>Loading your documents...</p>
        </div>
      )}

      {!rateLimitInfo && listError && (
        <div className="docs-empty">
          <img src={errorIcon} alt="" className="docs-empty-icon" />
          <p>{listError}</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && documents.length === 0 && (
        <div className="docs-empty">
          <img src={clipboardIcon} alt="" className="docs-empty-icon" />
          <p>No documents found.</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && documents.length > 0 && (
        <>
          {/* => Enrollment documents section */}
          {enrollmentDocs.length > 0 && (
            <section className="docs-section">
              <h2 className="docs-section-title">Enrollment Documents</h2>
              <ul className="docs-list">
                {enrollmentDocs.map((doc, index) => (
                  <li
                    key={doc.public_id}
                    className="docs-card"
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => handleCardClick(doc.public_id)}
                  >
                    {/* => Left accent bar colored by source */}
                    <div className={`docs-card-bar ${sourceClass[doc.source] || ''}`} />

                    <div className="docs-card-body">
                      <div className="docs-card-top">
                        <div>
                          <p className="docs-card-type">{doc.document_type}</p>
                          {doc.course_name && (
                            <p className="docs-card-course">{doc.course_name}</p>
                          )}
                        </div>
                        <span className={`docs-card-badge ${sourceClass[doc.source] || ''}`}>
                          {sourceLabel[doc.source]}
                        </span>
                      </div>

                      <div className="docs-card-meta">
                        <span>
                          <img src={calendarIcon} alt="" className="docs-card-meta-icon" />
                          Uploaded {formatDate(doc.uploaded_at)}
                        </span>
                      </div>
                    </div>

                    <div className="docs-card-arrow">›</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* => Profile documents section */}
          {profileDocs.length > 0 && (
            <section className="docs-section">
              <h2 className="docs-section-title">Profile Documents</h2>
              <ul className="docs-list">
                {profileDocs.map((doc, index) => (
                  <li
                    key={doc.public_id}
                    className="docs-card"
                    style={{ animationDelay: `${index * 80}ms` }}
                    onClick={() => handleCardClick(doc.public_id)}
                  >
                    <div className={`docs-card-bar ${sourceClass[doc.source] || ''}`} />

                    <div className="docs-card-body">
                      <div className="docs-card-top">
                        <div>
                          <p className="docs-card-type">{doc.document_type}</p>
                        </div>
                        <span className={`docs-card-badge ${sourceClass[doc.source] || ''}`}>
                          {sourceLabel[doc.source]}
                        </span>
                      </div>

                      <div className="docs-card-meta">
                        <span>
                          <img src={calendarIcon} alt="" className="docs-card-meta-icon" />
                          Uploaded {formatDate(doc.uploaded_at)}
                        </span>
                      </div>
                    </div>

                    <div className="docs-card-arrow">›</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Documents;
