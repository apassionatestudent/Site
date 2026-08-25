  // ============================================================
  // => Final submission
  // => Posts to /enrollment/re-enroll/tesda and /enrollment/re-enroll/shs -
  // => both now wired up in tesdaEnrollmentRoutes.js / shsEnrollmentRoutes.js,
  // => reusing the existing tesdaEnrollmentModel.js / shsEnrollmentModel.js
  // => insert functions so the row shape matches the original submit flow
  // => exactly. NCAE, Scholarship, Client Classifications (TESDA) and
  // => academic history/emergency contact/health info (SHS) aren't
  // => collected here - the backend carries those over from the
  // => student's most recent enrollment in each program instead.
  // ============================================================
// => NOTE: handleTesdaSubmit/handleShsSubmit post to placeholder routes
// => that do not exist on the backend yet - see the comment above each
// => one for what's still needed before submission actually works.

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import axiosStudent from '../../../utils/axiosStudent.js';
import closeIcon from '../../../assets/icons/close.png';
// => Needed import - upload icon PNG for the file input labels, following
// => the "no text icons" rule. Place an upload.png (simple upload/cloud
// => glyph) at this path.
import uploadIcon from '../../../assets/icons/upload.png';
import './addEnrollmentModal.css';

const STEP_CHOICE = 'choice';
const STEP_TESDA_COURSE = 'tesda-course';
const STEP_TESDA_DOCS = 'tesda-docs';
const STEP_SHS_CLUSTER = 'shs-cluster';
const STEP_SHS_DOCS = 'shs-docs';

// => Same file constraints as TESDAStep3.jsx / SHSStep2.jsx, kept
// => identical so validation behaves the same across all enrollment forms
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_MB = 5;

// => Fixed SHS document checklist, mirrors SHSStep2.jsx's REQUIRED_DOCUMENTS.
// => Duplicated here on purpose - per-page file duplication is the
// => established convention in this project, not a shared import.
const SHS_REQUIRED_DOCUMENTS = [
  { key: 'psaBirthCertificate', label: 'Original PSA Birth Certificate', required: true, maxCount: 1 },
  { key: 'grade10ReportCard', label: 'Photocopy of Recent Grade 10 Report Card', required: true, maxCount: 2 },
  { key: 'goodMoralCertificate', label: 'Good Moral Certificate', required: true, maxCount: 1 },
  { key: 'escCertificate', label: 'ESC Certificate (for Private Junior High School)', required: false, maxCount: 1 },
];

// => eligibility: { canEnrollSHS, canEnrollTESDA, tesdaMode, eligibleSectorIds }
// => passed down from Enrollment.jsx so this modal never has to guess or
// => re-fetch what the parent already knows
export default function AddEnrollmentModal({ eligibility, onClose, onCreated }) {
  const [step, setStep] = useState(STEP_CHOICE);
  const [track, setTrack] = useState(null); // => 'tesda' | 'shs'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================
  // => TESDA course + batch picker state
  // ============================================================
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);

  // => Keyed by requirement id (req_<requirement_id>), each value is an
  // => array of File objects - same shape as TESDAStep3.jsx's tesdaFiles
  const [tesdaFiles, setTesdaFiles] = useState({});
  const [tesdaFileErrors, setTesdaFileErrors] = useState({});

  const [tesdaFieldErrors, setTesdaFieldErrors] = useState({ course: false, batch: false });
  const [tesdaShowErrors, setTesdaShowErrors] = useState(false);

  // ============================================================
  // => SHS cluster + batch picker state
  // ============================================================
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clusterCourses, setClusterCourses] = useState({}); // => { [cluster_id]: courses[] }
  const [clusterCoursesLoading, setClusterCoursesLoading] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState('');

  const [shsBatches, setShsBatches] = useState([]);
  const [shsBatchesLoading, setShsBatchesLoading] = useState(false);
  const [shsBatchesFetched, setShsBatchesFetched] = useState(false);
  const [selectedShsBatchId, setSelectedShsBatchId] = useState('');

  // => Keyed by SHS_REQUIRED_DOCUMENTS' `key`, each value is an array of Files
  const [shsDocuments, setShsDocuments] = useState({});
  const [shsDocErrors, setShsDocErrors] = useState({});
  const [shsDocTypeErrors, setShsDocTypeErrors] = useState({});

  const [shsFieldErrors, setShsFieldErrors] = useState({ cluster: false, batch: false });
  const [shsShowErrors, setShsShowErrors] = useState(false);

  // => True once the fetch for the selected cluster's batches has
  // => actually completed AND come back empty - same "confirmed empty vs
  // => not-yet-fetched" distinction SHSStep2.jsx uses
  const noShsBatchesAvailable = shsBatchesFetched && shsBatches.length === 0;

  // => Restricts the course list to eligibleSectorIds when the student
  // => already has an active TESDA enrollment (same-sector mode). Fully
  // => open (all sectors) when tesdaMode is 'cross'. Also excludes any
  // => course the student is already actively (including Reserved)
  // => enrolled in - a same-sector sector can have 2 courses total but
  // => one of them may already be occupied by the student's current
  // => enrollment, so sector membership alone isn't enough.
  const visibleCourses = useMemo(() => {
    const bySector = eligibility.tesdaMode !== 'same-sector'
      ? courses
      : courses.filter(c => eligibility.eligibleSectorIds.includes(c.sector_id));

    return bySector.filter(c => !(eligibility.activeCourseIds || []).includes(c.course_id));
  }, [courses, eligibility.tesdaMode, eligibility.eligibleSectorIds, eligibility.activeCourseIds]);

  // => Maps each fetched requirement row to the same { id, label,
  // => documentType, isRequired, maxFiles } shape TESDAStep3.jsx builds,
  // => so the field ids line up with what a real submission endpoint
  // => would expect in documentRequirements
  const requirementFields = useMemo(() => requirements.map(r => ({
    id: `req_${r.requirement_id}`,
    label: r.document_type,
    documentType: r.document_type,
    isRequired: r.is_required,
    maxFiles: r.max_files || 1,
  })), [requirements]);

  // ============================================================
  // => Fetch: TESDA courses, once the course step is entered
  // ============================================================
  useEffect(() => {
    if (step !== STEP_TESDA_COURSE) return;
    setCoursesLoading(true);
    axiosStudent.get('/courses')
      .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error('Failed to fetch TESDA courses:', err);
        toast.error('Failed to load courses.');
      })
      .finally(() => setCoursesLoading(false));
  }, [step]);

  // => Fetch: batches + requirements for the selected course
  useEffect(() => {
    if (!selectedCourseId) {
      setBatches([]);
      setRequirements([]);
      return;
    }
    setBatchesLoading(true);
    axiosStudent.get(`/classes?course_id=${selectedCourseId}`)
      .then(res => setBatches(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch batches:', err))
      .finally(() => setBatchesLoading(false));

    setRequirementsLoading(true);
    axiosStudent.get(`/courses/${selectedCourseId}/requirements`)
      .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch course requirements:', err))
      .finally(() => setRequirementsLoading(false));
  }, [selectedCourseId]);

  // ============================================================
  // => Fetch: SHS clusters, once the cluster step is entered
  // ============================================================
  useEffect(() => {
    if (step !== STEP_SHS_CLUSTER) return;
    setClustersLoading(true);
    axiosStudent.get('/shs-clusters')
      .then(res => setClusters(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error('Failed to fetch SHS clusters:', err);
        toast.error('Failed to load clusters.');
      })
      .finally(() => setClustersLoading(false));
  }, [step]);

  // => Once clusters are in, fetch each cluster's curriculum - same
  // => pattern as SHSStep2.jsx
  useEffect(() => {
    if (clusters.length === 0) return;
    setClusterCoursesLoading(true);
    Promise.all(
      clusters.map(({ cluster_id }) =>
        axiosStudent.get(`/shs-clusters/${cluster_id}/courses`)
          .then(res => [cluster_id, res.data])
          .catch(err => {
            console.error(`Failed to fetch curriculum for cluster ${cluster_id}:`, err);
            return [cluster_id, []];
          })
      )
    )
      .then(entries => setClusterCourses(Object.fromEntries(entries)))
      .finally(() => setClusterCoursesLoading(false));
  }, [clusters]);

  // => Fetch: open batches for the selected cluster
  useEffect(() => {
    if (!selectedClusterId) {
      setShsBatches([]);
      setShsBatchesFetched(false);
      return;
    }
    setShsBatchesLoading(true);
    axiosStudent.get(`/shs-batches?clusterId=${selectedClusterId}`)
      .then(res => {
        setShsBatches(Array.isArray(res.data) ? res.data : []);
        setShsBatchesFetched(true);
      })
      .catch(err => console.error('Failed to fetch SHS batches:', err))
      .finally(() => setShsBatchesLoading(false));
  }, [selectedClusterId]);

  // ============================================================
  // => TESDA file handlers - same add/remove/cap pattern as TESDAStep3.jsx
  // ============================================================
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG and PNG files are allowed.';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File size must be less than ${MAX_SIZE_MB}MB.`;
    return null;
  };

  const validateFilesForRequirement = (fileList, field) => {
    const list = fileList || [];
    if (field.isRequired && list.length === 0) return 'This document is required.';
    if (list.length > field.maxFiles) return `You can upload up to ${field.maxFiles} file${field.maxFiles !== 1 ? 's' : ''}.`;
    for (const file of list) {
      const err = validateFile(file);
      if (err) return err;
    }
    return null;
  };

  const handleTesdaFileChange = (e, field) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // => allow re-picking the same filename later
    const existing = tesdaFiles[field.id] || [];
    const combined = [...existing, ...picked].slice(0, field.maxFiles);
    setTesdaFiles(prev => ({ ...prev, [field.id]: combined }));
    setTesdaFileErrors(prev => ({ ...prev, [field.id]: validateFilesForRequirement(combined, field) }));
  };

  const handleTesdaFileRemove = (field, index) => {
    const existing = tesdaFiles[field.id] || [];
    const updated = existing.filter((_, i) => i !== index);
    setTesdaFiles(prev => ({ ...prev, [field.id]: updated }));
    setTesdaFileErrors(prev => ({ ...prev, [field.id]: validateFilesForRequirement(updated, field) }));
  };

  // ============================================================
  // => SHS file handlers - same add/remove/cap pattern as SHSStep2.jsx
  // ============================================================
  const isValidShsFileType = (file) => ['image/jpeg', 'image/png'].includes(file.type);

  const handleShsFileChange = (doc, fileList) => {
    const picked = Array.from(fileList);
    if (picked.length === 0) return;
    const hasInvalid = picked.some(f => !isValidShsFileType(f));
    if (hasInvalid) {
      setShsDocErrors(prev => ({ ...prev, [doc.key]: true }));
      setShsDocTypeErrors(prev => ({ ...prev, [doc.key]: true }));
      return;
    }
    const existing = shsDocuments[doc.key] || [];
    const combined = [...existing, ...picked].slice(0, doc.maxCount);
    setShsDocuments(prev => ({ ...prev, [doc.key]: combined }));
    setShsDocErrors(prev => ({ ...prev, [doc.key]: false }));
    setShsDocTypeErrors(prev => ({ ...prev, [doc.key]: false }));
  };

  const handleShsFileRemove = (doc, index) => {
    const existing = shsDocuments[doc.key] || [];
    const updated = existing.filter((_, i) => i !== index);
    setShsDocuments(prev => ({ ...prev, [doc.key]: updated }));
    const stillValid = !doc.required || (updated.length >= 1 && updated.length <= doc.maxCount);
    setShsDocErrors(prev => ({ ...prev, [doc.key]: !stillValid }));
  };

  // ============================================================
  // => Step navigation
  // ============================================================
  const handlePickTrack = (chosenTrack) => {
    setTrack(chosenTrack);
    setStep(chosenTrack === 'tesda' ? STEP_TESDA_COURSE : STEP_SHS_CLUSTER);
  };

  const handleTesdaCourseNext = () => {
    const missingCourse = !selectedCourseId;
    const missingBatch = !selectedBatchId; // => "reserve" counts as a valid non-empty value
    setTesdaFieldErrors({ course: missingCourse, batch: missingBatch });
    if (missingCourse || missingBatch) {
      setTesdaShowErrors(true);
      return;
    }
    setTesdaShowErrors(false);
    setStep(STEP_TESDA_DOCS);
  };

  const handleShsClusterNext = () => {
    const missingCluster = !selectedClusterId;
    const missingBatch = !selectedShsBatchId && !noShsBatchesAvailable;
    setShsFieldErrors({ cluster: missingCluster, batch: missingBatch });
    if (missingCluster || missingBatch) {
      setShsShowErrors(true);
      return;
    }
    setShsShowErrors(false);
    setStep(STEP_SHS_DOCS);
  };

  // ============================================================
  // => Final submission
  // => NOTE: these endpoints ('/enrollment/re-enroll/tesda' and
  // => '/enrollment/re-enroll/shs') do not exist on the backend yet.
  // => Building them requires the existing tesdaEnrollmentModel.js /
  // => Service.js (and their SHS equivalents) used by the original
  // => /api/enrollment/submit and /api/enrollment/submit-shs routes, so
  // => this insert-only re-enrollment version writes to tesda_enrollments /
  // => tesda_documents (or shs_enrollments) with the exact same column
  // => shape. Flagging this rather than guessing the columns.
  // ============================================================
  const handleTesdaSubmit = async () => {
    const newErrors = {};
    requirementFields.forEach(field => {
      const err = validateFilesForRequirement(tesdaFiles[field.id], field);
      if (err) newErrors[field.id] = err;
    });
    setTesdaFileErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTesdaShowErrors(true);
      return;
    }

    const formData = new FormData();
    formData.append('courseId', selectedCourseId);
    formData.append('batchId', selectedBatchId);
    Object.entries(tesdaFiles).forEach(([key, fileList]) => {
      (fileList || []).forEach(file => formData.append(key, file));
    });
    const documentRequirements = {};
    requirementFields.forEach(f => { documentRequirements[f.id] = f.documentType; });
    formData.append('documentRequirements', JSON.stringify(documentRequirements));

    setIsSubmitting(true);
    try {
      await axiosStudent.post('/enrollment/re-enroll/tesda', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Enrollment submitted.');
      onCreated?.();
      onClose?.();
    } catch (err) {
      console.error('TESDA re-enrollment failed:', err);
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShsSubmit = async () => {
    const newErrors = {};
    SHS_REQUIRED_DOCUMENTS.forEach(doc => {
      const val = shsDocuments[doc.key] || [];
      const valid = !doc.required || (val.length >= 1 && val.length <= doc.maxCount);
      if (!valid) newErrors[doc.key] = true;
    });
    setShsDocErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setShsShowErrors(true);
      return;
    }

    const formData = new FormData();
    formData.append('clusterId', selectedClusterId);
    if (selectedShsBatchId) formData.append('batchId', selectedShsBatchId);
    Object.entries(shsDocuments).forEach(([key, fileList]) => {
      (fileList || []).forEach(file => formData.append(key, file));
    });

    setIsSubmitting(true);
    try {
      await axiosStudent.post('/enrollment/re-enroll/shs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Enrollment submitted.');
      onCreated?.();
      onClose?.();
    } catch (err) {
      console.error('SHS re-enrollment failed:', err);
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="aem-modal-overlay" onClick={onClose}>
      {/* => stopPropagation so clicking inside the card doesn't bubble up
          => and trigger the overlay's onClose */}
      <div className="aem-modal-card aem-modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="aem-modal-header">
          <h3>New Enrollment</h3>
          <button type="button" className="aem-modal-close-btn" onClick={onClose} aria-label="Close" title="Close">
            <img src={closeIcon} alt="" className="aem-close-icon" />
          </button>
        </div>

        {step === STEP_CHOICE && (
          <div className="aem-choice-body">
            <p className="aem-choice-hint">Which program would you like to enroll into?</p>
            <div className="aem-choice-buttons">
              {eligibility.canEnrollTESDA && (
                <button type="button" className="aem-choice-btn aem-choice-btn--tesda" onClick={() => handlePickTrack('tesda')}>
                  TESDA
                </button>
              )}
              {eligibility.canEnrollSHS && (
                <button type="button" className="aem-choice-btn aem-choice-btn--shs" onClick={() => handlePickTrack('shs')}>
                  SHS
                </button>
              )}
            </div>
            {eligibility.canEnrollTESDA && eligibility.tesdaMode === 'same-sector' && (
              <p className="aem-choice-note">
                You currently have an active TESDA enrollment, so new enrollments are limited to courses within the same sector.
              </p>
            )}
          </div>
        )}

        {/* ================= TESDA: Course + Batch ================= */}
        {step === STEP_TESDA_COURSE && (
          <div className="aem-step-body">
            <div className="aem-field-group">
              <label className="aem-label">Course / Qualification <span className="aem-req">*</span></label>
              <select
                className={`aem-select ${tesdaFieldErrors.course ? 'aem-select--error' : ''}`}
                value={selectedCourseId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCourseId(id);
                  setSelectedBatchId('');
                  const found = visibleCourses.find(c => String(c.course_id) === String(id));
                  setSelectedCourse(found || null);
                  setTesdaFieldErrors(prev => ({ ...prev, course: false }));
                }}
                disabled={coursesLoading}
              >
                <option value="">{coursesLoading ? 'Loading...' : 'Select a Course'}</option>
                {visibleCourses.map(c => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title}{c.certification_type ? ` (${c.certification_type})` : ''}
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <span className="aem-hint">Sector: <strong>{selectedCourse.sector || 'Unassigned'}</strong></span>
              )}
              {/* => Defensive only - the eligibility service already checks
                  => course_count > 1 before allowing same-sector mode, so
                  => this shouldn't normally render, but covers a race
                  => between that check and this fetch */}
              {!coursesLoading && eligibility.tesdaMode === 'same-sector' && visibleCourses.length === 0 && (
                <span className="aem-hint aem-hint--warn">No other courses are currently available in your active sector.</span>
              )}
            </div>

            <div className="aem-field-group">
              <label className="aem-label">Batch <span className="aem-req">*</span></label>
              <select
                className={`aem-select ${tesdaFieldErrors.batch ? 'aem-select--error' : ''}`}
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setTesdaFieldErrors(prev => ({ ...prev, batch: false }));
                }}
                disabled={!selectedCourseId || batchesLoading}
              >
                <option value="">
                  {!selectedCourseId ? '- Select Course first -' : batchesLoading ? 'Loading...' : 'Select a Batch'}
                </option>
                {!batchesLoading && selectedCourseId && batches.length === 0 && (
                  <option value="reserve">Reserve a Slot</option>
                )}
                {batches.map(b => {
                  const dateRange = (b.start_date && b.end_date)
                    ? `${new Date(b.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(b.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'Dates TBA';
                  return (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_name} - {b.class_type === 'Regular' ? 'Regular' : 'TESDA-Sponsored'} - {dateRange} - {b.remaining_slots} slot{b.remaining_slots !== 1 ? 's' : ''} left
                    </option>
                  );
                })}
              </select>
              {!batchesLoading && selectedCourseId && batches.length === 0 && (
                <span className="aem-hint">No batches available. Select <strong>Reserve a Slot</strong> to be notified when one opens.</span>
              )}
            </div>

            {tesdaShowErrors && (tesdaFieldErrors.course || tesdaFieldErrors.batch) && (
              <div className="aem-error-banner">Please select a course and batch before proceeding.</div>
            )}

            <div className="aem-nav">
              <button type="button" className="aem-btn-back" onClick={() => setStep(STEP_CHOICE)}>Back</button>
              <button type="button" className="aem-btn-next" onClick={handleTesdaCourseNext}>Next</button>
            </div>
          </div>
        )}

        {/* ================= TESDA: Documents ================= */}
        {step === STEP_TESDA_DOCS && (
          <div className="aem-step-body">
            <p className="aem-choice-hint">
              Please upload clear, legible scans or photos. Only JPG and PNG files are accepted (max {MAX_SIZE_MB}MB each).
            </p>

            {requirementsLoading && <p className="aem-hint">Loading requirements...</p>}

            {requirementFields.map((field) => {
              const selectedFiles = tesdaFiles[field.id] || [];
              return (
                <div key={field.id} className="aem-upload-group">
                  <label className="aem-upload-label">
                    {field.label}{field.isRequired && <span className="aem-req">*</span>}
                  </label>
                  <p className="aem-upload-desc">
                    {field.maxFiles > 1 ? `You may upload up to ${field.maxFiles} files.` : '1 file needed.'}
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="aem-file-list">
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="aem-file-row">
                          <span className="aem-file-name">{file.name}</span>
                          <button
                            type="button"
                            className="aem-file-remove-btn"
                            onClick={() => handleTesdaFileRemove(field, index)}
                            aria-label={`Remove ${file.name}`}
                            title={`Remove ${file.name}`}
                          >
                            <img src={closeIcon} alt="" className="aem-file-remove-icon" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedFiles.length < field.maxFiles && (
                    <>
                      <input
                        type="file"
                        id={field.id}
                        className="aem-file-input"
                        accept="image/jpeg,image/jpg,image/png"
                        multiple={field.maxFiles > 1}
                        onChange={(e) => handleTesdaFileChange(e, field)}
                      />
                      <label htmlFor={field.id} className={`aem-file-label ${tesdaFileErrors[field.id] ? 'aem-file-label--error' : ''}`}>
                        <img src={uploadIcon} alt="" className="aem-upload-icon" />
                        <span>{selectedFiles.length > 0 ? `Add file (${field.maxFiles - selectedFiles.length} remaining)` : 'Choose file'}</span>
                      </label>
                    </>
                  )}
                  {tesdaFileErrors[field.id] && <span className="aem-file-error">{tesdaFileErrors[field.id]}</span>}
                </div>
              );
            })}

            {tesdaShowErrors && Object.keys(tesdaFileErrors).length > 0 && (
              <div className="aem-error-banner">Please upload all required documents before proceeding.</div>
            )}

            <div className="aem-nav">
              <button type="button" className="aem-btn-back" onClick={() => setStep(STEP_TESDA_COURSE)} disabled={isSubmitting}>Back</button>
              <button type="button" className="aem-btn-next" onClick={handleTesdaSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
              </button>
            </div>
          </div>
        )}

        {/* ================= SHS: Cluster + Batch ================= */}
        {step === STEP_SHS_CLUSTER && (
          <div className="aem-step-body">
            <div className="aem-field-group">
              <label className="aem-label">Select Cluster <span className="aem-req">*</span></label>
              <div className={`aem-cluster-list ${shsFieldErrors.cluster ? 'aem-radio--error' : ''}`}>
                {clustersLoading ? (
                  <span className="aem-hint">Loading clusters...</span>
                ) : (
                  clusters.map(({ cluster_id, name }) => {
                    const courseList = clusterCourses[cluster_id] || [];
                    return (
                      <label key={cluster_id} className="aem-cluster-option">
                        <input
                          type="radio"
                          name="reenroll-cluster"
                          value={cluster_id}
                          checked={String(selectedClusterId) === String(cluster_id)}
                          onChange={(e) => {
                            setSelectedClusterId(e.target.value);
                            setSelectedShsBatchId('');
                            setShsFieldErrors(prev => ({ ...prev, cluster: false }));
                          }}
                        />
                        <span className="aem-cluster-text">
                          <span className="aem-cluster-label">{name}</span>
                          {clusterCoursesLoading ? (
                            <span className="aem-cluster-specs">Loading curriculum...</span>
                          ) : (
                            <span className="aem-cluster-specs">
                              {courseList.map(c => `${c.title} (${c.grade_level})`).join(', ') || 'Curriculum not yet published.'}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="aem-field-group">
              <label className="aem-label">Select Class <span className="aem-req">*</span></label>
              {noShsBatchesAvailable ? (
                <div className="aem-reserve-notice">
                  No open class yet for this cluster. Your enrollment will be marked as <strong>Reserved</strong> until one is available.
                </div>
              ) : (
                <select
                  className={`aem-select ${shsFieldErrors.batch ? 'aem-select--error' : ''}`}
                  value={selectedShsBatchId}
                  disabled={!selectedClusterId || shsBatchesLoading}
                  onChange={(e) => {
                    setSelectedShsBatchId(e.target.value);
                    setShsFieldErrors(prev => ({ ...prev, batch: false }));
                  }}
                >
                  <option value="">{shsBatchesLoading ? 'Loading...' : 'Select class'}</option>
                  {shsBatches.map(b => {
                    const dateRange = (b.start_date && b.end_date)
                      ? `${new Date(b.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(b.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : 'Dates TBA';
                    return (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_name} - {dateRange} - {b.remaining_slots} slot{b.remaining_slots !== 1 ? 's' : ''} left
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {shsShowErrors && (shsFieldErrors.cluster || shsFieldErrors.batch) && (
              <div className="aem-error-banner">Please select a cluster before proceeding.</div>
            )}

            <div className="aem-nav">
              <button type="button" className="aem-btn-back" onClick={() => setStep(STEP_CHOICE)}>Back</button>
              <button type="button" className="aem-btn-next" onClick={handleShsClusterNext}>Next</button>
            </div>
          </div>
        )}

        {/* ================= SHS: Documents ================= */}
        {step === STEP_SHS_DOCS && (
          <div className="aem-step-body">
            <p className="aem-choice-hint">
              Please upload clear, legible scans or photos. Only JPG and PNG files are accepted.
            </p>

            {SHS_REQUIRED_DOCUMENTS.map((doc) => {
              const selectedFiles = shsDocuments[doc.key] || [];
              return (
                <div key={doc.key} className="aem-upload-group">
                  <label className="aem-upload-label">
                    {doc.label}{doc.required && <span className="aem-req">*</span>}
                  </label>
                  <p className="aem-upload-desc">
                    {doc.maxCount > 1 ? `You may upload up to ${doc.maxCount} files.` : '1 file needed.'}
                    {!doc.required && ' Optional.'}
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="aem-file-list">
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="aem-file-row">
                          <span className="aem-file-name">{file.name}</span>
                          <button
                            type="button"
                            className="aem-file-remove-btn"
                            onClick={() => handleShsFileRemove(doc, index)}
                            aria-label={`Remove ${file.name}`}
                            title={`Remove ${file.name}`}
                          >
                            <img src={closeIcon} alt="" className="aem-file-remove-icon" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedFiles.length < doc.maxCount && (
                    <>
                      <input
                        type="file"
                        id={`reenroll-${doc.key}`}
                        className="aem-file-input"
                        accept="image/jpeg,image/png"
                        multiple={doc.maxCount > 1}
                        onChange={(e) => handleShsFileChange(doc, e.target.files)}
                      />
                      <label htmlFor={`reenroll-${doc.key}`} className={`aem-file-label ${shsDocErrors[doc.key] ? 'aem-file-label--error' : ''}`}>
                        <img src={uploadIcon} alt="" className="aem-upload-icon" />
                        <span>{selectedFiles.length > 0 ? `Add file (${doc.maxCount - selectedFiles.length} remaining)` : 'Choose file'}</span>
                      </label>
                    </>
                  )}
                  {shsDocErrors[doc.key] && (
                    <span className="aem-file-error">
                      {shsDocTypeErrors[doc.key] ? 'Only JPG and PNG files are allowed.' : 'This document is required.'}
                    </span>
                  )}
                </div>
              );
            })}

            {shsShowErrors && Object.keys(shsDocErrors).some(k => shsDocErrors[k]) && (
              <div className="aem-error-banner">Please upload all required documents before proceeding.</div>
            )}

            <div className="aem-nav">
              <button type="button" className="aem-btn-back" onClick={() => setStep(STEP_SHS_CLUSTER)} disabled={isSubmitting}>Back</button>
              <button type="button" className="aem-btn-next" onClick={handleShsSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}