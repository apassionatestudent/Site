import React, { useState } from 'react';
import './SHSStep2.css';
// => Remove-file icon for the upload section below - swapped in from your
// => own assets instead of a webfont icon class, since the Tabler icon
// => glyph wasn't rendering for this one.
import rejectedIcon from '../../../assets/icons/rejected.png';

// => Tracks from the physical Grade 11 SY 2026-2027 enrollment form,
// => Section III "STRENGTHENED SENIOR HIGH SCHOOL ENROLLMENT DETAILS"
const TRACKS = [
  { value: 'academic', label: 'Academic Track' },
  { value: 'tech_prof', label: 'Technical Professional Track' },
];

// => Clusters only apply when Technical Professional Track is chosen.
// => RESOLVED: the physical enrollment form printed "Hospitality and
// => Tourism" as two separate checkboxes with different specializations
// => under each. The official SY 2026-2027 promotional flyer confirms
// => this was a form printing split, not two real clusters - it's ONE
// => Hospitality and Tourism cluster with all 4 specializations. Merged
// => below. The flyer also gave us specializations for Construction and
// => Building Technology + Industrial Technologies, which the enrollment
// => form didn't print sub-bullets for.
const CLUSTERS = [
  {
    value: 'construction_building_tech',
    label: 'Construction and Building Technology',
    specializations: ['Manual Metal Arc Welding', 'Technical Drafting'],
  },
  {
    value: 'industrial_technologies',
    label: 'Industrial Technologies',
    specializations: ['Electrical Installation and Maintenance', 'Electronics Product Assembly and Servicing'],
  },
  {
    value: 'hospitality_tourism',
    label: 'Hospitality and Tourism',
    specializations: [
      'Bakery Operations',
      'Kitchen Operations',
      'Hotel Operation (Housekeeping Services)',
      'Food and Beverage Operation',
    ],
  },
];

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
  { key: 'escCertificate', label: 'ESC Certificate (for Private JHS)', required: false, multiple: false },
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
    track: false,
    cluster: false,
  });

  // => Per-document error flags, keyed by REQUIRED_DOCUMENTS' `key`
  const [docErrors, setDocErrors] = useState({});

  // => Separate from docErrors so the error message can say WHY it failed
  // => (wrong file type vs. missing/incomplete) instead of one generic line
  const [docTypeErrors, setDocTypeErrors] = useState({});

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  const clearDocError = (key) => {
    setDocErrors(prev => ({ ...prev, [key]: false }));
    setDocTypeErrors(prev => ({ ...prev, [key]: false }));
  };

  // => Cluster selection only required when Technical Professional Track is chosen
  const clusterRequired = data.track === 'tech_prof';

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
    if (!data.track) return 'missing';
    if (clusterRequired && !data.cluster) return 'missing';
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
      track: !data.track,
      cluster: clusterRequired && !data.cluster,
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
      schoolYearCompleted: false, track: false, cluster: false,
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

      <div className="shs2-field-group">
        <label className="shs2-label">Preferred Track <span className="shs2-req">*</span> <span className="shs2-hint-inline">(Choose 1 track)</span></label>
        <div className={`shs2-radio-group shs2-radio-group--wrap ${fieldErrors.track ? 'shs2-radio--error' : ''}`}>
          {TRACKS.map(({ value, label }) => (
            <label key={value} className="shs2-radio-label">
              <input
                type="radio"
                name="track"
                value={value}
                checked={data.track === value}
                onChange={(e) => {
                  onChange('track', e.target.value);
                  // => Clear cluster when switching away from Tech-Prof
                  if (e.target.value !== 'tech_prof') onChange('cluster', '');
                  clearError('track');
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* => Cluster - only shown when Technical Professional Track is chosen */}
      {clusterRequired && (
        <div className="shs2-field-group">
          <label className="shs2-label">Preferred Cluster <span className="shs2-req">*</span> <span className="shs2-hint-inline">(Choose 1 cluster)</span></label>
          <div className={`shs2-cluster-list ${fieldErrors.cluster ? 'shs2-radio--error' : ''}`}>
            {CLUSTERS.map(({ value, label, specializations }) => (
              <label key={value} className="shs2-cluster-option">
                <input
                  type="radio"
                  name="cluster"
                  value={value}
                  checked={data.cluster === value}
                  onChange={(e) => { onChange('cluster', e.target.value); clearError('cluster'); }}
                />
                <span className="shs2-cluster-text">
                  <span className="shs2-cluster-label">{label}</span>
                  {specializations.length > 0 && (
                    <span className="shs2-cluster-specs">
                      {specializations.map(s => (
                        <span key={s} className="shs2-cluster-spec">• {s}</span>
                      ))}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="shs2-field-group">
        <label className="shs2-label">Preferred Electives <span className="shs2-hint-inline">(if applicable)</span></label>
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
