import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../BackButton/BackButton.jsx';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

import './tesdaEnrollmentDetail.css';
import axiosStudent from '../../../utils/axiosStudent.js';
import LoadingState from '../../private/LoadingState/loadingState.jsx';

// icons
// => loadingIcon still used below for the Pending/Reserved notice banners
import loadingIcon   from "../../../assets/icons/loading.png";
import errorIcon     from "../../../assets/icons/warning.png";
import informationIcon from "../../../assets/icons/information.png";
import checkmarkIcon from "../../../assets/icons/checkmark.png";
import rejectedIcon  from "../../../assets/icons/rejected.png";
import droppedIcon   from "../../../assets/icons/dropped.png"; 
import assessmentIcon from "../../../assets/icons/assessment.png"; 

// => Maps each status to a CSS modifier class for color-coding
// => Matches the ALLOWED_STATUSES set used on the admin side exactly -
//    'Completed' renamed to 'For Assessment', 'Reviewed' and
//    'Failed Assessment' added
const statusClass = {
  'Pending':             'status--pending',
  'Reviewed':            'status--reviewed', // => new: reviewed, no issues, awaiting physical docs
  'Approved':            'status--approved',
  'Needs Clarification': 'status--clarification',
  'Rejected':            'status--rejected',
  'Dropped':             'status--dropped',
  'For Assessment':      'status--for-assessment', // => renamed from 'Completed'
  'Failed Assessment':   'status--failed-assessment', // => new: did not pass assessment
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // => seconds remaining, null if not rate limited

  // => Wrapped in useCallback so RateLimitNotice can call this exact same
  // => function again once its countdown finishes, same pattern as Enrollment.jsx
  const fetchDetail = useCallback(async () => {
    if (!publicId) return;
    setDetailLoading(true);
    setDetailError(null);
    setRateLimitInfo(null);
    try {
      // => axiosStudent attaches the httpOnly JWT cookie and CSRF token
      // => automatically, and its 401 interceptor handles expired sessions
      const response = await axiosStudent.get(`/enrollment/${publicId}`);
      setDetail(response.data.enrollment);
    } catch (err) {
      if (err.response?.status === 429) {
        // => Backend sends { error, message, retryAfter } in the JSON body
        const retryAfter = err.response.data?.retryAfter || 60;
        setRateLimitInfo(retryAfter);
      } else if (err.response?.status === 404) {
        setDetailError('Enrollment not found.');
      } else {
        setDetailError('Failed to fetch enrollment details.');
      }
    } finally {
      setDetailLoading(false);
    }
  }, [publicId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  return (
    <div className="enroll-detail-page">

      {/*  Back button  */}
      <BackButton destination="Enrollment" onClick={() => navigate('/dashboard/enrollment')} />

      {rateLimitInfo && (
        <div className="enroll-detail-empty">
          <img src={errorIcon} alt="" className="enroll-detail-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchDetail} />
        </div>
      )}

      {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
      {!rateLimitInfo && detailLoading && <LoadingState message="Loading enrollment details..." />}

      {!rateLimitInfo && detailError && (
        <div className="enroll-detail-empty">
          <img src={errorIcon} alt="" className="enroll-detail-empty-icon" />
          <p>{detailError}</p>
        </div>
      )}

      {!rateLimitInfo && !detailLoading && !detailError && detail && (
        <div className="enroll-detail">
          <div className="enroll-detail-header">
            <div>
              <span className="enroll-detail-type-tag type--tesda">TESDA</span>
              <h2 className="enroll-detail-title">
                {detail.course_name}
                {/* => appends the NC level in parenthesis only if the course has one */}
                {detail.nc_level ? ` (${detail.nc_level})` : ''}
              </h2>
              <p className="enroll-detail-sub">
                {detail.sector}
              </p>
            </div>
            <span className={`enroll-detail-badge ${statusClass[detail.status] || ''}`}>
              {detail.status}
            </span>
          </div>

          {/* => Admin's explanation for the current status, if one was left.
              => Shown regardless of status - a remark can accompany any
              => status change, not just Rejected/Needs Clarification, so
              => it's not folded into the status-specific banners below. */}
          {detail.external_remarks && (
            <div className="enroll-notice enroll-notice--remarks">
              <img src={informationIcon} alt="Information Icon" className="enroll-notice-icon" />
              <p><strong>Note from the admin:</strong> {detail.external_remarks}</p>
            </div>
          )}

          {/* => Status-specific notice banners for the student - one banner
              => per status in the admin's STATUS_OPTIONS, so the student
              => always sees guidance no matter what status the admin sets.
              => Moved here (above Enrollment Info) so it's the first thing
              => seen after the admin's remarks, instead of being buried at
              => the bottom of the page below Class/Batch. */}
          {detail.status === 'Pending' && (
            <div className="enroll-notice enroll-notice--pending">
              <img src={loadingIcon} alt="" className="enroll-notice-icon" />
              Your enrollment is under review. We'll notify you once it's processed.
            </div>
          )}
          {detail.status === 'Reviewed' && (
            <div className="enroll-notice enroll-notice--reviewed">
              <img src={informationIcon} alt="" className="enroll-notice-icon" />
              {/* => TESDA-specific wording includes the reservation fee reminder,
                  => matching the admin side's Reviewed description for TESDA */}
              Your enrollment has been reviewed with no issues. Please submit physical photocopies of your documents along with the original copies for verification, and settle your reservation fee if applicable, to complete your enrollment.
            </div>
          )}
          {detail.status === 'Approved' && (
            <div className="enroll-notice enroll-notice--approved">
              <img src={checkmarkIcon} alt="" className="enroll-notice-icon" />
              Your enrollment has been approved. Please check the Classes and Groupchat link for further details.
            </div>
          )}
          {detail.status === 'Needs Clarification' && (
            <div className="enroll-notice enroll-notice--clarification">
              <img src={errorIcon} alt="" className="enroll-notice-icon" />
              The admin requires additional information. Please check the email/remarks for further details. You can also contact us during business hours or submit a support ticket which will be responded within business hours.
            </div>
          )}
          {detail.status === 'Rejected' && (
            <div className="enroll-notice enroll-notice--rejected">
              <img src={rejectedIcon} alt="" className="enroll-notice-icon" />
              Your enrollment was not approved. Please contact the training center for details.
            </div>
          )}
          {detail.status === 'Dropped' && (
            <div className="enroll-notice enroll-notice--dropped">
              <img src={droppedIcon} alt="" className="enroll-notice-icon" />
              You have been marked as dropped from this program. Please contact the training center if you believe this is a mistake.
            </div>
          )}
          {detail.status === 'For Assessment' && (
            <div className="enroll-notice enroll-notice--for-assessment">
              <img src={assessmentIcon} alt="" className="enroll-notice-icon" />
              Your training is complete. You have been scheduled for competency assessment. Please coordinate with the training center for the schedule and requirements.
            </div>
          )}
          {detail.status === 'Failed Assessment' && (
            <div className="enroll-notice enroll-notice--failed-assessment">
              <img src={rejectedIcon} alt="" className="enroll-notice-icon" />
              You did not pass the competency assessment. Please contact the training center to discuss your next steps.
            </div>
          )}
          {detail.status === 'Reserved' && (
            <div className="enroll-notice enroll-notice--reserved">
              <img src={loadingIcon} alt="" className="enroll-notice-icon" />
              There is no open class section available yet. Your enrollment will be processed once a section becomes available.
            </div>
          )}

          {/* => ENROLLMENT INFO */}
          <p className="enroll-detail-section-title">Enrollment Info</p>
          <div className="enroll-detail-grid">

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

          {/* => COURSE DETAILS - pulled from tesda_courses via course_id,
              => shows the accreditation info and job outlook for the exact
              => course the student is enrolled in, not just its title */}
          <p className="enroll-detail-section-title">Course Details</p>

          {detail.course_description && (
            <p className="enroll-detail-course-desc">{detail.course_description}</p>
          )}

          <div className="enroll-detail-grid">
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Accreditation No.</p>
              <p className="enroll-detail-value">{detail.accreditation_no ?? '-'}</p>
            </div>
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Accredited / Expires</p>
              <p className="enroll-detail-value">
                {formatDate(detail.date_accredited)} - {formatDate(detail.expiration_date)}
              </p>
            </div>
            <div className="enroll-detail-card">
              <p className="enroll-detail-label">Training Hours</p>
              <p className="enroll-detail-value">{detail.course_hours ? `${detail.course_hours} hrs` : '-'}</p>
            </div>
          </div>

          {/* => Potential Job Opportunities removed - not directly relevant
              => to the student's own enrollment, and this info already
              => lives on the public course pages */}

          {/* => CLASS / BATCH - only 2 cards, so use the halves variant to
              => split the row evenly instead of the default 3-col grid */}
          <p className="enroll-detail-section-title">Batch</p>
          <div className="enroll-detail-grid enroll-detail-grid--halves">

            {/* => 3 possible states: no start_date yet (Pending, fully muted),
                => start_date but no end_date (Ongoing, open-ended - end date
                => may still shift/extend), or both dates set (fixed range) */}
            {!detail.start_date ? (
              <div className="enroll-detail-card enroll-detail-card--muted">
                <p className="enroll-detail-label">Batch Period</p>
                {/* => Falls back to "Class Period" if batch_name hasn't been set yet, so the label never renders blank */}
                <p className="enroll-detail-value enroll-detail-value--muted">
                  {detail.batch_name || 'Class Period'} (Not yet assigned)
                </p>
              </div>
            ) : !detail.end_date ? (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">Batch Period</p>
                <p className="enroll-detail-value">
                  {detail.batch_name ? `${detail.batch_name} ` : ''}({formatDate(detail.start_date)} - Ongoing)
                </p>
              </div>
            ) : (
              <div className="enroll-detail-card">
                <p className="enroll-detail-label">Batch Period</p>
                <p className="enroll-detail-value">
                  {detail.batch_name ? `${detail.batch_name} ` : ''}({formatDate(detail.start_date)} - {formatDate(detail.end_date)})
                </p>
              </div>
            )}

            {/* => Groupchat link - only shown once the admin has added it to the class */}
            {detail.groupchat_link ? (
              <div className="enroll-detail-card enroll-detail-card--groupchat">
                <p className="enroll-detail-label">Batch Groupchat</p>
                
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
                <p className="enroll-detail-label">Batch Groupchat</p>
                <p className="enroll-detail-value enroll-detail-value--muted">Not yet available</p>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}

export default TESDAEnrollmentDetail;