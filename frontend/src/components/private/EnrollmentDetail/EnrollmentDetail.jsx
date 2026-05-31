import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import './EnrollmentDetail.css';

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

function EnrollmentDetail() {
  const { publicId } = useParams();
  const navigate     = useNavigate();

  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState(null);

  // => Fetch the single enrollment detail on mount using publicId from the URL
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

  const handleBack = () => {
    navigate('/dashboard/enrollment');
  };

  return (
    <div className="enroll-detail-page">
      <button className="enroll-back" onClick={handleBack}>
        ← Back to Enrollments
      </button>

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
              <h2 className="enroll-detail-title">{detail.course_name}</h2>
              <p className="enroll-detail-sub">
                {detail.sector} · {detail.assessment_type}
              </p>
            </div>
            <span className={`enroll-detail-badge ${statusClass[detail.status] || ''}`}>
              {detail.status}
            </span>
          </div>

          <div className="enroll-detail-grid">

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Branch</p>
              <p className="enroll-detail-value">{detail.branch_name ?? '-'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Class Period</p>
              <p className="enroll-detail-value">
                {detail.start_date
                  ? `${formatDate(detail.start_date)} - ${formatDate(detail.end_date)}`
                  : '-'}
              </p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Fee at Enrollment</p>
              <p className="enroll-detail-value">{formatFee(detail.fee_at_enrollment)}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Date Submitted</p>
              <p className="enroll-detail-value">{formatDate(detail.submitted_at)}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">SHS Graduate</p>
              <p className="enroll-detail-value">{detail.is_shs ? 'Yes' : 'No'}</p>
            </div>

            <div className="enroll-detail-card">
              <p className="enroll-detail-label">TESDA Scholar</p>
              <p className="enroll-detail-value">{detail.is_tesda_scholar ? 'Yes' : 'No'}</p>
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

export default EnrollmentDetail;