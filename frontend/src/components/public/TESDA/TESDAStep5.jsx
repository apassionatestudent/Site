import React, { useState, useEffect, useCallback } from 'react';
import './TESDAStep5.css';
import Info from '../../Info.jsx';

// => Base documents required for ALL TESDA courses
const BASE_REQUIREMENTS = [
  {
    id: 'birthCert',
    label: 'NSO / PSA Birth Certificate',
    description: 'Original or certified true copy from PSA.',
    content: 'Required for all TESDA enrollees to verify identity and age.',
  },
  {
    id: 'schoolDoc',
    label: 'Form 137, TOR, or Diploma',
    description: 'Latest school records or diploma.',
    content: "Form 137 (Report Card) or Transcript of Records (TOR) from your most recent school. A High School or College Diploma is also accepted.",
  },
  {
    id: 'validId',
    label: 'Valid Government-Issued ID',
    description: 'Any primary government-issued ID.',
    content: "Accepted IDs: Passport, Driver's License, PhilSys National ID, SSS/GSIS ID, Voter's ID, or PRC ID.",
  },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_MB = 5;

const TESDAStep5 = ({
  data, onChange,
  files, onFileChange,
  scholarData, onScholarChange,
  privacyData, onPrivacyChange,
  onBack, onSubmit,           // => onSubmit replaces onNext since this is now the last step
}) => {

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // => Additional course-specific requirements fetched from DB
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // => Tracks selected course object for displaying the fee
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [showErrors, setShowErrors] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
  const [showFileBanner, setShowFileBanner] = useState(false);

  // => Scholarship field-level errors
  const [scholarErrors, setScholarErrors] = useState({
    isScholar: false,
    scholarshipType: false,
    otherScholarship: false,
  });

  // => Privacy consent error
  const [privacyErrors, setPrivacyErrors] = useState({
    agreed: false,
  });

  // => Submission loading state (was in Step 7)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // => Field-level highlights for selects
  const [fieldErrors, setFieldErrors] = useState({
    branch: false,
    course: false,
    courseClass: false,
  });

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => Fetch all active branches on mount
  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(d => setBranches(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch branches:', err))
      .finally(() => setBranchesLoading(false));
  }, []);

  // => Fetch courses when branch changes
  useEffect(() => {
    if (!data.branch) {
      setCourses([]);
      setClasses([]);
      return;
    }
    setCoursesLoading(true);
    fetch(`/api/courses?branch_id=${data.branch}`)
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch courses:', err))
      .finally(() => setCoursesLoading(false));
  }, [data.branch]);

  // => Fetch classes when course + branch are both selected
  useEffect(() => {
    if (!data.course || !data.branch) {
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    fetch(`/api/classes?course_id=${data.course}&branch_id=${data.branch}`)
      .then(r => r.json())
      .then(d => setClasses(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch classes:', err))
      .finally(() => setClassesLoading(false));
  }, [data.course, data.branch]);

  // => Fetch course-specific additional document requirements
  useEffect(() => {
    if (!data.course) {
      setAdditionalDocs([]);
      return;
    }
    setLoadingDocs(true);
    fetch(`/api/courses/${data.course}/requirements`)
      .then(r => r.json())
      .then(d => setAdditionalDocs(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch course requirements:', err))
      .finally(() => setLoadingDocs(false));
  }, [data.course]);

  // => All requirements = base docs + course-specific additional docs
  const allRequirements = [
    ...BASE_REQUIREMENTS,
    ...additionalDocs.map(doc => ({
      id: `additional_${doc.requirement_id}`,
      label: doc.label,
      description: doc.description,
      content: doc.content || '',
    })),
  ];

  // => Validates a single uploaded file
  const validateFile = (file) => {
    if (!file) return 'This document is required.';
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG and PNG files are allowed.';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File size must be less than ${MAX_SIZE_MB}MB.`;
    return null;
  };

  // => Handle file selection - delegates storage up to Enroll.jsx via onFileChange
  const handleFileChange = useCallback((e, fieldId) => {
    const file = e.target.files[0];
    onFileChange(fieldId, file || null);
    // => Validate inline so error clears as soon as user picks a valid file
    const error = validateFile(file);
    setFileErrors(prev => ({ ...prev, [fieldId]: error }));
  }, [onFileChange]);

  // => Validates all selects + all file uploads together, scholarship, and data privacy notice
  const validate = () => {
    if (!data.branch) return 'missing';
    if (!data.course) return 'missing';
    if (!data.courseClass) return 'missing';
    for (const { id } of allRequirements) {
      if (validateFile(files[id])) return 'missing';
    }
    // => Scholarship validation
    if (!scholarData.isScholar) return 'missing';
    if (scholarData.isScholar === 'yes' && !scholarData.scholarshipType) return 'missing';
    if (scholarData.scholarshipType === 'Others' && !scholarData.otherScholarship.trim()) return 'missing';
    // => Privacy consent
    if (!privacyData.agreed) return 'missing';
    return 'valid';
  };

  const handleSubmit = async () => {
    // => Highlight empty selects
    setFieldErrors({
      branch: !data.branch,
      course: !data.course,
      courseClass: !data.courseClass,
    });

    // => Validate files
    const newFileErrors = {};
    allRequirements.forEach(({ id }) => {
      const error = validateFile(files[id]);
      if (error) newFileErrors[id] = error;
    });
    setFileErrors(newFileErrors);

    // => Scholarship errors
    setScholarErrors({
      isScholar: !scholarData.isScholar,
      scholarshipType: scholarData.isScholar === 'yes' && !scholarData.scholarshipType,
      otherScholarship: scholarData.scholarshipType === 'Others' && !scholarData.otherScholarship.trim(),
    });

    // => Privacy error
    setPrivacyErrors({ agreed: !privacyData.agreed });

    if (validate() !== 'valid') {
      setShowErrors(true);
      setShowFileBanner(Object.keys(newFileErrors).length > 0);
      return;
    }

    // => All valid - submit
    setFieldErrors({ branch: false, course: false, courseClass: false });
    setFileErrors({});
    setScholarErrors({ isScholar: false, scholarshipType: false, otherScholarship: false });
    setPrivacyErrors({ agreed: false });
    setShowErrors(false);
    setShowFileBanner(false);

    setIsSubmitting(true);
    try {
      await onSubmit?.();
    } catch (err) {
      console.error('TESDA enrollment submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ts5-wrap">

      {/* ── Section: Course Selection ── */}
      <div className="ts5-section-title">Course & Schedule</div>

      {/* => Branch + Course + Class in one row */}
      <div className="ts5-grid ts5-g3">

        {/* => Branch */}
        <div className="ts5-field-group">
          <label className="ts5-label">
            Branch <span className="ts5-req">*</span>
          </label>
          <select
            className={`ts5-select ${fieldErrors.branch ? 'ts5-select--error' : ''}`}
            value={data.branch}
            onChange={(e) => {
              onChange('branch', e.target.value);
              // => Reset downstream fields when branch changes
              onChange('course', '');
              onChange('courseClass', '');
              onChange('courseFee', '');
              setSelectedCourse(null);
              setCourses([]);
              setClasses([]);
              clearError('branch');
            }}
            disabled={branchesLoading}
          >
            <option value="">
              {branchesLoading ? 'Loading...' : 'Select a Branch'}
            </option>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
          </select>
        </div>

        {/* => Course */}
        <div className="ts5-field-group">
          <label className="ts5-label">
            Course / Qualification <span className="ts5-req">*</span>
          </label>
          <select
            className={`ts5-select ${fieldErrors.course ? 'ts5-select--error' : ''}`}
            value={data.course}
            onChange={(e) => {
              const courseId = e.target.value;
              onChange('course', courseId);
              // => Reset class when course changes
              onChange('courseClass', '');
              setClasses([]);
              // => Find and store fee from the loaded courses list
              const found = courses.find(c => String(c.course_id) === String(courseId));
              setSelectedCourse(found || null);
              onChange('courseFee', found ? found.amount : '');
              clearError('course');
            }}
            disabled={!data.branch || coursesLoading}
          >
            <option value="">
              {!data.branch
                ? '— Select Branch first —'
                : coursesLoading
                ? 'Loading...'
                : 'Select a Course'}
            </option>
            {courses.map(c => (
              <option key={c.course_id} value={c.course_id}>
                {c.title}
              </option>
            ))}
          </select>
          {/* => Show fee below the course dropdown once selected */}
          {selectedCourse && (
            <span className="ts5-fee">
              Fee: <strong>₱{Number(selectedCourse.amount).toLocaleString('en-PH')}</strong>
            </span>
          )}
        </div>

        {/* => Class / Schedule */}
        <div className="ts5-field-group">
          <label className="ts5-label">
            Class / Schedule <span className="ts5-req">*</span>
          </label>
          <select
            className={`ts5-select ${fieldErrors.courseClass ? 'ts5-select--error' : ''}`}
            value={data.courseClass}
            onChange={(e) => {
              onChange('courseClass', e.target.value);
              clearError('courseClass');
            }}
            disabled={!data.course || classesLoading}
          >
            <option value="">
              {!data.course
                ? '— Select Course first —'
                : classesLoading
                ? 'Loading...'
                : 'Select a Class'}
            </option>

            {/* => Reserve option shown only when no classes are available */}
            {!classesLoading && data.course && classes.length === 0 && (
              <option value="reserve">Reserve a Slot</option>
            )}

            {classes.map(cl => (
              <option key={cl.class_id} value={cl.class_id}>
                {new Date(cl.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' → '}
                {new Date(cl.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {cl.remaining_slots} slot{cl.remaining_slots !== 1 ? 's' : ''} left
              </option>
            ))}
          </select>

          {/* => Reserve hint below class dropdown */}
          {!classesLoading && data.course && classes.length === 0 && (
            <span className="ts5-hint">
              No classes available. Select <strong>Reserve a Slot</strong> to
              be notified when one opens.
            </span>
          )}
        </div>

      </div>

      {/* ── Section: Upload Requirements ── */}
      <div className="ts5-section-title" style={{ marginTop: '1.8rem' }}>
        Upload Requirements
      </div>
      <p className="ts5-upload-subtitle">
        Please upload clear, legible scans or photos.
        Only JPG and PNG files are accepted (max {MAX_SIZE_MB}MB each).
      </p>

      {/* => Loading state for additional docs */}
      {loadingDocs && (
        <p className="ts5-loading">
          <i className="ti ti-loader-2 ts5-spinner" /> Loading course requirements...
        </p>
      )}

      {/* => 2-column upload grid */}
      <div className="ts5-uploads">
        {allRequirements.map(({ id, label, description, content }) => (
          <div key={id} className="ts5-upload-group">

            <label className="ts5-upload-label">
              <span className="ts5-label-row">
                {label}
                <span className="ts5-req">*</span>
                {content && <Info content={content} />}
              </span>
            </label>

            <p className="ts5-upload-desc">{description}</p>

            <div className="ts5-file-wrapper">
              <input
                type="file"
                id={id}
                className="ts5-file-input"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => handleFileChange(e, id)}
              />
              <label
                htmlFor={id}
                className={`ts5-file-label ${files[id] ? 'has-file' : ''} ${fileErrors[id] ? 'ts5-file-label--error' : ''}`}
              >
                {files[id] ? (
                  <>
                    <i className="ts5-file-icon ti ti-check" />
                    <span className="ts5-file-name">{files[id].name}</span>
                  </>
                ) : (
                  <>
                    <i className="ts5-file-icon ti ti-upload" />
                    <span>Choose file</span>
                  </>
                )}
              </label>
            </div>

            {fileErrors[id] && (
              <span className="ts5-file-error">{fileErrors[id]}</span>
            )}

          </div>
        ))}
      </div>

      {/* ── Section: Scholarship Package ── */}
      <div className="ts5-section-title" style={{ marginTop: '1.8rem' }}>
        Scholarship Package
      </div>

      {/* => Scholar Yes/No + Type on same line */}
      <div className="ts5-scholar-row">

        {/* => Yes/No radio */}
        <div className="ts5-field-group ts5-field-group--inline">
          <label className="ts5-label">
            Are you a TESDA Scholar? <span className="ts5-req">*</span>
          </label>
          <div className={`ts5-radio-group ${scholarErrors.isScholar ? 'ts5-radio--error' : ''}`}>
            {['yes', 'no'].map(opt => (
              <label key={opt} className="ts5-radio-label">
                <input
                  type="radio"
                  name="isScholar"
                  value={opt}
                  checked={scholarData.isScholar === opt}
                  onChange={(e) => {
                    onScholarChange('isScholar', e.target.value);
                    // => Clear scholarship fields when switching to No
                    if (e.target.value === 'no') {
                      onScholarChange('scholarshipType', '');
                      onScholarChange('otherScholarship', '');
                    }
                    setScholarErrors(prev => ({ ...prev, isScholar: false }));
                  }}
                />
                <span>{opt === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* => Scholarship type - only shown if scholar, on same line */}
        {scholarData.isScholar === 'yes' && (
          <div className="ts5-field-group ts5-field-group--inline">
            <label className="ts5-label">
              Scholarship Type <span className="ts5-req">*</span>
            </label>
            <div className={`ts5-radio-group ts5-radio-group--wrap ${scholarErrors.scholarshipType ? 'ts5-radio--error' : ''}`}>
              {['TWSP', 'PESFA', 'STEP', 'Others'].map(type => (
                <label key={type} className="ts5-radio-label">
                  <input
                    type="radio"
                    name="scholarshipType"
                    value={type}
                    checked={scholarData.scholarshipType === type}
                    onChange={(e) => {
                      onScholarChange('scholarshipType', e.target.value);
                      if (e.target.value !== 'Others') {
                        onScholarChange('otherScholarship', '');
                      }
                      setScholarErrors(prev => ({ ...prev, scholarshipType: false }));
                    }}
                  />
                  <span>{type}</span>
                </label>
              ))}

              {/* => "Others" specify input on same line as radio options */}
              {scholarData.scholarshipType === 'Others' && (
                <input
                  type="text"
                  className={`ts5-scholar-other-input ${scholarErrors.otherScholarship ? 'ts5-select--error' : ''}`}
                  placeholder="Please specify..."
                  value={scholarData.otherScholarship}
                  onChange={(e) => {
                    onScholarChange('otherScholarship', e.target.value);
                    setScholarErrors(prev => ({ ...prev, otherScholarship: false }));
                  }}
                />
              )}
            </div>
          </div>
        )}

      </div>

      {scholarData.isScholar === 'yes' && (
        <p className="ts5-scholar-hint">
          <i className="ti ti-info-circle" />
          TESDA Scholars receive a 100% tuition discount.
          Evidence of scholarship may be checked by the admin.
        </p>
      )}

      {/* ── Section: Privacy Consent ── */}
      <div className="ts5-section-title" style={{ marginTop: '1.8rem' }}>
        Privacy Disclaimer
      </div>

      <div className="ts5-policy-box">
        <p className="ts5-policy-text">
          By submitting this enrollment form, you acknowledge and agree that{' '}
          <strong>3A Prime Academy</strong> will collect, store, and process
          the personal information you have provided in this form in accordance
          with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>
          and its implementing rules and regulations.
        </p>
        <p className="ts5-policy-text">
          Your personal information will be used solely for the purposes of
          enrollment processing, student record management, communication
          regarding your enrollment status, and compliance with regulatory
          requirements of TESDA and other relevant government agencies.
        </p>
        <p className="ts5-policy-text">
          Your information will not be shared with third parties without
          your consent, except as required by law or by TESDA for the
          purpose of program registration and monitoring.
        </p>
        <p className="ts5-policy-text">
          You have the right to access, correct, and withdraw consent for
          the processing of your personal data. For concerns regarding
          your data privacy rights, please contact the school's Data
          Privacy Officer.
        </p>
      </div>

      <label className={`ts5-consent-label ${privacyErrors.agreed ? 'ts5-consent--error' : ''}`}>
        <input
          type="checkbox"
          className="ts5-consent-checkbox"
          checked={privacyData.agreed}
          onChange={(e) => {
            onPrivacyChange('agreed', e.target.checked);
            setPrivacyErrors(prev => ({ ...prev, agreed: false }));
          }}
        />
        <span>
          I have read and understood the privacy disclaimer above and
          I consent to the collection and processing of my personal
          information by 3A Prime Academy.{' '}
          <span className="ts5-req">*</span>
        </span>
      </label>

      {/* => Error banners */}
      {showErrors && (!data.branch || !data.course || !data.courseClass) && (
        <div className="ts5-error-banner">
          <i className="ti ti-alert-circle" />
          Please select a branch, course, and class before proceeding.
        </div>
      )}
      {showFileBanner && (
        <div className="ts5-error-banner">
          <i className="ti ti-alert-circle" />
          Please upload all required documents before proceeding.
        </div>
      )}

      {/* => Navigation */}
      <div className="ts5-nav">
        <button
          className="ts5-btn-back"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button
          className="ts5-btn-next"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="ti ti-loader-2 ts5-spinner" />
              Submitting...
            </>
          ) : (
            <>
              Submit Enrollment
              <i className="ti ti-send" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default TESDAStep5;