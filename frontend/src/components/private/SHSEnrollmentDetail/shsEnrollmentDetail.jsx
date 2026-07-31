import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../BackButton/BackButton.jsx';

import './shsEnrollmentDetail.css';

// icons
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

          {/* => Admin's explanation for the current status, if one was left.
              => Shown regardless of status - a remark can accompany any
              => status change, not just Rejected/Needs Clarification, so
              => it's not folded into the status-specific banners below. */}
          {detail.external_remarks && (
            <div className="enroll-notice enroll-notice--remarks">
              <img src={informationIcon} alt="" className="enroll-notice-icon" />
              <p><strong>Note from the admin:</strong> {detail.external_remarks}</p>
            </div>
          )}

          {/* => Status-specific notice banners for the student - one banner
              => per status in the admin's STATUS_OPTIONS, so the student
              => always sees guidance no matter what status the admin sets.
              => Moved here (above Enrollment Info) so it's the first thing
              => seen after the admin's remarks, instead of being buried at
              => the bottom of the page below Emergency Contact. */}
          {detail.status === 'Pending' && (
            <div className="enroll-notice enroll-notice--pending">
              <img src={loadingIcon} alt="" className="enroll-notice-icon" />
              Your enrollment is under review. We'll notify you once it's processed.
            </div>
          )}
          {detail.status === 'Reviewed' && (
            <div className="enroll-notice enroll-notice--reviewed">
              <img src={informationIcon} alt="" className="enroll-notice-icon" />
              Your enrollment has been reviewed with no issues. Please submit physical photocopies of your documents along with the original copies for verification to complete your enrollment.
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
          <div className="enroll-detail-grid enroll-detail-grid--halves">

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

          {/* => CLUSTER CURRICULUM - a cluster is a fixed 2-year curriculum,
              => so this shows BOTH the Grade 11 and Grade 12 course the
              => student will take under their chosen cluster, resolved
              => server-side via shs_clusters -> shs_courses */}
          <p className="enroll-detail-section-title">
            Cluster Curriculum{detail.cluster_name ? ` – ${detail.cluster_name}` : ''}
          </p>

          {Array.isArray(detail.cluster_courses) && detail.cluster_courses.length > 0 ? (
            <div className="enroll-detail-grid enroll-detail-grid--halves">
              {detail.cluster_courses.map((course) => (
                <div key={course.course_id} className="enroll-detail-card enroll-detail-card--course">
                  <p className="enroll-detail-label">
                    {course.grade_level}
                    {/* => Course still shows in full for this student even if an
                        => admin deactivated it after enrollment - this badge is
                        => just a quiet heads-up, not a block on anything */}
                    {course.status === 'inactive' && (
                      <span className="enroll-detail-inactive-note"> · No longer offered</span>
                    )}
                  </p>
                  <p className="enroll-detail-value">{course.title}</p>
                  {course.description && (
                    <p className="enroll-detail-subvalue">{course.description}</p>
                  )}
                  {Array.isArray(course.job_opportunities) && course.job_opportunities.length > 0 && (
                    <div className="enroll-detail-tags">
                      {course.job_opportunities.map((job, i) => (
                        <span key={i} className="enroll-detail-tag">{job}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="enroll-detail-card enroll-detail-card--muted">
              <p className="enroll-detail-value enroll-detail-value--muted">
                Curriculum details not yet available for this cluster.
              </p>
            </div>
          )}

          {/* => CLASS / BATCH - shs_enrollments.class_id -> shs_classes is now
              => wired up in the backend union query, so this renders real data
              => once an admin assigns a class, and the muted placeholder until then */}
          <p className="enroll-detail-section-title">Class / Batch</p>
          <div className="enroll-detail-grid enroll-detail-grid--halves">

            {/* => 3 possible states: no start_date yet (Planned, fully muted),
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

        </div>
      )}
    </div>
  );
}

export default SHSEnrollmentDetail;