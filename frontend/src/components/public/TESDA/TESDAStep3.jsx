import React, { useState } from 'react';
import './TESDAStep3.css';

// => Client classifications from MIS 03-01 (ver. 2021)
// => Grouped for better readability on screen
const CLASSIFICATIONS = [
  { value: '4ps_beneficiary', label: '4Ps Beneficiary' },
  { value: 'agrarian_reform', label: 'Agrarian Reform Beneficiary' },
  { value: 'balik_probinsya', label: 'Balik Probinsya' },
  { value: 'displaced_workers', label: 'Displaced Workers' },
  { value: 'drug_dependents', label: 'Drug Dependents Surrenderees / Surrenderers' },
  { value: 'afp_pnp_killed', label: 'Family Members of AFP and PNP Killed-in-Action' },
  { value: 'afp_pnp_wounded', label: 'Family Members of AFP and PNP Wounded in-Action' },
  { value: 'farmers_fishermen', label: 'Farmers and Fishermen' },
  { value: 'indigenous_people', label: 'Indigenous People & Cultural Communities' },
  { value: 'industry_workers', label: 'Industry Workers' },
  { value: 'inmates_detainees', label: 'Inmates and Detainees' },
  { value: 'milf_beneficiary', label: 'MILF Beneficiary' },
  { value: 'out_of_school_youth', label: 'Out-of-School Youth' },
  { value: 'ofw_dependent', label: 'Overseas Filipino Workers (OFW) Dependent' },
  { value: 'rcef_resp', label: 'RCEF-RESP' },
  { value: 'rebel_returnees', label: 'Rebel Returnees / Decommissioned Combatants' },
  { value: 'returning_ofw', label: 'Returning / Repatriated Overseas Filipino Workers (OFW)' },
  { value: 'student', label: 'Student' },
  { value: 'tesda_alumni', label: 'TESDA Alumni' },
  { value: 'tvet_trainers', label: 'TVET Trainers' },
  { value: 'uniformed_personnel', label: 'Uniformed Personnel' },
  { value: 'disaster_victim', label: 'Victim of Natural Disasters and Calamities' },
  { value: 'wounded_afp_pnp', label: 'Wounded-in-Action AFP & PNP Personnel' },
];

const TESDAStep3 = ({ selected, onChange, othersText, onOthersTextChange, onBack, onNext }) => {

  const [showErrors, setShowErrors] = useState(false);
  const [localOthersText, setLocalOthersText] = useState('');
  const effectiveOthersText = typeof othersText === 'string' ? othersText : localOthersText;

  const handleOthersTextChange = (value) => {
    if (typeof onOthersTextChange === 'function') {
      onOthersTextChange(value);
    } else {
      setLocalOthersText(value);
    }
  };

  // => Select only one classification at a time
  const handleSelect = (value) => {
    onChange(value);
  };

  // => At least one classification must be selected
  const validate = () => {
    if (!selected && !othersText.trim()) return 'missing';
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
    <div className="ts3-wrap">

      <div className="ts3-section-title">
        Learner / Trainee / Student (Clients) Classification
      </div>
      <p className="ts3-hint">
        Select one classification that applies to you.
      </p>

      {/* => Radio grid */}
      <div className="ts3-checkbox-grid">
        {CLASSIFICATIONS.map(({ value, label }) => (
          <label key={value} className="ts3-checkbox-label">
            <input
              type="radio"
              name="client_classification"
              className="ts3-checkbox"
              value={value}
              checked={selected === value}
              onChange={() => handleSelect(value)}
            />
            <span>{label}</span>
          </label>
        ))}

        {/* => Others field - matches the MIS 03-01 "Others: (Please Specify)" */}
        <label className="ts3-checkbox-label">
          <input
            type="radio"
            name="client_classification"
            className="ts3-checkbox"
            value="others"
            checked={selected === 'others'}
            onChange={() => handleSelect('others')}
          />
          <span>Others</span>
        </label>
      </div>

      {/* => Show text input when "Others" is checked */}
      {selected === 'others' && (
        <div className="ts3-others-wrap">
          <label className="ts3-others-label">
            Please specify <span className="ts3-req">*</span>
          </label>
          <input
            type="text"
            className="ts3-others-input"
            placeholder="Please specify..."
            value={othersText}
            onChange={(e) => setOthersText(e.target.value)}
          />
        </div>
      )}

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="ts3-error-banner">
          <i className="ti ti-alert-circle" />
          Please select one classification before proceeding.
        </div>
      )}

      {/* => Navigation */}
      <div className="ts3-nav">
        <button className="ts3-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button className="ts3-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default TESDAStep3;