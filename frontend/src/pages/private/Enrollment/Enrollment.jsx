import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import './Enrollment.css';
import axiosStudent from '../../../utils/axiosStudent.js';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';

// icons
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
      // => axiosStudent attaches the httpOnly JWT cookie and CSRF token
      // => automatically, and its 401 interceptor handles expired sessions
      const response = await axiosStudent.get('/enrollment/my-enrollments');
      setEnrollments(response.data.enrollments);
    } catch (err) {
      if (err.response?.status === 429) {
        // => Backend sends { error, message, retryAfter } in the JSON body,
        // => same shape apiFetch's RateLimitError used to read from
        const retryAfter = err.response.data?.retryAfter || 60;
        setRateLimitInfo(retryAfter);
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

      {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
      {!rateLimitInfo && listLoading && (
        <LoadingState message="Loading your enrollment/s..." />
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
                        {/* => track column no longer exists on shs_enrollments,
                            => cluster_name (resolved via shs_clusters) is now
                            => the primary title instead, same fix as the detail page */}
                        <p className="enroll-card-course">
                          {enrollment.cluster_name || enrollment.cluster || '-'}
                        </p>
                        <p className="enroll-card-sector">
                          {enrollment.last_school_attended ?? '-'}
                          {enrollment.school_year_completed ? ` • SY ${enrollment.school_year_completed}` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="enroll-card-course">
                          {enrollment.course_name}
                          {/* => appends the NC level in parenthesis only if one exists for this course */}
                          {enrollment.nc_level ? ` (${enrollment.nc_level})` : ''}
                        </p>
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