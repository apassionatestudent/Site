import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../BackButton/BackButton.jsx';

import './shsEnrollmentDetail.css';

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

// => Formats ISO date string to readable date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

function SHSEnrollmentDetail() {
  const { publicId } = useParams();
  const navigate     = useNavigate();

  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState(null);

  // => Fetch the single SHS enrollment detail on mount using publicId from the URL
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
              <span className="enroll-detail-type-tag type--shs">SHS</span>
              <h2 className="enroll-detail-title">
                {detail.track}
                {detail.cluster ? ` – ${detail.cluster}` : ''}
              </h2>
              <p className="enroll-detail-sub">
                {detail.last_school_attended ?? '-'}
                {detail.school_year_completed ? ` • SY ${detail.school_year_completed}` : ''}
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

            {/* => LRN - DepEd's Learner Reference Number, lives on shs_enrollments */}
            {detail.lrn ? (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">LRN</p>
                <p className="enroll-detail-value">{detail.lrn}</p>
              </div>
            ) : (
              <div className="enroll-detail-card enroll-detail-card--muted">
                <p className="enroll-detail-label">LRN</p>
                <p className="enroll-detail-value enroll-detail-value--muted">Not yet provided</p>
              </div>
            )}

          </div>

          {/* => ACADEMIC BACKGROUND */}
          <p className="enroll-detail-section-title">Academic Background</p>
          <div className="enroll-detail-grid">

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Last School Attended</p>
              <p className="enroll-detail-value">{detail.last_school_attended ?? '-'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Grade Level Completed</p>
              <p className="enroll-detail-value">{detail.grade_level_completed ?? '-'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">School Year Completed</p>
              <p className="enroll-detail-value">{detail.school_year_completed ?? '-'}</p>
            </div>

          </div>

          {/* => CLASS / BATCH - shs_enrollments has no class_id link to shs_classes yet,
              => so this always renders the muted placeholder state until that FK + admin
              => UI for creating SHS sections exist */}
          <p className="enroll-detail-section-title">Class / Batch</p>
          <div className="enroll-detail-grid">

            <div className="enroll-detail-card enroll-detail-card--muted">
              <p className="enroll-detail-label">Class Period</p>
              <p className="enroll-detail-value enroll-detail-value--muted">Not yet assigned</p>
            </div>

            <div className="enroll-detail-card enroll-detail-card--muted">
              <p className="enroll-detail-label">Class Groupchat</p>
              <p className="enroll-detail-value enroll-detail-value--muted">Not yet available</p>
            </div>

          </div>

          {/* => EMERGENCY CONTACT */}
          <p className="enroll-detail-section-title">Emergency Contact</p>
          <div className="enroll-detail-grid">
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Name</p>
              <p className="enroll-detail-value">{detail.emergency_name ?? '-'}</p>
            </div>
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Relationship</p>
              <p className="enroll-detail-value">{detail.emergency_relationship ?? '-'}</p>
            </div>
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Contact No.</p>
              <p className="enroll-detail-value">{detail.emergency_contact_no ?? '-'}</p>
            </div>
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

export default SHSEnrollmentDetail;