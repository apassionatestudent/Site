import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../BackButton/BackButton.jsx';

import './tesdaEnrollmentDetail.css';

// icons
import loadingIcon   from "../../../assets/icons/loading.png";
import errorIcon     from "../../../assets/icons/warning.png";
import checkmarkIcon from "../../../assets/icons/checkmark.png";
import rejectedIcon  from "../../../assets/icons/rejected.png";

// => Maps each status to a CSS modifier class for color-coding
const statusClass = {
  'Pending':             'status--pending',
  'Approved':            'status--approved',
  'Needs Clarification': 'status--clarification',
  'Rejected':            'status--rejected',
  'Dropped':             'status--dropped',
  'Completed':           'status--completed',
  'Reserved':            'status--reserved',
};

// => Formats the fee_at_enrollment numeric value to Philippine Peso display
const formatFee = (amount) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

// => Formats ISO date string to readable date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

function TESDAEnrollmentDetail() {
  const { publicId } = useParams();
  const navigate     = useNavigate();

  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState(null);

  // => Fetch the single TESDA enrollment detail on mount using publicId from the URL
  useEffect(() => {
    if (!publicId) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/enrollment/${publicId}`, {
          credentials: 'include', // => sends the httpOnly JWT cookie
        });
        if (res.status === 404) throw new Error('Enrollment not found.');
        if (!res.ok) throw new Error('Failed to fetch enrollment details.');
        const data = await res.json();
        setDetail(data.enrollment);
      } catch (err) {
        setDetailError(err.message);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [publicId]);

  return (
    <div className="enroll-detail-page">

      {/*  Back button  */}
      <BackButton destination="Enrollment" onClick={() => navigate('/dashboard/enrollment')} />

      {detailLoading && (
        <div className="enroll-detail-empty">
          <img src={loadingIcon} alt="" className="enroll-detail-empty-icon" />
          <p>Loading enrollment details...</p>
        </div>
      )}

      {detailError && (
        <div className="enroll-detail-empty">
          <img src={errorIcon} alt="" className="enroll-detail-empty-icon" />
          <p>{detailError}</p>
        </div>
      )}

      {!detailLoading && !detailError && detail && (
        <div className="enroll-detail">
          <div className="enroll-detail-header">
            <div>
              <span className="enroll-detail-type-tag type--tesda">TESDA</span>
              <h2 className="enroll-detail-title">{detail.course_name}</h2>
              <p className="enroll-detail-sub">
                {detail.sector}
              </p>
            </div>
            <span className={`enroll-detail-badge ${statusClass[detail.status] || ''}`}>
              {detail.status}
            </span>
          </div>

          {/* => ENROLLMENT INFO */}
          <p className="enroll-detail-section-title">Enrollment Info</p>
          <div className="enroll-detail-grid">

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Branch</p>
              <p className="enroll-detail-value">{detail.branch_name ?? '-'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Date Submitted</p>
              <p className="enroll-detail-value">{formatDate(detail.submitted_at)}</p>
            </div>

            {/* => ULI - TESDA's Unique Learner Identifier, lives on tesda_enrollments */}
            {detail.uli ? (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">ULI</p>
                <p className="enroll-detail-value">{detail.uli}</p>
              </div>
            ) : (
              <div className="enroll-detail-card enroll-detail-card--muted">
                <p className="enroll-detail-label">ULI</p>
                <p className="enroll-detail-value enroll-detail-value--muted">Not yet provided</p>
              </div>
            )}

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Fee at Enrollment</p>
              <p className="enroll-detail-value">
                {/* => TESDA-Sponsored classes are paid by TESDA to 3A Prime directly -
                    => fee_at_enrollment still holds the course's list price, so it must
                    => be overridden at display time rather than trusted as-is           */}
                {detail.class_type === 'TESDA-Sponsored'
                  ? 'Free (TESDA-Sponsored)'
                  : formatFee(detail.fee_at_enrollment)}
              </p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Took NCAE / YP4SC</p>
              <p className="enroll-detail-value">{detail.ncae_taken ? 'Yes' : 'No'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">TESDA Scholar</p>
              <p className="enroll-detail-value">
                {detail.is_tesda_scholar
                  ? (detail.scholarship_type ?? 'Yes')
                  : 'No'}
              </p>
              {/* => other_scholarship: free-text detail typed when scholarship_type is "Others" */}
              {detail.is_tesda_scholar && detail.other_scholarship && (
                <p className="enroll-detail-subvalue">{detail.other_scholarship}</p>
              )}
            </div>

          </div>

          {/* => CLASS / BATCH - only 2 cards, so use the halves variant to
              => split the row evenly instead of the default 3-col grid */}
          <p className="enroll-detail-section-title">Class / Batch</p>
          <div className="enroll-detail-grid enroll-detail-grid--halves">

            {/* => 3 possible states: no start_date yet (Pending, fully muted),
                => start_date but no end_date (Ongoing, open-ended - end date
                => may still shift/extend), or both dates set (fixed range) */}
            {!detail.start_date ? (
              <div className="enroll-detail-card enroll-detail-card--muted">
                <p className="enroll-detail-label">Class Period</p>
                <p className="enroll-detail-value enroll-detail-value--muted">Not yet assigned</p>
              </div>
            ) : !detail.end_date ? (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">Class Period</p>
                <p className="enroll-detail-value">{formatDate(detail.start_date)} - Ongoing</p>
              </div>
            ) : (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">Class Period</p>
                <p className="enroll-detail-value">
                  {formatDate(detail.start_date)} - {formatDate(detail.end_date)}
                </p>
              </div>
            )}

            {/* => Groupchat link - only shown once the admin has added it to the class */}
            {detail.groupchat_link ? (
              <div className="enroll-detail-card enroll-detail-card--groupchat">
                <p className="enroll-detail-label">Class Groupchat</p>
                
                <a
                  href={detail.groupchat_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enroll-detail-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="ti ti-brand-messenger" /> Join Groupchat
                </a>
              </div>
            ) : (
              <div className="enroll-detail-card enroll-detail-card--muted">
                <p className="enroll-detail-label">Class Groupchat</p>
                <p className="enroll-detail-value enroll-detail-value--muted">Not yet available</p>
              </div>
            )}

          </div>

          {/* => Status-specific notice banners for the student */}
          {detail.status === 'Pending' && (
            <div className="enroll-notice enroll-notice--pending">
              <img src={loadingIcon} alt="" className="enroll-notice-icon" />
              Your enrollment is under review. We'll notify you once it's processed.
            </div>
          )}
          {detail.status === 'Approved' && (
            <div className="enroll-notice enroll-notice--approved">
              <img src={checkmarkIcon} alt="" className="enroll-notice-icon" />
              Your enrollment has been approved. Please coordinate with the branch for next steps.
            </div>
          )}
          {detail.status === 'Needs Clarification' && (
            <div className="enroll-notice enroll-notice--clarification">
              <img src={errorIcon} alt="" className="enroll-notice-icon" />
              The admin requires additional information. Please check your email or contact the branch.
            </div>
          )}
          {detail.status === 'Rejected' && (
            <div className="enroll-notice enroll-notice--rejected">
              <img src={rejectedIcon} alt="" className="enroll-notice-icon" />
              Your enrollment was not approved. Please contact the branch for details.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TESDAEnrollmentDetail;