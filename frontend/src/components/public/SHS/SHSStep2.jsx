import React, { useState, useEffect } from 'react';
import './SHSStep2.css';
// => Remove-file icon for the upload section below - swapped in from your
// => own assets instead of a webfont icon class, since the Tabler icon
// => glyph wasn't rendering for this one.
import rejectedIcon from '../../../assets/icons/rejected.png';

import Info from '../../Info.jsx';

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
const REQUIRED_DOCUMENTS = [
  { key: 'psaBirthCertificate', label: 'Original PSA Birth Certificate', required: true, multiple: false },
  { key: 'grade10ReportCard', label: 'Photocopy of Recent Grade 10 Report Card', required: true, multiple: false },
  { key: 'goodMoralCertificate', label: 'Good Moral Certificate', required: true, multiple: false },
  { key: 'escCertificate', label: 'ESC Certificate (for Private Junior High School)', required: false, multiple: false },
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

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const clearDocError = (key) => {
    setDocErrors(prev => ({ ...prev, [key]: false }));
    setDocTypeErrors(prev => ({ ...prev, [key]: false }));
  };

  // => True if a single required document's value satisfies its rule -
  // => single file present, or exact photo count for multi-file ones
  const isDocumentValid = (doc) => {
    if (!doc.required) return true;
    const val = documents[doc.key];
    return doc.multiple
      ? Array.isArray(val) && val.length === doc.exactCount
      : !!val;
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

  // => Handles both single-file and multi-file (2x2/1x1 photos) inputs.
  // => Multi-file appends to whatever's already selected rather than
  // => replacing, since the native <input multiple> re-fires with only
  // => the newly-picked batch each time, not the cumulative selection.
  // => Rejects the WHOLE batch if any file isn't JPG/PNG, rather than
  // => silently dropping just the bad one - so it's obvious something
  // => needs to be re-picked instead of quietly having fewer files than expected.
  const handleFileChange = (key, fileList, multiple) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const hasInvalidType = files.some((f) => !isValidFileType(f));
    if (hasInvalidType) {
      setDocErrors((prev) => ({ ...prev, [key]: true }));
      setDocTypeErrors((prev) => ({ ...prev, [key]: true }));
      return;
    }

    if (multiple) {
      const existing = documents[key] || [];
      onDocumentsChange(key, [...existing, ...files]);
    } else {
      onDocumentsChange(key, files[0] || null);
    }
    clearDocError(key);
  };

  const removeFile = (key, index) => {
    const existing = documents[key] || [];
    onDocumentsChange(key, existing.filter((_, i) => i !== index));
  };

  const removeSingleFile = (key) => {
    onDocumentsChange(key, null);
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
        <label className="shs2-label">Select Cluster <span className="shs2-req">*</span> <span className="shs2-hint-inline">(Choose 1 cluster)</span> <Info content="Sample content" /></label>
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
            {shsBatches.map(({ batch_id, batch_name }) => (
              <option key={batch_id} value={batch_id}>
                {batch_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="shs2-field-group">
        <label className="shs2-label">Select Electives <span className="shs2-hint-inline">(if applicable)</span></label>
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
      <br />


      <div className="shs2-uploads">
        {REQUIRED_DOCUMENTS.map((doc) => (
          <div key={doc.key} className="shs2-upload-group">
            <label className="shs2-upload-label">
              {doc.label} {doc.required && <span className="shs2-req">*</span>}
            </label>

            {/* => Single-file documents: Birth Certificate, Report Card,
                 Good Moral, ESC Certificate */}
            {!doc.multiple && (
              <div className="shs2-file-wrapper">
                <input
                  type="file"
                  id={`upload-${doc.key}`}
                  className="shs2-file-input"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(doc.key, e.target.files, false)}
                />
                <label
                  htmlFor={`upload-${doc.key}`}
                  className={`shs2-file-label ${documents[doc.key] ? 'has-file' : ''} ${docErrors[doc.key] ? 'shs2-file-label--error' : ''}`}
                >
                  <i className={`ti ${documents[doc.key] ? 'ti-circle-check' : 'ti-upload'} shs2-file-icon`} />
                  <span className="shs2-file-name">
                    {documents[doc.key] ? documents[doc.key].name : 'Click to upload file'}
                  </span>
                </label>
                {documents[doc.key] && (
                  <button
                    type="button"
                    className="shs2-file-remove"
                    onClick={() => removeSingleFile(doc.key)}
                    aria-label="Remove file"
                  >
                    {/* => Using your own rejected.png instead of a webfont
                         icon - avoids depending on the icon font loading
                         or having that specific glyph included at all. */}
                    <img src={rejectedIcon} alt="Remove file" className="shs2-remove-icon" />
                  </button>
                )}
              </div>
            )}

            {/* => Multi-file documents: 2x2 and 1x1 photos, each needing an
                 exact count rather than "at least one" */}
            {doc.multiple && (
              <>
                <div className="shs2-file-wrapper">
                  <input
                    type="file"
                    id={`upload-${doc.key}`}
                    className="shs2-file-input"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => {
                      handleFileChange(doc.key, e.target.files, true);
                      e.target.value = ''; // => allow re-selecting the same filename later
                    }}
                  />
                  <label
                    htmlFor={`upload-${doc.key}`}
                    className={`shs2-file-label ${(documents[doc.key]?.length > 0) ? 'has-file' : ''} ${docErrors[doc.key] ? 'shs2-file-label--error' : ''}`}
                  >
                    <i className="ti ti-upload shs2-file-icon" />
                    <span className="shs2-file-name">
                      Add photo ({(documents[doc.key] || []).length} of {doc.exactCount} selected)
                    </span>
                  </label>
                </div>
                {(documents[doc.key] || []).length > 0 && (
                  <div className="shs2-file-chip-list">
                    {documents[doc.key].map((file, idx) => (
                      <span key={`${file.name}-${idx}`} className="shs2-file-chip">
                        {file.name}
                        <button type="button" onClick={() => removeFile(doc.key, idx)} aria-label="Remove file">
                          <img src={rejectedIcon} alt="Remove file" className="shs2-remove-icon shs2-remove-icon--small" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <p className="shs2-upload-desc">
              {doc.multiple
                ? `Exactly ${doc.exactCount} recent photo${doc.exactCount > 1 ? 's' : ''} required.`
                : doc.required ? 'Required document.' : 'Optional - only needed if applicable.'}
            </p>

            {docErrors[doc.key] && (
              <span className="shs2-file-error">
                {docTypeErrors[doc.key]
                  ? 'Only JPG and PNG files are allowed.'
                  : doc.multiple ? `Please upload exactly ${doc.exactCount} photos.` : 'This document is required.'}
              </span>
            )}
          </div>
        ))}
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