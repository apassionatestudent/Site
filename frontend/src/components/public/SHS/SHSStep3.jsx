import React, { useState } from 'react';
import './SHSStep3.css';

// => Validates Philippine mobile number - same rule as SHSStep1/TESDAStep1
const validateMobile = (value) => {
  if (!value) return null; // => optional per-field, only enforced where explicitly required below
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

// => Capitalizes first letter of each word, lowercases the rest - same
// => helper duplicated in SHSStep1/SHSStep2 (kept per-file, not shared).
// => Applied on every keystroke (onChange) per direction. Excluded on
// => purpose: allergies, maintenanceMedication, medicalConditionDetail
// => (descriptive text, not proper nouns) and contact numbers (numeric).
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

const SHSStep3 = ({
  data, onChange,
  privacyData, onPrivacyChange,
  onBack, onSubmit,   // => onSubmit replaces onNext since this is the last SHS step
}) => {

  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // => Tracks which quick-fill button (if any) was last used for Emergency
  // => Contact, purely for the active-button highlight - doesn't gate
  // => anything, fields stay freely editable after prefilling.
  const [emergencyPrefill, setEmergencyPrefill] = useState('');

  const [fieldErrors, setFieldErrors] = useState({
    parentOrGuardian: false, // => at least one of father/mother/guardian name required
    emergencyName: false,
    emergencyRelationship: false,
    emergencyContactNo: false,
    emergencyAddress: false,
    hasMedicalCondition: false,
    medicalConditionDetail: false,
  });

  const [privacyErrors, setPrivacyErrors] = useState({ agreed: false });

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => UPDATED RULE: valid only if BOTH Father AND Mother are filled, OR
  // => Guardian alone is filled. A single parent by themselves (father-only
  // => or mother-only, no guardian) is NOT enough anymore - it's either the
  // => full parent pair, or just the guardian standing in for both.
  const hasBothParents = !!(data.fatherName.trim() && data.motherName.trim());
  const hasGuardianOnly = !!data.guardianName.trim();
  const familyInfoValid = hasBothParents || hasGuardianOnly;

  const validate = () => {
    if (!familyInfoValid) return 'missing';
    if (!data.emergencyName) return 'missing';
    if (!data.emergencyRelationship) return 'missing';
    if (!data.emergencyContactNo) return 'missing';
    if (!data.emergencyAddress) return 'missing';
    if (!data.hasMedicalCondition) return 'missing';
    if (data.hasMedicalCondition === 'yes' && !data.medicalConditionDetail.trim()) return 'missing';
    if (validateMobile(data.emergencyContactNo)) return 'error';
    if (data.fatherContactNo && validateMobile(data.fatherContactNo)) return 'error';
    if (data.motherContactNo && validateMobile(data.motherContactNo)) return 'error';
    if (data.guardianContactNo && validateMobile(data.guardianContactNo)) return 'error';
    if (!privacyData.agreed) return 'missing';
    return 'valid';
  };

  const handleSubmit = async () => {
    setFieldErrors({
      parentOrGuardian: !familyInfoValid,
      emergencyName: !data.emergencyName,
      emergencyRelationship: !data.emergencyRelationship,
      emergencyContactNo: !data.emergencyContactNo || !!validateMobile(data.emergencyContactNo),
      emergencyAddress: !data.emergencyAddress,
      hasMedicalCondition: !data.hasMedicalCondition,
      medicalConditionDetail: data.hasMedicalCondition === 'yes' && !data.medicalConditionDetail.trim(),
    });
    setPrivacyErrors({ agreed: !privacyData.agreed });

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    setFieldErrors({
      parentOrGuardian: false, emergencyName: false, emergencyRelationship: false,
      emergencyContactNo: false, emergencyAddress: false,
      hasMedicalCondition: false, medicalConditionDetail: false,
    });
    setPrivacyErrors({ agreed: false });
    setShowErrors(false);

    // => Mirrors TESDAStep5's isSubmitting guard so the Back/Submit buttons
    // => disable while handleShsSubmit (in Enroll.jsx) awaits the fetch call
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shs3-wrap">

      <div className="shs3-section-title">IV. Parent / Guardian Information</div>

      {fieldErrors.parentOrGuardian && (
        <p className="shs3-hint shs3-hint--error">
          Please provide either both Father and Mother information, or Guardian information alone below.
        </p>
      )}

      <div className="shs3-grid shs3-g2">
        <div className="shs3-family-col">
          <div className="shs3-field-group">
            <label className="shs3-label">Father's Name</label>
            <input
              type="text"
              className="shs3-input"
              value={data.fatherName}
              onChange={(e) => { applyProperCase(e, 'fatherName', onChange); clearError('parentOrGuardian'); }}
            />
          </div>
          <div className="shs3-field-group">
            <label className="shs3-label">Occupation</label>
            <input
              type="text"
              className="shs3-input"
              value={data.fatherOccupation}
              onChange={(e) => applyProperCase(e, 'fatherOccupation', onChange)}
            />
          </div>
          <div className="shs3-field-group">
            <label className="shs3-label">Contact Number</label>
            <input
              type="text"
              className="shs3-input"
              maxLength={11}
              placeholder="09XXXXXXXXX"
              value={data.fatherContactNo}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                onChange('fatherContactNo', raw);
              }}
            />
            <span className="shs3-field-hint">Must start with 09 and be exactly 11 digits.</span>
          </div>
        </div>

        <div className="shs3-family-col">
          <div className="shs3-field-group">
            <label className="shs3-label">Mother's Name</label>
            <input
              type="text"
              className="shs3-input"
              value={data.motherName}
              onChange={(e) => { applyProperCase(e, 'motherName', onChange); clearError('parentOrGuardian'); }}
            />
          </div>
          <div className="shs3-field-group">
            <label className="shs3-label">Occupation</label>
            <input
              type="text"
              className="shs3-input"
              value={data.motherOccupation}
              onChange={(e) => applyProperCase(e, 'motherOccupation', onChange)}
            />
          </div>
          <div className="shs3-field-group">
            <label className="shs3-label">Contact Number</label>
            <input
              type="text"
              className="shs3-input"
              maxLength={11}
              placeholder="09XXXXXXXXX"
              value={data.motherContactNo}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                onChange('motherContactNo', raw);
              }}
            />
            <span className="shs3-field-hint">Must start with 09 and be exactly 11 digits.</span>
          </div>
        </div>
      </div>

      <div className="shs3-field-group" style={{ marginTop: '0.4rem' }}>
        <label className="shs3-label">Guardian's Name</label>
        <input
          type="text"
          className="shs3-input"
          value={data.guardianName}
          onChange={(e) => { applyProperCase(e, 'guardianName', onChange); clearError('parentOrGuardian'); }}
        />
      </div>
      <div className="shs3-grid shs3-g3">
        <div className="shs3-field-group">
          <label className="shs3-label">Occupation</label>
          <input
            type="text"
            className="shs3-input"
            value={data.guardianOccupation}
            onChange={(e) => applyProperCase(e, 'guardianOccupation', onChange)}
          />
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">Relationship to Student</label>
          <input
            type="text"
            className="shs3-input"
            value={data.guardianRelationship}
            onChange={(e) => applyProperCase(e, 'guardianRelationship', onChange)}
          />
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">Contact Number</label>
          <input
            type="text"
            className="shs3-input"
            maxLength={11}
            placeholder="09XXXXXXXXX"
            value={data.guardianContactNo}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
              onChange('guardianContactNo', raw);
            }}
          />
          <span className="shs3-field-hint">Must start with 09 and be exactly 11 digits.</span>
        </div>
      </div>

      {/* => Section V: Emergency Contact Information - required, no
           "if applicable" annotation on the physical form */}
      <div className="shs3-section-title" style={{ marginTop: '1.6rem' }}>
        V. Emergency Contact Information
      </div>

      {/* => Quick-fill from an existing Father/Mother/Guardian record, or
           "Someone Else" to clear and enter a different person manually.
           Purely a convenience action - all fields below stay freely
           editable after clicking one of these; nothing gets locked. */}
      <div className="shs3-field-group">
        <label className="shs3-label">Quick Fill <span className="shs3-hint-inline">(optional)</span></label>
        <div className="shs3-quickfill-row">
          <button
            type="button"
            className={`shs3-quickfill-btn ${emergencyPrefill === 'father' ? 'shs3-quickfill-btn--active' : ''}`}
            disabled={!data.fatherName}
            onClick={() => {
              setEmergencyPrefill('father');
              onChange('emergencyName', data.fatherName);
              onChange('emergencyRelationship', 'Father');
              onChange('emergencyContactNo', data.fatherContactNo);
              clearError('emergencyName');
              clearError('emergencyRelationship');
              clearError('emergencyContactNo');
            }}
          >
            Same as Father
          </button>
          <button
            type="button"
            className={`shs3-quickfill-btn ${emergencyPrefill === 'mother' ? 'shs3-quickfill-btn--active' : ''}`}
            disabled={!data.motherName}
            onClick={() => {
              setEmergencyPrefill('mother');
              onChange('emergencyName', data.motherName);
              onChange('emergencyRelationship', 'Mother');
              onChange('emergencyContactNo', data.motherContactNo);
              clearError('emergencyName');
              clearError('emergencyRelationship');
              clearError('emergencyContactNo');
            }}
          >
            Same as Mother
          </button>
          <button
            type="button"
            className={`shs3-quickfill-btn ${emergencyPrefill === 'guardian' ? 'shs3-quickfill-btn--active' : ''}`}
            disabled={!data.guardianName}
            onClick={() => {
              setEmergencyPrefill('guardian');
              onChange('emergencyName', data.guardianName);
              onChange('emergencyRelationship', data.guardianRelationship || 'Guardian');
              onChange('emergencyContactNo', data.guardianContactNo);
              clearError('emergencyName');
              clearError('emergencyRelationship');
              clearError('emergencyContactNo');
            }}
          >
            Same as Guardian
          </button>
          <button
            type="button"
            className={`shs3-quickfill-btn ${emergencyPrefill === 'other' ? 'shs3-quickfill-btn--active' : ''}`}
            onClick={() => {
              setEmergencyPrefill('other');
              onChange('emergencyName', '');
              onChange('emergencyRelationship', '');
              onChange('emergencyContactNo', '');
            }}
          >
            Someone Else
          </button>
        </div>
        {/* => Note: Address is never prefilled - Father/Mother/Guardian
             addresses aren't collected anywhere in this form, only the
             student's Home Address (Step 1). Always entered manually here. */}
        <span className="shs3-field-hint">
          Selecting one fills in Name, Relationship, and Contact Number below - Address is always entered manually.
        </span>
      </div>

      <div className="shs3-grid shs3-g2">
        <div className="shs3-field-group">
          <label className="shs3-label">Name of Emergency Contact <span className="shs3-req">*</span></label>
          <input
            type="text"
            className={`shs3-input ${fieldErrors.emergencyName ? 'shs3-input--error' : ''}`}
            value={data.emergencyName}
            onChange={(e) => { applyProperCase(e, 'emergencyName', onChange); clearError('emergencyName'); }}
          />
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">Relationship to Student <span className="shs3-req">*</span></label>
          <input
            type="text"
            className={`shs3-input ${fieldErrors.emergencyRelationship ? 'shs3-input--error' : ''}`}
            value={data.emergencyRelationship}
            onChange={(e) => { applyProperCase(e, 'emergencyRelationship', onChange); clearError('emergencyRelationship'); }}
          />
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">Contact Number <span className="shs3-req">*</span></label>
          <input
            type="text"
            className={`shs3-input ${fieldErrors.emergencyContactNo ? 'shs3-input--error' : ''}`}
            maxLength={11}
            placeholder="09XXXXXXXXX"
            value={data.emergencyContactNo}
            onChange={(e) => {
              onChange('emergencyContactNo', e.target.value.replace(/\D/g, '').slice(0, 11));
              clearError('emergencyContactNo');
            }}
          />
          <span className="shs3-field-hint">Must start with 09 and be exactly 11 digits.</span>
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">Address <span className="shs3-req">*</span></label>
          <input
            type="text"
            className={`shs3-input ${fieldErrors.emergencyAddress ? 'shs3-input--error' : ''}`}
            value={data.emergencyAddress}
            onChange={(e) => { applyProperCase(e, 'emergencyAddress', onChange); clearError('emergencyAddress'); }}
          />
        </div>
      </div>

      {/* => Section VI: Health Information */}
      <div className="shs3-section-title" style={{ marginTop: '1.6rem' }}>
        VI. Health Information
      </div>

      <div className="shs3-field-group">
        <label className="shs3-label">Does the student have any medical condition/s? <span className="shs3-req">*</span></label>
        <div className={`shs3-radio-group ${fieldErrors.hasMedicalCondition ? 'shs3-radio--error' : ''}`}>
          <label className="shs3-radio-label">
            <input
              type="radio"
              name="hasMedicalCondition"
              value="none"
              checked={data.hasMedicalCondition === 'none'}
              onChange={(e) => {
                onChange('hasMedicalCondition', e.target.value);
                onChange('medicalConditionDetail', '');
                // => "None" also clears Allergies/Medication - those are
                //    gated behind hasMedicalCondition now, not independent.
                onChange('allergies', '');
                onChange('maintenanceMedication', '');
                clearError('hasMedicalCondition');
              }}
            />
            <span>None</span>
          </label>
          <label className="shs3-radio-label">
            <input
              type="radio"
              name="hasMedicalCondition"
              value="yes"
              checked={data.hasMedicalCondition === 'yes'}
              onChange={(e) => { onChange('hasMedicalCondition', e.target.value); clearError('hasMedicalCondition'); }}
            />
            <span>Yes (please specify)</span>
          </label>
          {data.hasMedicalCondition === 'yes' && (
            <input
              type="text"
              className={`shs3-inline-input ${fieldErrors.medicalConditionDetail ? 'shs3-input--error' : ''}`}
              placeholder="Please specify..."
              value={data.medicalConditionDetail}
              onChange={(e) => { onChange('medicalConditionDetail', e.target.value); clearError('medicalConditionDetail'); }}
            />
          )}
        </div>
      </div>

      <div className="shs3-grid shs3-g2">
        <div className="shs3-field-group">
          <label className="shs3-label">
            Allergies (if any)
            {/* => Only relevant once a medical condition is declared */}
            <span className="shs3-hint-inline"> (requires "Yes" above)</span>
          </label>
          <input
            type="text"
            className="shs3-input"
            value={data.allergies}
            disabled={data.hasMedicalCondition !== 'yes'}
            onChange={(e) => onChange('allergies', e.target.value)}
          />
        </div>
        <div className="shs3-field-group">
          <label className="shs3-label">
            Maintenance Medication (if any)
            <span className="shs3-hint-inline"> (requires "Yes" above)</span>
          </label>
          <input
            type="text"
            className="shs3-input"
            value={data.maintenanceMedication}
            disabled={data.hasMedicalCondition !== 'yes'}
            onChange={(e) => onChange('maintenanceMedication', e.target.value)}
          />
        </div>
      </div>

      {/* => Consent - replaces Section VII's signature block. Per stakeholder
           direction, no signature capture; just the data-privacy consent
           checkbox, same pattern as TESDAStep5's ts5-consent-label. */}
      <div className="shs3-section-title" style={{ marginTop: '1.6rem' }}>
        Data Privacy Consent
      </div>

      <div className="shs3-policy-box">
        <p className="shs3-policy-text">
          By submitting this form, you certify that the information provided
          is true and correct, and you consent to <strong>3A Prime Hospitality Training and Assessment Center Inc.</strong>{' '}
          collecting and processing the learner's personal data under the{' '}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
          Read our full{' '}
          <a href="/termsandconditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>{' '}
          and{' '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </div>

      <label className={`shs3-consent-label ${privacyErrors.agreed ? 'shs3-consent--error' : ''}`}>
        <input
          type="checkbox"
          className="shs3-consent-checkbox"
          checked={privacyData.agreed}
          onChange={(e) => {
            onPrivacyChange('agreed', e.target.checked);
            setPrivacyErrors(prev => ({ ...prev, agreed: false }));
          }}
        />
        <span>
          I have read and understood the certification above and I consent to
          the collection and processing of the learner's personal information
          by 3A Prime Hospitality Training and Assessment Center Inc.. <span className="shs3-req">*</span>
        </span>
      </label>

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="shs3-error-banner">
          <i className="ti ti-alert-circle" />
          {validate() === 'error'
            ? 'Please correct the errors above before proceeding.'
            : "Please fill in all required fields (denoted with ' * ') before submitting."
          }
        </div>
      )}

      {/* => Navigation */}
      <div className="shs3-nav">
        <button className="shs3-btn-back" onClick={onBack} disabled={isSubmitting}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button className="shs3-btn-next" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <i className="ti ti-loader-2 shs3-spinner" />
              Submitting...
            </>
          ) : (
            <>
              Submit Enrollment <i className="ti ti-send" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default SHSStep3;
