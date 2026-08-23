import React, { useState, useEffect } from 'react';
import './SHSStep2.css';
// => Remove-file icon for the upload section below - swapped in from your
// => own assets instead of a webfont icon class, since the Tabler icon
// => glyph wasn't rendering for this one.
import rejectedIcon from '../../../assets/icons/rejected.png';

import Info from '../../Info.jsx';
// => reuses the existing shs_course scoped chatbot, same one already
// => used on SHSCourseDetail, adjust the relative path below if this
// => file sits at a different depth under src/
import ChatbotWidget from '../../../components/public/ChatbotWidget/chatbotWidget.jsx';

// => Academic Track removed - Prime Academy only offers the Technical
// => Professional Track per the SY 2026-2027 flyer, so the track choice
// => is gone from the UI entirely (hardcoded to 'tech_prof' in Enroll.jsx).
// => Hardcoded CLUSTERS array removed - shs_clusters.value was dropped in
// => the DB migration, name is now the sole identifying label, and
// => cluster_id is the only stable key. Clusters are fetched live below
// => from /api/shs-clusters instead.

// => Capitalizes first letter of each word, lowercases the rest - same
// => helper duplicated in SHSStep1/SHSStep3 (kept per-file, not a shared
// => utils import, consistent with how validators are handled elsewhere).
// => Applied on every keystroke (onChange) per direction.
const toProperCase = (value) => {
  if (!value) return value;
  return value.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

// => Fixes the "can't type" symptom plain toProperCase-on-onChange causes -
// => see SHSStep1.jsx for the full explanation. Grabs cursor position
// => before the transform, restores it on the DOM node right after.
const applyProperCase = (e, key, onChangeFn) => {
  const input = e.target;
  const cursor = input.selectionStart;
  onChangeFn(key, toProperCase(input.value));
  requestAnimationFrame(() => {
    if (input) input.setSelectionRange(cursor, cursor);
  });
};

// => Document requirements from the physical form's "REQUIREMENTS FOR
// => ENROLLMENT" sidebar list. ESC Certificate is marked optional here -
// => the form says "for Private JHS" but nothing in this step (or
// => anywhere else in the SHS flow) captures public-vs-private JHS
// => status, so it can't be conditionally required yet. Flag raised
// => separately - can gate this properly once that's decided.
// => maxCount added to every entry so the requirement card can always
// => show a concrete file count (mirrors TESDAStep3's "up to N files" /
// => "1 file needed." messaging). Grade 10 Report Card is now multiple: true
// => with maxCount: 2 - up to 2 files (e.g. front and back), not an exact
// => count like the (currently unused) 2x2/1x1 photo pattern this file's
// => multi-upload UI was originally built for.
const REQUIRED_DOCUMENTS = [
  { key: 'psaBirthCertificate', label: 'Original PSA Birth Certificate', required: true, multiple: false, maxCount: 1 },
  { key: 'grade10ReportCard', label: 'Photocopy of Recent Grade 10 Report Card', required: true, multiple: true, maxCount: 2 },
  { key: 'goodMoralCertificate', label: 'Good Moral Certificate', required: true, multiple: false, maxCount: 1 },
  { key: 'escCertificate', label: 'ESC Certificate (for Private Junior High School)', required: false, multiple: false, maxCount: 1 },
];

// => JPG/PNG only - no PDF, no other image formats. This is enforced here
// => in JS, not just via the <input accept> attribute below, because
// => accept is only a browser-UI filter hint - someone can still pick a
// => PDF via "All Files" in the OS file picker, or drag-and-drop one in.
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png'];
const isValidFileType = (file) => ALLOWED_FILE_TYPES.includes(file.type);

const SHSStep2 = ({ data, onChange, documents, onDocumentsChange, onBack, onNext }) => {

  const [showErrors, setShowErrors] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    lastSchoolAttended: false,
    gradeLevelCompleted: false,
    schoolYearCompleted: false,
    cluster: false,
    class: false,
  });

  // => Per-document error flags, keyed by REQUIRED_DOCUMENTS' `key`
  const [docErrors, setDocErrors] = useState({});

  // => Separate from docErrors so the error message can say WHY it failed
  // => (wrong file type vs. missing/incomplete) instead of one generic line
  const [docTypeErrors, setDocTypeErrors] = useState({});

  // => Live cluster list (cluster_id + name), fetched once on mount -
  // => replaces the old hardcoded CLUSTERS array now that shs_clusters.value
  // => has been dropped and cluster_id is the only stable identifier.
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(true);

  // => Live batch list for the currently selected cluster - refetched
  // => whenever cluster changes. Empty array (after a completed fetch)
  // => means "no open batch yet" -> Reserve path.
  const [shsBatches, setShsBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesFetched, setBatchesFetched] = useState(false);

  // => Live curriculum for ALL clusters, fetched once the cluster list is
  // => in, keyed by cluster_id - shown inline in each cluster card below
  // => (which courses, tagged Grade 11 / Grade 12).
  const [clusterCourses, setClusterCourses] = useState({});
  const [clusterCoursesLoading, setClusterCoursesLoading] = useState(false);

  // => Fetch the cluster list once on mount
  useEffect(() => {
    setClustersLoading(true);
    fetch('/api/shs-clusters')
      .then((res) => res.json())
      .then((list) => setClusters(list))
      .catch((err) => console.error('Failed to fetch SHS clusters:', err))
      .finally(() => setClustersLoading(false));
  }, []);

  // => Once the cluster list is in, fetch each cluster's curriculum
  // => (which courses, tagged Grade 11 / Grade 12) keyed by cluster_id
  useEffect(() => {
    if (clusters.length === 0) return;

    setClusterCoursesLoading(true);
    Promise.all(
      clusters.map(({ cluster_id }) =>
        fetch(`/api/shs-clusters/${cluster_id}/courses`)
          .then((res) => res.json())
          .then((list) => [cluster_id, list])
          .catch((err) => {
            console.error(`Failed to fetch curriculum for cluster ${cluster_id}:`, err);
            return [cluster_id, []];
          })
      )
    )
      .then((entries) => setClusterCourses(Object.fromEntries(entries)))
      .finally(() => setClusterCoursesLoading(false));
  }, [clusters]);

  // => Batches are cluster-scoped only now (track was dropped from
  // => shs_batches), so this gates on data.cluster instead of data.track
  useEffect(() => {
    if (!data.cluster) {
      setShsBatches([]);
      setBatchesFetched(false);
      return;
    }

    setBatchesLoading(true);
    const params = new URLSearchParams({ clusterId: data.cluster });

    fetch(`/api/shs-batches?${params.toString()}`)
      .then((res) => res.json())
      .then((list) => {
        setShsBatches(list);
        setBatchesFetched(true);
      })
      .catch((err) => console.error('Failed to fetch SHS batches:', err))
      .finally(() => setBatchesLoading(false));
  }, [data.cluster]);

  // => True once we've actually checked and confirmed there's nothing open -
  // => used to decide whether "no batch selected" is valid (Reserve) or an error
  const noBatchesAvailable = batchesFetched && shsBatches.length === 0;

  // => Picks the course used for chatbot lookup. SHS clusters bundle 2+
  // => courses, but chatbot config is course_id based (same pattern
  // => already used by shs_course scope on SHSCourseDetail). Anchors on
  // => the first Grade 11 course in the cluster since that is the year
  // => the student is actually enrolling into right now, Grade 12
  // => entries are future curriculum. Falls back to the first course
  // => overall if none is tagged Grade 11, so this never returns null.
  const getChatbotAnchorCourseId = (clusterId) => {
    const courses = clusterCourses[clusterId] || [];
    const grade11Course = courses.find((c) => c.grade_level === 'Grade 11');
    return grade11Course?.course_id || courses[0]?.course_id || null;
  };

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const clearDocError = (key) => {
    setDocErrors(prev => ({ ...prev, [key]: false }));
    setDocTypeErrors(prev => ({ ...prev, [key]: false }));
  };

  // => True if a required document has between 1 and maxCount files
  // => selected - every document is array-based now, maxCount: 1 just
  // => means the array can only ever hold one file
  const isDocumentValid = (doc) => {
    if (!doc.required) return true;
    const val = documents[doc.key] || [];
    return val.length >= 1 && val.length <= doc.maxCount;
  };

  const allDocumentsValid = () => REQUIRED_DOCUMENTS.every(isDocumentValid);

  const validate = () => {
    if (!data.lastSchoolAttended) return 'missing';
    if (!data.gradeLevelCompleted) return 'missing';
    if (!data.schoolYearCompleted) return 'missing';
    if (!data.cluster) return 'missing';
    // => Class only required if there's actually one to pick - if the fetch
    // => came back empty, that's the valid Reserve path, not a missing field
    if (!data.class && !noBatchesAvailable) return 'missing';
    if (!allDocumentsValid()) return 'missing';
    return 'valid';
  };

  // => Appends newly picked files to whatever's already selected rather
  // => than replacing, since native <input multiple> re-fires with only
  // => the newly-picked batch each time, not the cumulative selection -
  // => same behavior as TESDAStep3's handleFileChange. Caps the combined
  // => total at doc.maxCount. Rejects the WHOLE batch if any file isn't
  // => JPG/PNG, rather than silently dropping just the bad one.
  const handleFileChange = (doc, fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const hasInvalidType = files.some((f) => !isValidFileType(f));
    if (hasInvalidType) {
      setDocErrors((prev) => ({ ...prev, [doc.key]: true }));
      setDocTypeErrors((prev) => ({ ...prev, [doc.key]: true }));
      return;
    }

    const existing = documents[doc.key] || [];
    const combined = [...existing, ...files].slice(0, doc.maxCount);
    onDocumentsChange(doc.key, combined);
    clearDocError(doc.key);
  };

  // => Removes one file by index and re-validates immediately, same
  // => pattern as TESDAStep3's handleRemoveFile
  const handleRemoveFile = (doc, index) => {
    const existing = documents[doc.key] || [];
    const updated = existing.filter((_, i) => i !== index);
    onDocumentsChange(doc.key, updated);

    const stillValid = !doc.required || (updated.length >= 1 && updated.length <= doc.maxCount);
    setDocErrors((prev) => ({ ...prev, [doc.key]: !stillValid }));
  };

  const handleNext = () => {
    setFieldErrors({
      lastSchoolAttended: !data.lastSchoolAttended,
      gradeLevelCompleted: !data.gradeLevelCompleted,
      schoolYearCompleted: !data.schoolYearCompleted,
      cluster: !data.cluster,
      class: !data.class && !noBatchesAvailable,
    });

    // => Build docErrors from REQUIRED_DOCUMENTS rather than hand-listing
    // => keys, so adding/removing a document later doesn't need a matching
    // => edit here too
    const newDocErrors = {};
    REQUIRED_DOCUMENTS.forEach((doc) => {
      newDocErrors[doc.key] = !isDocumentValid(doc);
    });
    setDocErrors(newDocErrors);

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    setFieldErrors({
      lastSchoolAttended: false, gradeLevelCompleted: false,
      schoolYearCompleted: false, cluster: false,
      class: false,
    });
    setDocErrors({});
    setDocTypeErrors({});
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="shs2-wrap">

      <div className="shs2-section-title">II. Academic Information</div>

      <div className="shs2-field-group">
        <label className="shs2-label">Last School Attended <span className="shs2-req">*</span></label>
        <input
          type="text"
          className={`shs2-input ${fieldErrors.lastSchoolAttended ? 'shs2-input--error' : ''}`}
          value={data.lastSchoolAttended}
          onChange={(e) => { applyProperCase(e, 'lastSchoolAttended', onChange); clearError('lastSchoolAttended'); }}
        />
      </div>

      <div className="shs2-field-group">
        <label className="shs2-label">School Address</label>
        <input
          type="text"
          className="shs2-input"
          placeholder="e.g. Cebu City, Cebu"
          value={data.schoolAddress}
          onChange={(e) => applyProperCase(e, 'schoolAddress', onChange)}
        />
      </div>

      <div className="shs2-grid shs2-g2">
        <div className="shs2-field-group">
          <label className="shs2-label">Grade Level Completed <span className="shs2-req">*</span></label>
          <input
            type="text"
            className={`shs2-input ${fieldErrors.gradeLevelCompleted ? 'shs2-input--error' : ''}`}
            placeholder="e.g. Grade 10"
            value={data.gradeLevelCompleted}
            onChange={(e) => { applyProperCase(e, 'gradeLevelCompleted', onChange); clearError('gradeLevelCompleted'); }}
          />
        </div>
        <div className="shs2-field-group">
          <label className="shs2-label">School Year Completed <span className="shs2-req">*</span></label>
          <input
            type="text"
            className={`shs2-input ${fieldErrors.schoolYearCompleted ? 'shs2-input--error' : ''}`}
            placeholder="e.g. 2025-2026"
            value={data.schoolYearCompleted}
            onChange={(e) => { onChange('schoolYearCompleted', e.target.value); clearError('schoolYearCompleted'); }}
          />
        </div>
      </div>

      {/* => Section III: Strengthened SHS Enrollment Details */}
      <div className="shs2-section-title" style={{ marginTop: '1.4rem' }}>
        III. Strengthened Senior High School Enrollment Details
      </div>

      {/* => Select Cluster - Track selection removed entirely (only
           Technical Professional Track is offered). Cluster list is now
           fetched live from /api/shs-clusters (id + name) instead of a
           hardcoded array, since shs_clusters.value was dropped from the DB. */}
      <div className="shs2-field-group">
        <label className="shs2-label">Select Cluster <span className="shs2-req">*</span> <span className="shs2-hint-inline">(Choose 1 cluster)</span> <Info content="A cluster is your chosen specialization track under Strengthened Senior High School. It determines which subjects and skills you'll focus on - you can only select one." /></label>
        <div className={`shs2-cluster-list ${fieldErrors.cluster ? 'shs2-radio--error' : ''}`}>
          {clustersLoading ? (
            <span className="shs2-cluster-specs">Loading clusters…</span>
          ) : (
            clusters.map(({ cluster_id, name }) => {
              const courses = clusterCourses[cluster_id] || [];
              return (
                <label key={cluster_id} className="shs2-cluster-option">
                  <input
                    type="radio"
                    name="cluster"
                    value={cluster_id}
                    checked={String(data.cluster) === String(cluster_id)}
                    onChange={(e) => { onChange('cluster', e.target.value); clearError('cluster'); }}
                  />
                  <span className="shs2-cluster-text">
                    <span className="shs2-cluster-label">{name}</span>
                    {clusterCoursesLoading ? (
                      <span className="shs2-cluster-specs">Loading curriculum…</span>
                    ) : courses.length === 0 ? (
                      <span className="shs2-cluster-specs">Curriculum not yet published for this cluster.</span>
                    ) : (
                      <span className="shs2-cluster-specs">
                        {courses.map(({ course_id, title, grade_level, course_link }) => (
                          <span key={course_id} className="shs2-cluster-spec">
                            • {course_link ? (
                              <a href={course_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{title}</a>
                            ) : title}
                            {' '}
                            <span className="shs2-cluster-spec-grade">({grade_level})</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* => only mounts once a cluster is picked, since there is nothing
             to anchor the chatbot lookup to before that */}
      {data.cluster && (
        <ChatbotWidget scope="shs_course" courseId={getChatbotAnchorCourseId(data.cluster)} />
      )}

      <div className="shs2-field-group">
        <label className="shs2-label">
          Select Class <span className="shs2-req">*</span>
        </label>

        {/* => Reserve path: fetch completed, cluster selected, but
             nothing open yet - show a static notice instead of a dropdown */}
        {noBatchesAvailable ? (
          <div className="shs2-reserve-notice">
            <i className="ti ti-clock" /> No open class yet for this selection - your enrollment will be marked as <strong>Reserved</strong> until one is available.
          </div>
        ) : (
          <select
            className={`shs2-select ${fieldErrors.class ? 'shs2-input--error' : ''}`}
            value={data.class}
            disabled={!data.cluster || batchesLoading}
            onChange={(e) => {
              onChange('class', e.target.value);
              clearError('class');
            }}
          >
            <option value="">
              {batchesLoading ? 'Loading classes...' : 'Select class'}
            </option>
            {shsBatches.map(({ batch_id, batch_name, start_date, end_date, remaining_slots }) => {
              // => Pending batches can have NULL start_date/end_date until
              // => the admin firms up a schedule - show "Dates TBA" instead
              // => of an Invalid Date string in that case, same pattern
              // => used in TESDAStep3.jsx's batch dropdown
              const dateRange = (start_date && end_date)
                ? `${new Date(start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} → ${new Date(end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'Dates TBA';

              return (
                <option key={batch_id} value={batch_id}>
                  {batch_name} · {dateRange} · {remaining_slots} approved slot{remaining_slots !== 1 ? 's' : ''} left
                </option>
              );
            })}
          </select>
        )}
      </div>

      <div className="shs2-field-group">
        <label className="shs2-label">
          Select Electives <span className="shs2-hint-inline">(if applicable)</span>
          <Info content="Electives are optional subjects outside your chosen cluster's core curriculum. If you'd like to take any, list them here - otherwise, leave this blank." />
        </label>
        <input
          type="text"
          className="shs2-input"
          value={data.electives}
          onChange={(e) => applyProperCase(e, 'electives', onChange)}
        />
      </div>

      {/* => Requirements for Enrollment - from the physical form's sidebar
           document checklist. Lives here since course/track selection is
           already in this step - keeps "what to submit" in one place. */}
      <div className="shs2-section-title" style={{ marginTop: '1.6rem' }}>
        Requirements for Enrollment
      </div>
      <p className="shs2-label">
        <strong>Note:</strong> The 1x1 and 2x2 pictures must be submitted physically at the office.
        Original documents may still be presented at the office for verification, and its photocopies may be submitted physically.
      </p>

      {/* => Informational only, not an upload field - these photos are
           physical submissions handled at the office, not through this
           form, so this just tells the applicant what to prepare and
           when they're allowed to bring it in */}
      <div className="shs2-photo-requirements">
        <p className="shs2-label">
          2x2 and 1x1 ID Pictures <span className="shs2-req">*</span>
        </p>
        <ul className="shs2-photo-list">
          <li>2x2 picture - 2 pcs</li>
          <li>1x1 picture - 4 pcs</li>
        </ul>
        <p className="shs2-upload-desc">
          These are not uploaded here. Please prepare physical copies and
          submit them at the office once your enrollment status has been
          marked "Reviewed."
        </p>
      </div>

      <div className="shs2-uploads">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const selectedFiles = documents[doc.key] || [];

          return (
            <div key={doc.key} className="shs2-upload-group">
              <label className="shs2-upload-label">
                {doc.label} {doc.required && <span className="shs2-req">*</span>}
              </label>

              <div className="shs2-file-wrapper">

                {/* => Each chosen file gets its own row with a remove
                     button - same pattern as TESDAStep3's upload list,
                     kept visually consistent across both enrollment forms */}
                {selectedFiles.length > 0 && (
                  <div className="shs2-file-list">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="shs2-file-row">
                        <i className="ti ti-circle-check shs2-file-icon" />
                        <span className="shs2-file-name">{file.name}</span>
                        <button
                          type="button"
                          className="shs2-file-remove-btn"
                          onClick={() => handleRemoveFile(doc, index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <img src={rejectedIcon} alt="" className="shs2-file-remove-icon" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* => Only shown while there's still room left under
                     maxCount - hides once the cap is reached */}
                {selectedFiles.length < doc.maxCount && (
                  <>
                    <input
                      type="file"
                      id={`upload-${doc.key}`}
                      className="shs2-file-input"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      multiple={doc.maxCount > 1}
                      onChange={(e) => {
                        handleFileChange(doc, e.target.files);
                        e.target.value = ''; // => allow re-selecting the same filename later
                      }}
                    />
                    <label
                      htmlFor={`upload-${doc.key}`}
                      className={`shs2-file-label ${docErrors[doc.key] ? 'shs2-file-label--error' : ''}`}
                    >
                      <i className="ti ti-upload shs2-file-icon" />
                      <span>
                        {selectedFiles.length > 0
                          ? `Add file (${doc.maxCount - selectedFiles.length} remaining)`
                          : `Click to upload file${doc.maxCount > 1 ? 's' : ''}`}
                      </span>
                    </label>
                  </>
                )}
              </div>

              <p className="shs2-upload-desc">
                {doc.maxCount > 1
                  ? `You may upload up to ${doc.maxCount} files.`
                  : '1 file needed.'}
                {!doc.required && ' Optional - only needed if applicable.'}
              </p>

              {docErrors[doc.key] && (
                <span className="shs2-file-error">
                  {docTypeErrors[doc.key]
                    ? 'Only JPG and PNG files are allowed.'
                    : `Please upload at least 1 file${doc.maxCount > 1 ? ` (up to ${doc.maxCount})` : ''}.`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="shs2-error-banner">
          <i className="ti ti-alert-circle" />
          Please fill in all required fields (denoted with ' * ') before proceeding.
        </div>
      )}

      {/* => Navigation */}
      <div className="shs2-nav">
        <button className="shs2-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button className="shs2-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default SHSStep2;