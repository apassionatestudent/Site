import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import './Enrollment.css';
import { apiFetch, RateLimitError } from '../../../utils/api.js';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

// icons
import loadingIcon    from "../../../assets/icons/loading.png";
import errorIcon      from "../../../assets/icons/warning.png";
import clipboardIcon  from "../../../assets/icons/clipboard.png";
import calendarIcon   from "../../../assets/icons/calendar.png";
import phpIcon        from "../../../assets/icons/php.png";

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

function Enrollment() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError,   setListError]   = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // => seconds remaining, null if not rate limited

  // => Wrapped in useCallback so RateLimitNotice can call this exact same
  // => function again once its countdown finishes, instead of duplicating
  // => the fetch logic in a separate "retry" function.
  const fetchEnrollments = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setRateLimitInfo(null);
    try {
      const data = await apiFetch('/api/enrollment/my-enrollments', {
        credentials: 'include', // => sends the httpOnly JWT cookie
      });
      setEnrollments(data.enrollments);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimitInfo(err.retryAfter);
      } else {
        setListError('Failed to fetch enrollments.');
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  // => Fetch the enrollment list on mount
  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleCardClick = (enrollment) => {
    // => Route to the type-specific detail page - TESDA and SHS render
    // => entirely separate components (tesdaEnrollmentDetail / shsEnrollmentDetail)
    const path = enrollment.enrollment_type === 'SHS'
      ? `/dashboard/enrollment/shs/${enrollment.public_id}`
      : `/dashboard/enrollment/tesda/${enrollment.public_id}`;
    navigate(path);
  };

  return (
    <div className="enroll-page">
      <div className="enroll-header">
        {/* => Pluralizes only once the student has more than one enrollment - 
            stays "Enrollment" for zero or exactly one */}
        <h1 className="enroll-title">
          {enrollments.length > 1 ? 'Enrollments' : 'Enrollment'}
        </h1>
        <p className="enroll-subtitle">
          Click on any enrollment to view its full details.
        </p>
      </div>

      {rateLimitInfo && (
        <div className="enroll-empty">
          <img src={errorIcon} alt="" className="enroll-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchEnrollments} />
        </div>
      )}

      {!rateLimitInfo && listLoading && (
        <div className="enroll-empty">
          <img src={loadingIcon} alt="loading..." className="enroll-empty-icon" />
          <p>Loading your enrollments...</p>
        </div>
      )}

      {!rateLimitInfo && listError && (
        <div className="enroll-empty">
          <img src={errorIcon} alt="" className="enroll-empty-icon" />
          <p>{listError}</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && enrollments.length === 0 && (
        <div className="enroll-empty">
          <img src={clipboardIcon} alt="" className="enroll-empty-icon" />
          <p>You have no enrollments yet.</p>
        </div>
      )}

      {!rateLimitInfo && !listLoading && !listError && enrollments.length > 0 && (
        <ul className="enroll-list">
          {enrollments.map((enrollment, index) => (
            <li
              key={enrollment.public_id}
              className="enroll-card"
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => handleCardClick(enrollment)}
            >
              {/* => Left accent bar colored by status */}
              <div className={`enroll-card-bar ${statusClass[enrollment.status] || ''}`} />

              <div className="enroll-card-body">
                <div className="enroll-card-top">
                  <div>
                    {/* => Title/subtitle branch on enrollment_type since TESDA and SHS
                        => don't share a "course" concept - SHS uses track/cluster instead */}
                    {enrollment.enrollment_type === 'SHS' ? (
                      <>
                        <p className="enroll-card-course">
                          {enrollment.track}
                          {enrollment.cluster ? ` – ${enrollment.cluster}` : ''}
                        </p>
                        <p className="enroll-card-sector">
                          {enrollment.last_school_attended ?? '-'}
                          {enrollment.school_year_completed ? ` • SY ${enrollment.school_year_completed}` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="enroll-card-course">{enrollment.course_name}</p>
                        <p className="enroll-card-sector">
                          {enrollment.sector}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="enroll-card-top-right">
                    {/* => Enrollment type tag: TESDA or SHS - determined by enrollment_type field */}
                    <span className={`enroll-card-type-tag type--${enrollment.enrollment_type?.toLowerCase() ?? 'tesda'}`}>
                      {enrollment.enrollment_type ?? 'TESDA'}
                    </span>
                    <span className={`enroll-card-badge ${statusClass[enrollment.status] || ''}`}>
                      {enrollment.status}
                    </span>
                  </div>
                </div>

                <div className="enroll-card-meta">
                  <span>
                    <img src={calendarIcon} alt="" className="enroll-card-meta-icon" />
                    Submitted {formatDate(enrollment.submitted_at)}
                  </span>
                  {/* => Fee only applies to TESDA - SHS is DepEd/public, no fee_at_enrollment column exists */}
                  {enrollment.enrollment_type !== 'SHS' && (
                    <span>
                      <img src={phpIcon} alt="" className="enroll-card-meta-icon" />
                      {enrollment.class_type === 'TESDA-Sponsored'
                        ? 'Free (TESDA-Sponsored)'
                        : formatFee(enrollment.fee_at_enrollment)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Enrollment;