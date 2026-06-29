import React, { useState } from 'react';
import './TESDAStep4.css';

const TESDAStep4 = ({ data, onChange, onBack, onNext }) => {

  const [showErrors, setShowErrors] = useState(false);

  // => takenBefore is required; where/when only required if yes
  const validate = () => {
    if (!data.takenBefore) return 'missing';
    if (data.takenBefore === 'yes') {
      if (!data.where.trim()) return 'missing';
      if (!data.when.trim()) return 'missing';
    }
    return 'valid';
  };

  const handleNext = () => {
    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="ts4-wrap">

      <div className="ts4-section-title">NCAE / YP4SC</div>

      {/* => Yes / No radio */}
      <div className="ts4-field-group">
        <label className="ts4-label">
          Have you taken NCAE / YP4SC before? <span className="ts4-req">*</span>
        </label>
        <div className="ts4-radio-group">
          {['yes', 'no'].map(opt => (
            <label key={opt} className="ts4-radio-label">
              <input
                type="radio"
                name="takenBefore"
                value={opt}
                checked={data.takenBefore === opt}
                onChange={(e) => {
                  onChange('takenBefore', e.target.value);
                  // => Clear where/when when switching to No
                  if (e.target.value === 'no') {
                    onChange('where', '');
                    onChange('when', '');
                  }
                }}
              />
              <span>{opt === 'yes' ? 'Yes' : 'No'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* => Where + When - only shown when Yes is selected */}
      {data.takenBefore === 'yes' && (
        <div className="ts4-grid ts4-g2">
          <div className="ts4-field-group">
            <label className="ts4-label">
              Where <span className="ts4-req">*</span>
            </label>
            <input
              type="text"
              className="ts4-input"
              placeholder="e.g. Pangasinan National High School"
              value={data.where}
              onChange={(e) => onChange('where', e.target.value)}
            />
          </div>
          <div className="ts4-field-group">
            <label className="ts4-label">
              When <span className="ts4-req">*</span>
            </label>
            <input
              type="text"
              className="ts4-input"
              placeholder="e.g. March 2023"
              value={data.when}
              onChange={(e) => onChange('when', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="ts4-error-banner">
          <i className="ti ti-alert-circle" />
          Please fill in all required fields before proceeding.
        </div>
      )}

      {/* => Navigation */}
      <div className="ts4-nav">
        <button className="ts4-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button className="ts4-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default TESDAStep4;