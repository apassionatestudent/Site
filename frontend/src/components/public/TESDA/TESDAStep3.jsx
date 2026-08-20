import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TESDAStep3.css';
import Info from '../../Info.jsx';
import ChatbotWidget from '../ChatbotWidget/chatbotWidget.jsx';
import RemoveFileIcon from '../../../assets/icons/close.png';

// => Requirements are no longer hardcoded here - every document a
// => student must upload (NSO/PSA Birth Certificate, Form 137/TOR,
// => Valid ID, etc.) is now defined by the admin per course in
// => tesda_course_requirements, fetched below. Removes the duplicate
// => upload boxes that showed up when an admin's requirement overlapped
// => with what used to be hardcoded here.
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_MB = 5;

// => Fixed reservation fee, only collected for Regular (non-sponsored)
// => TESDA batches. This is a deduction from the course amount, not an
// => additional charge - remaining balance = course amount - this.
const RESERVATION_FEE = 1000;

// => This is old TESDAStep5's content, renumbered to Step 3 in the new 3-step flow.
// => No logic changed - course selection, uploads, scholarship, and privacy consent stay exactly as they were.
const TESDAStep3 = ({
  data, onChange,
  files, onFileChange,
  onRequirementsChange,       // => notifies Enroll.jsx of the current id -> document_type list
  scholarData, onScholarChange,
  privacyData, onPrivacyChange,
  onBack, onSubmit,           // => onSubmit replaces onNext since this is now the last step
}) => {

  // => Courses fetched once on mount - each row already carries its sector
  // => name (courses.sector_id -> sectors.sector), shown read-only once a
  // => course is selected. No branch/sector filtering anymore.
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // => Additional course-specific requirements fetched from DB
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // => Tracks selected course object for displaying the fee
  const [selectedCourse, setSelectedCourse] = useState(null);

  // => Tracks selected batch object so the fee breakdown can be gated by
  // => class_type (Regular vs TESDA-Sponsored) instead of showing on
  // => course selection alone
  const [selectedBatch, setSelectedBatch] = useState(null);

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
    course: false,
    courseClass: false,
  });

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => Fetch all active courses on mount - no branch/sector filter,
  // => single-branch institution now
  useEffect(() => {
    setCoursesLoading(true);
    fetch('/api/courses')
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch courses:', err))
      .finally(() => setCoursesLoading(false));
  }, []);

  // => Fetch classes when course is selected
  useEffect(() => {
    if (!data.course) {
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    fetch(`/api/classes?course_id=${data.course}`)
      .then(r => r.json())
      .then(d => setClasses(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch classes:', err))
      .finally(() => setClassesLoading(false));
  }, [data.course]);

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

  // => Every requirement now comes straight from the admin-defined
  // => tesda_course_requirements table - no more hardcoded base set.
  // => document_type doubles as both the display label and the value
  // => that will later be written to tesda_documents.document_type on
  // => upload, so it's carried through as documentType too. Memoized so
  // => the effect below only re-fires when additionalDocs actually
  // => changes, not on every render.
  const allRequirements = useMemo(() => additionalDocs.map(doc => ({
    id: `req_${doc.requirement_id}`,
    label: doc.document_type,
    description: '',
    content: '',
    documentType: doc.document_type,
    isRequired: doc.is_required,
    maxFiles: doc.max_files || 1,
  })), [additionalDocs]);

  // => Lifts the id -> document_type mapping up to Enroll.jsx, which has
  // => no other way to know what each dynamic file field (e.g. "req_12")
  // => corresponds to when it builds the final submission manifest
  useEffect(() => {
    onRequirementsChange(allRequirements);
  }, [allRequirements, onRequirementsChange]);

  // => Validates a single uploaded file's type and size - only ever
  // => called against a file that already exists in the array, the
  // => "is anything uploaded at all" check lives in the function below
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG and PNG files are allowed.';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File size must be less than ${MAX_SIZE_MB}MB.`;
    return null;
  };

  // => Validates the full set of files chosen for one requirement - the
  // => required-but-empty case, the max_files ceiling set by the admin,
  // => then each individual file's type/size
  const validateFilesForRequirement = (fileList, requirement) => {
    const list = fileList || [];
    if (requirement.isRequired && list.length === 0) {
      return 'This document is required.';
    }
    if (list.length > requirement.maxFiles) {
      return `You can upload up to ${requirement.maxFiles} file${requirement.maxFiles !== 1 ? 's' : ''} for this requirement.`;
    }
    for (const file of list) {
      const error = validateFile(file);
      if (error) return error;
    }
    return null;
  };

  // => Handle file selection - ADDS the newly picked file(s) to whatever
  // => was already chosen for this requirement, rather than replacing the
  // => whole selection (native <input multiple> replaces by default, this
  // => is why students could only ever get one file to "stick" before).
  // => Still caps the combined total at the requirement's max_files.
  const handleFileChange = useCallback((e, requirement) => {
    const newlySelected = Array.from(e.target.files || []);

    // => Resets the input's value so picking the exact same file again
    // => still fires a change event - browsers don't fire onChange when
    // => the selection doesn't change from the input's own perspective
    e.target.value = '';

    const existing = files[requirement.id] || [];
    const combined = [...existing, ...newlySelected];
    const capped = combined.slice(0, requirement.maxFiles);
    onFileChange(requirement.id, capped);

    const error = combined.length > requirement.maxFiles
      ? `You can upload up to ${requirement.maxFiles} file${requirement.maxFiles !== 1 ? 's' : ''} for this requirement.`
      : validateFilesForRequirement(capped, requirement);
    setFileErrors(prev => ({ ...prev, [requirement.id]: error }));
  }, [files, onFileChange]);

  // => Removes one file from a requirement's list by index, re-validates
  // => afterward so a now-satisfied or now-unsatisfied required box
  // => updates its error state immediately
  const handleRemoveFile = useCallback((requirement, index) => {
    const existing = files[requirement.id] || [];
    const updated = existing.filter((_, i) => i !== index);
    onFileChange(requirement.id, updated);

    const error = validateFilesForRequirement(updated, requirement);
    setFileErrors(prev => ({ ...prev, [requirement.id]: error }));
  }, [files, onFileChange]);

  // => Validates all selects + all file uploads together, scholarship, and data privacy notice
  const validate = () => {
    if (!data.course) return 'missing';
    if (!data.courseClass) return 'missing';
    for (const requirement of allRequirements) {
      if (validateFilesForRequirement(files[requirement.id], requirement)) return 'missing';
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
      course: !data.course,
      courseClass: !data.courseClass,
    });

    // => Validate files
    const newFileErrors = {};
    allRequirements.forEach((requirement) => {
      const error = validateFilesForRequirement(files[requirement.id], requirement);
      if (error) newFileErrors[requirement.id] = error;
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
    setFieldErrors({ course: false, courseClass: false });
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

      {/* => Course-scoped chatbot, same one shown on this course's public
             detail page - only renders once a course is actually picked
             below, and re-fetches automatically if the student changes
             their selection (ChatbotWidget keys its state on courseId) */}
      {data.course && <ChatbotWidget scope="tesda_course" courseId={data.course} />}

      {/* -- Section: Course Selection -- */}
      <div className="ts5-section-title">Course & Schedule</div>

      {/* => Course + Class in one row - Sector shown read-only under Course */}
      <div className="ts5-grid ts5-g2">

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
              // => Reset batch selection too, since it no longer matches
              // => the newly selected course
              setSelectedBatch(null);
              // => Find and store the full course record (title, amount,
              // => sector) from the already-loaded courses list
              const found = courses.find(c => String(c.course_id) === String(courseId));
              setSelectedCourse(found || null);
              onChange('courseFee', found ? found.amount : '');
              clearError('course');
            }}
            disabled={coursesLoading}
          >
            <option value="">
              {coursesLoading ? 'Loading...' : 'Select a Course'}
            </option>
            {courses.map(c => (
              <option key={c.course_id} value={c.course_id}>
                {c.title}{c.certification_type ? ` (${c.certification_type})` : ''}
              </option>
            ))}
          </select>
          {/* => Sector shown below the course dropdown once selected -
               read-only, just informs the student which sector their
               chosen course falls under (courses.sector_id). Fee moved
               to the Batch dropdown since it depends on class_type
               (Regular vs TESDA-Sponsored), which lives on the batch. */}
          {selectedCourse && (
            <span className="ts5-hint">
              Sector: <strong>{selectedCourse.sector || 'Unassigned'}</strong>
            </span>
          )}
        </div>

        {/* => Batch */}
        <div className="ts5-field-group">
          <label className="ts5-label">
            Batch <span className="ts5-req">*</span>
            <Info content="Regular batches require payment of the course fee, with a reservation fee due once your application is reviewed. TESDA-Sponsored batches are fully covered by TESDA at no cost to you. Each batch below is labeled with its type." />
          </label>
          <select
            className={`ts5-select ${fieldErrors.courseClass ? 'ts5-select--error' : ''}`}
            value={data.courseClass}
            onChange={(e) => {
              const batchId = e.target.value;
              onChange('courseClass', batchId);
              // => Find and store the full batch record (class_type) so
              // => the fee breakdown below can be gated correctly.
              // => "reserve" isn't a real batch_id so this resolves to
              // => null in that case, which is correct - no fee to show.
              const foundBatch = classes.find(cl => String(cl.batch_id) === String(batchId));
              setSelectedBatch(foundBatch || null);
              clearError('courseClass');
            }}
            disabled={!data.course || classesLoading}
          >
            <option value="">
              {!data.course
                ? '- Select Course first -'
                : classesLoading
                ? 'Loading...'
                : 'Select a Batch'}
            </option>

            {/* => Reserve option shown only when no batches are available */}
            {!classesLoading && data.course && classes.length === 0 && (
              <option value="reserve">Reserve a Slot</option>
            )}

            {/* => Keyed/valued by batch_id, matching tesdaBatchModel.js's
                 response shape - the old class_id name no longer exists in
                 the API response after the tesda_classes -> tesda_batches
                 rename, so this was silently breaking batch selection */}
            {classes.map(cl => {
              // => Pending batches can have NULL start_date/end_date until
              // => the admin firms up a schedule - show "Dates TBA" instead
              // => of an Invalid Date string in that case
              const dateRange = (cl.start_date && cl.end_date)
                ? `${new Date(cl.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} → ${new Date(cl.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'Dates TBA';

              return (
                <option key={cl.batch_id} value={cl.batch_id}>
                  {cl.batch_name} · {cl.class_type === 'Regular' ? 'Regular' : 'TESDA-Sponsored'} · {dateRange} · {cl.remaining_slots} approved slot{cl.remaining_slots !== 1 ? 's' : ''} left
                </option>
              );
            })}
          </select>

          {/* => Reserve hint below batch dropdown */}
          {!classesLoading && data.course && classes.length === 0 && (
            <span className="ts5-hint">
              No batches available. Select <strong>Reserve a Slot</strong> to
              be notified when one opens.
            </span>
          )}

          {/* => Fee breakdown - only renders once both a course and a
               real batch (not "reserve") are selected. Regular batches
               show the reservation fee as a deduction from the course
               amount, not on top of it. TESDA-Sponsored batches still
               show the course amount, but labeled as covered by TESDA. */}
          {selectedCourse && selectedBatch && (
            <div className="ts5-fee-breakdown">
              {selectedBatch.class_type === 'Regular' ? (
                <>
                  <span className="ts5-fee-line">
                    Course Amount: <strong>₱{Number(selectedCourse.amount).toLocaleString('en-PH')}</strong>
                  </span>
                  <span className="ts5-fee-line">
                    Reservation Fee (to be paid once your enrollment status changes to "Reviewed"): <strong>₱{RESERVATION_FEE.toLocaleString('en-PH')}</strong>
                  </span>
                  <span className="ts5-fee-line ts5-fee-line--balance">
                    Remaining Balance: <strong>₱{Number(selectedCourse.amount - RESERVATION_FEE).toLocaleString('en-PH')}</strong>
                  </span>
                </>
              ) : (
                <span className="ts5-fee-line">
                  Course Amount: <strong>₱{Number(selectedCourse.amount).toLocaleString('en-PH')}</strong>
                  {' '}
                  <span className="ts5-fee-sponsored-tag">Covered by TESDA</span>
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* -- Section: Upload Requirements -- */}
      <div className="ts5-section-title" style={{ marginTop: '1.8rem' }}>
        Upload Requirements
      </div>
      <p className="ts5-upload-subtitle">
        {!data.course ? (
          'Please select a course above to view its document requirements.'
        ) : (
          <>Please upload clear, legible scans or photos. Only JPG and PNG files are accepted (max {MAX_SIZE_MB}MB each).</>
        )}
      </p>

      {/* => Informational only, not an upload field - these photos are
           physical submissions, not uploaded through this form. Shown
           for every TESDA course regardless of that course's admin-
           configured requirements, mirrors the same static note used on
           SHSStep2 */}
      <div className="ts5-photo-requirements">
        <p className="ts5-label">
          Passport-size and 1x1 ID Pictures <span className="ts5-req">*</span>
        </p>
        <ul className="ts5-photo-list">
          <li>Passport-size ID picture (formal attire, white background)</li>
          <li>1x1 ID picture (formal attire, white background)</li>
        </ul>
        <p className="ts5-hint">
          These are not uploaded here. Please prepare physical copies and
          submit them at the office once your enrollment status has been
          marked "Reviewed."
        </p>
      </div>

      {/* => Loading state for additional docs */}
      {loadingDocs && (
        <p className="ts5-loading">
          <i className="ti ti-loader-2 ts5-spinner" /> Loading course requirements...
        </p>
      )}

      {/* => 2-column upload grid */}
      <div className="ts5-uploads">
        {allRequirements.map((requirement) => {
          const { id, label, description, content, isRequired, maxFiles } = requirement;
          const selectedFiles = files[id] || [];

          return (
            <div key={id} className="ts5-upload-group">

              <label className="ts5-upload-label">
                <span className="ts5-label-row">
                  {label}
                  {isRequired && <span className="ts5-req">*</span>}
                  {content && <Info content={content} />}
                </span>
              </label>

              {description && <p className="ts5-upload-desc">{description}</p>}

              {/* => Always rendered, not just when max_files > 1 - keeps
                   every box in the 2-column grid the same height so the
                   row doesn't go misaligned when only one requirement
                   next to it needs more than one file */}
              <p className="ts5-upload-desc">
                {maxFiles > 1
                  ? `You may upload up to ${maxFiles} files (e.g. multiple pages).`
                  : '1 file needed.'}
              </p>

              <div className="ts5-file-wrapper">

                {/* => Each chosen file gets its own row with a remove
                     button, replaces the old single collapsed label so
                     multiple files are individually visible/removable */}
                {selectedFiles.length > 0 && (
                  <div className="ts5-file-list">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="ts5-file-row">
                        <i className="ts5-file-icon ti ti-check" />
                        <span className="ts5-file-name">{file.name}</span>
                        <button
                          type="button"
                          className="ts5-file-remove-btn"
                          onClick={() => handleRemoveFile(requirement, index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <img src={RemoveFileIcon} alt="" className="ts5-file-remove-icon" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* => Only shown while there's still room left under
                     max_files - hides once the cap is reached instead of
                     letting the student try to add more and get truncated */}
                {selectedFiles.length < maxFiles && (
                  <>
                    <input
                      type="file"
                      id={id}
                      className="ts5-file-input"
                      accept="image/jpeg,image/jpg,image/png"
                      multiple={maxFiles > 1}
                      onChange={(e) => handleFileChange(e, requirement)}
                    />
                    <label
                      htmlFor={id}
                      className={`ts5-file-label ${fileErrors[id] ? 'ts5-file-label--error' : ''}`}
                    >
                      <i className="ts5-file-icon ti ti-upload" />
                      <span>
                        {selectedFiles.length > 0
                          ? `Add file (${maxFiles - selectedFiles.length} remaining)`
                          : `Choose file${maxFiles > 1 ? 's' : ''}`}
                      </span>
                    </label>
                  </>
                )}
              </div>

              {fileErrors[id] && (
                <span className="ts5-file-error">{fileErrors[id]}</span>
              )}

            </div>
          );
        })}
      </div>

      {/* -- Section: Scholarship Package -- */}
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
              <Info content="TWSP: Training for Work Scholarship Program. PESFA: Private Education Student Financial Assistance. STEP: Special Training for Employment Program. Not sure which one applies to you? Select 'Others' and briefly describe what you believe you're availing." />
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

      {/* -- Section: Privacy Consent -- */}
      <div className="ts5-section-title" style={{ marginTop: '1.8rem' }}>
        Privacy Disclaimer
      </div>

      <div className="ts5-policy-box">
        <p className="ts5-policy-text">
          By submitting this enrollment form, you acknowledge and agree that{' '}
          <strong>3A Prime Hospitality Training and Assessment Center Inc.</strong> will collect, store, and process
          the personal information you have provided in accordance with the{' '}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
          Read our full{' '}
          <a href="/termsandconditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>{' '}
          and{' '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
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
          information by 3A Prime Hospitality Training and Assessment Center Inc.{' '}
          <span className="ts5-req">*</span>
        </span>
      </label>

      {/* => Error banners */}
      {showErrors && (!data.course || !data.courseClass) && (
        <div className="ts5-error-banner">
          <i className="ti ti-alert-circle" />
          Please select a course and batch before proceeding.
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

export default TESDAStep3;