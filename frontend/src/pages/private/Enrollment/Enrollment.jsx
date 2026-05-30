import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './Enrollment.css';

// icons
import loadingIcon    from "../../../assets/icons/loading.png";
import errorIcon      from "../../../assets/icons/warning.png";
import clipboardIcon  from "../../../assets/icons/clipboard.png";
import calendarIcon   from "../../../assets/icons/calendar.png";
import buildingIcon   from "../../../assets/icons/building.png";
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

  // => Fetch the enrollment list on mount
  useEffect(() => {
    const fetchEnrollments = async () => {
      setListLoading(true);
      setListError(null);
      try {
        const res = await fetch('/api/enrollment/my-enrollments', {
          credentials: 'include', // => sends the httpOnly JWT cookie
        });
        if (!res.ok) throw new Error('Failed to fetch enrollments.');
        const data = await res.json();
        setEnrollments(data.enrollments);
      } catch (err) {
        setListError(err.message);
      } finally {
        setListLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  const handleCardClick = (enrollmentPublicId) => {
    // => Navigate to the detail page using the enrollment's public UUID
    navigate(`/dashboard/enrollment/${enrollmentPublicId}`);
  };

  return (
    <div className="enroll-page">
      <div className="enroll-header">
        <h1 className="enroll-title">Enrollment</h1>
        <p className="enroll-subtitle">
          Click on any enrollment to view its full details.
        </p>
      </div>

      {listLoading && (
        <div className="enroll-empty">
          <img src={loadingIcon} alt="loading..." className="enroll-empty-icon" />
          <p>Loading your enrollments...</p>
        </div>
      )}

      {listError && (
        <div className="enroll-empty">
          <img src={errorIcon} alt="" className="enroll-empty-icon" />
          <p>{listError}</p>
        </div>
      )}

      {!listLoading && !listError && enrollments.length === 0 && (
        <div className="enroll-empty">
          <img src={clipboardIcon} alt="" className="enroll-empty-icon" />
          <p>You have no enrollments yet.</p>
        </div>
      )}

      {!listLoading && !listError && enrollments.length > 0 && (
        <ul className="enroll-list">
          {enrollments.map((enrollment, index) => (
            <li
              key={enrollment.public_id}
              className="enroll-card"
              style={{ animationDelay: `${index * 80}ms` }}
              onClick={() => handleCardClick(enrollment.public_id)}
            >
              {/* => Left accent bar colored by status */}
              <div className={`enroll-card-bar ${statusClass[enrollment.status] || ''}`} />

              <div className="enroll-card-body">
                <div className="enroll-card-top">
                  <div>
                    <p className="enroll-card-course">{enrollment.course_name}</p>
                    <p className="enroll-card-sector">
                      {enrollment.sector} · {enrollment.assessment_type}
                    </p>
                  </div>
                  <span className={`enroll-card-badge ${statusClass[enrollment.status] || ''}`}>
                    {enrollment.status}
                  </span>
                </div>

                <div className="enroll-card-meta">
                  <span>
                    <img src={calendarIcon} alt="" className="enroll-card-meta-icon" />
                    Submitted {formatDate(enrollment.submitted_at)}
                  </span>
                  <span>
                    <img src={buildingIcon} alt="" className="enroll-card-meta-icon" />
                    {enrollment.branch_name ?? '-'}
                  </span>
                  <span>
                    <img src={phpIcon} alt="" className="enroll-card-meta-icon" />
                    {formatFee(enrollment.fee_at_enrollment)}
                  </span>
                </div>
              </div>

              <div className="enroll-card-arrow">›</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Enrollment;