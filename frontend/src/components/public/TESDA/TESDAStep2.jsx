import React, { useState, useEffect } from 'react';
import './TESDAStep2.css';

// => Civil status options from MIS 03-01 (ver. 2018)
const CIVIL_STATUS = [
  'Single',
  'Married',
  'Widow/er',
  'Separated',
  'Solo Parent',
];

// => Educational attainment options from MIS 03-01 (ver. 2018)
const EDUC_ATTAINMENT = [
  'No Grade Completed',
  'Elementary Undergraduate',
  'Elementary Graduate',
  'Pre-School (Nursery/Kinder/Prep)',
  'Post Secondary Undergraduate',
  'Post Secondary Graduate',
  'High School Undergraduate',
  'High School Graduate',
  'Junior High Graduate',
  'Senior High Graduate',
  'College Undergraduate',
  'College Graduate or Higher',
];

// => Employment status options from MIS 03-01 (ver. 2018)
// => Simplified: only Employed / Unemployed
const EMPLOYMENT_STATUS = [
  'Employed',
  'Unemployed',
];

// => Month names for birthdate dropdowns
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

// => Age gate: student must be at least 12, no older than 100.
const MIN_AGE = 12;
const MAX_AGE = 100;

const TESDAStep2 = ({ data, onChange, onBack, onNext }) => {

  // => PSGC state for birthplace
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // => Controls visibility of error banner
  const [showErrors, setShowErrors] = useState(false);

  // => Field-level error flags - highlights individual fields on failed submit
  const [fieldErrors, setFieldErrors] = useState({
    sex: false,
    civilStatus: false,
    employmentStatus: false,
    birthMonth: false,
    birthDay: false,
    birthYear: false,
    birthplaceRegion: false,
    birthplaceProvince: false,
    birthplaceCity: false,
    educAttainment: false,
    guardianName: false,
  });

  // => Computed age from birthdate fields (formatted string, for display)
  const [computedAge, setComputedAge] = useState('');
  // => Same computation as computedAge but kept as a raw number (or null)
  //    so validate() can compare it against MIN_AGE/MAX_AGE directly
  const [computedAgeRaw, setComputedAgeRaw] = useState(null);

  // => Track if birthplace region is NCR (no province level)
  const isBirthNCR = data.birthplaceRegion === '1300000000';

  // => Whether guardian fields should show (minor = under 18)
  const isMinor = (() => {
    if (!data.birthYear || !data.birthMonth || !data.birthDay) return false;
    const birth = new Date(
      parseInt(data.birthYear),
      MONTHS.indexOf(data.birthMonth),
      parseInt(data.birthDay)
    );
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return (age - 1) < 18;
    }
    return age < 18;
  })();

  // => Compute and display age when birthdate fields change
  useEffect(() => {
    if (!data.birthYear || !data.birthMonth || !data.birthDay) {
      setComputedAge('');
      setComputedAgeRaw(null);
      return;
    }
    const birth = new Date(
      parseInt(data.birthYear),
      MONTHS.indexOf(data.birthMonth),
      parseInt(data.birthDay)
    );
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setComputedAge(age >= 0 ? `${age} years old` : '');
    setComputedAgeRaw(age >= 0 ? age : null);
  }, [data.birthYear, data.birthMonth, data.birthDay]);

  // => Fetch regions for birthplace on mount
  // => Uses own backend same as TESDAStep1
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch provinces or cities depending on birthplace region
  useEffect(() => {
    if (!data.birthplaceRegion) {
      setProvinces([]);
      setCities([]);
      return;
    }
    if (isBirthNCR) {
      setLoadingCities(true);
      // => NCR has no provinces, fetch cities directly by region
      fetch(`/api/location/cities-by-region/${data.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setCities(d))
        .catch(err => console.error('Failed to fetch NCR cities:', err))
        .finally(() => setLoadingCities(false));
    } else {
      setLoadingProvinces(true);
      fetch(`/api/location/provinces/${data.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setProvinces(d))
        .catch(err => console.error('Failed to fetch provinces:', err))
        .finally(() => setLoadingProvinces(false));
    }
  }, [data.birthplaceRegion]);

  // => Fetch cities when birthplace province changes
  useEffect(() => {
    if (!data.birthplaceProvince || isBirthNCR) return;
    setLoadingCities(true);
    fetch(`/api/location/cities/${data.birthplaceProvince}`)
      .then(r => r.json())
      .then(d => setCities(d))
      .catch(err => console.error('Failed to fetch cities:', err))
      .finally(() => setLoadingCities(false));
  }, [data.birthplaceProvince]);

  // => Generate days array based on selected month and year
  const getDays = () => {
    if (!data.birthMonth || !data.birthYear) return Array.from({ length: 31 }, (_, i) => i + 1);
    const monthIndex = MONTHS.indexOf(data.birthMonth);
    const daysInMonth = new Date(parseInt(data.birthYear), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // => Generate year range - limited to the last 100 years (matches
  // => MAX_AGE below), so the dropdown never offers a year the age gate
  // => would reject anyway.
  const getYears = () => {
    const current = new Date().getFullYear();
    return Array.from({ length: MAX_AGE }, (_, i) => current - i);
  };

  // => Validates required fields for Step 2
  const validate = () => {
    if (!data.sex) return 'missing';
    if (!data.civilStatus) return 'missing';
    if (!data.employmentStatus) return 'missing';
    if (!data.birthMonth) return 'missing';
    if (!data.birthDay) return 'missing';
    if (!data.birthYear) return 'missing';
    // => Must come after the birthdate-missing check above, since
    // => computedAgeRaw is null until all 3 birthdate fields are filled
    if (computedAgeRaw !== null && computedAgeRaw < MIN_AGE) return 'underage';
    if (computedAgeRaw !== null && computedAgeRaw > MAX_AGE) return 'overage';
    if (!data.birthplaceRegion) return 'missing';
    if (!isBirthNCR && !data.birthplaceProvince) return 'missing';
    if (!data.birthplaceCity) return 'missing';
    if (!data.educAttainment) return 'missing';
    // => Guardian name required if student is a minor
    if (isMinor && !data.guardianName) return 'missing';
    return 'valid';
  };

  const handleNext = () => {
    // => Mark which specific fields are empty so they turn red
    setFieldErrors({
      sex: !data.sex,
      civilStatus: !data.civilStatus,
      employmentStatus: !data.employmentStatus,
      birthMonth: !data.birthMonth,
      birthDay: !data.birthDay,
      birthYear: !data.birthYear,
      birthplaceRegion: !data.birthplaceRegion,
      birthplaceProvince: !isBirthNCR && !data.birthplaceProvince,
      birthplaceCity: !data.birthplaceCity,
      educAttainment: !data.educAttainment,
      guardianName: isMinor && !data.guardianName,
    });

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    // => Clear all highlights on success
    setFieldErrors({
      sex: false,
      civilStatus: false,
      employmentStatus: false,
      birthMonth: false,
      birthDay: false,
      birthYear: false,
      birthplaceRegion: false,
      birthplaceProvince: false,
      birthplaceCity: false,
      educAttainment: false,
      guardianName: false,
    });
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  // => Helper to clear a specific field error as soon as user interacts with it
  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  return (
    <div className="ts2-wrap">

      {/* Section: Personal Information */}
      <div className="ts2-section-title">Personal Information</div>

      {/* => Row 1: Sex + Civil Status + Employment Status */}
      <div className="ts2-grid ts2-g3">

        {/* => Sex: radio buttons, highlight wrapper on error */}
        <div className="ts2-field-group">
          <label className="ts2-label">Sex <span className="ts2-req">*</span></label>
          <div className={`ts2-radio-group ${fieldErrors.sex ? 'ts2-radio--error' : ''}`}>
            {['Male', 'Female'].map(opt => (
              <label key={opt} className="ts2-radio-label">
                <input
                  type="radio"
                  name="sex"
                  value={opt}
                  checked={data.sex === opt}
                  onChange={(e) => {
                    onChange('sex', e.target.value);
                    clearError('sex');
                  }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* => Civil Status dropdown */}
        <div className="ts2-field-group">
          <label className="ts2-label">Civil Status <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.civilStatus ? 'ts2-input--error' : ''}`}
            value={data.civilStatus}
            onChange={(e) => {
              onChange('civilStatus', e.target.value);
              clearError('civilStatus');
            }}
          >
            <option value="">Select</option>
            {CIVIL_STATUS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* => Employment Status - simplified to Employed/Unemployed per 2018 form */}
        <div className="ts2-field-group">
          <label className="ts2-label">Employment Status <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.employmentStatus ? 'ts2-input--error' : ''}`}
            value={data.employmentStatus}
            onChange={(e) => {
              onChange('employmentStatus', e.target.value);
              clearError('employmentStatus');
            }}
          >
            <option value="">Select</option>
            {EMPLOYMENT_STATUS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      {/* => Birthdate section */}
      <div className="ts2-section-title" style={{ marginTop: '1.4rem' }}>
        Birthdate
      </div>

      <div className="ts2-grid ts2-g4">

        <div className="ts2-field-group">
          <label className="ts2-label">Month <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthMonth ? 'ts2-input--error' : ''}`}
            value={data.birthMonth}
            onChange={(e) => {
              onChange('birthMonth', e.target.value);
              clearError('birthMonth');
            }}
          >
            <option value="">Select Month</option>
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="ts2-field-group">
          <label className="ts2-label">Day <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthDay ? 'ts2-input--error' : ''}`}
            value={data.birthDay}
            onChange={(e) => {
              onChange('birthDay', e.target.value);
              clearError('birthDay');
            }}
          >
            <option value="">Select Day</option>
            {getDays().map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="ts2-field-group">
          <label className="ts2-label">Year <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthYear ? 'ts2-input--error' : ''}`}
            value={data.birthYear}
            onChange={(e) => {
              onChange('birthYear', e.target.value);
              clearError('birthYear');
            }}
          >
            <option value="">Select Year</option>
            {getYears().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* => Age auto-computed, read-only */}
        <div className="ts2-field-group">
          <label className="ts2-label">Age</label>
          <input
            type="text"
            className={`ts2-input ts2-input--readonly ${
              computedAgeRaw !== null && (computedAgeRaw < MIN_AGE || computedAgeRaw > MAX_AGE)
                ? 'ts2-input--error'
                : ''
            }`}
            value={computedAge || '-'}
            readOnly
            title="Auto-computed from birthdate"
          />
        </div>

      </div>

      {/* => Inline age-gate warning - shows as soon as the computed age
           falls outside 12-100, even before the person clicks Next */}
      {computedAgeRaw !== null && (computedAgeRaw < MIN_AGE || computedAgeRaw > MAX_AGE) && (
        <p className="ts2-section-note" style={{ color: '#c0392b', marginTop: '-0.8rem', marginBottom: '1rem' }}>
          {computedAgeRaw < MIN_AGE
            ? `Student must be at least ${MIN_AGE} years old. Current computed age: ${computedAgeRaw}.`
            : `Please double-check the birthdate - computed age is ${computedAgeRaw}, which exceeds ${MAX_AGE}.`}
        </p>
      )}

      {/* => Birthplace section */}
      <div className="ts2-section-title" style={{ marginTop: '1.4rem' }}>
        Birthplace
      </div>

      <div className="ts2-grid ts2-g3">

        <div className="ts2-field-group">
          <label className="ts2-label">Region <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthplaceRegion ? 'ts2-input--error' : ''}`}
            value={data.birthplaceRegion}
            onChange={(e) => {
              onChange('birthplaceRegion', e.target.value);
              onChange('birthplaceProvince', '');
              onChange('birthplaceCity', '');
              setProvinces([]);
              setCities([]);
              clearError('birthplaceRegion');
            }}
          >
            <option value="">Select Region</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* => Province hidden for NCR */}
        {!isBirthNCR && (
          <div className="ts2-field-group">
            <label className="ts2-label">Province <span className="ts2-req">*</span></label>
            <select
              className={`ts2-select ${fieldErrors.birthplaceProvince ? 'ts2-input--error' : ''}`}
              value={data.birthplaceProvince}
              onChange={(e) => {
                onChange('birthplaceProvince', e.target.value);
                onChange('birthplaceCity', '');
                setCities([]);
                clearError('birthplaceProvince');
              }}
              disabled={!data.birthplaceRegion || loadingProvinces}
            >
              <option value="">
                {loadingProvinces ? 'Loading...' : !data.birthplaceRegion ? '- Select Region first -' : 'Select Province'}
              </option>
              {provinces.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ts2-field-group">
          <label className="ts2-label">City / Municipality <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthplaceCity ? 'ts2-input--error' : ''}`}
            value={data.birthplaceCity}
            onChange={(e) => {
              onChange('birthplaceCity', e.target.value);
              clearError('birthplaceCity');
            }}
            disabled={(!data.birthplaceProvince && !isBirthNCR) || loadingCities}
          >
            <option value="">
              {loadingCities ? 'Loading...' : 'Select City / Municipality'}
            </option>
            {cities.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* => Educational Attainment section */}
      {/* => Full width - single standalone field, no reason to use half the row */}
      <div className="ts2-section-title" style={{ marginTop: '1.4rem' }}>
        Educational Attainment Before the Training
      </div>

      <div className="ts2-field-group">
        <label className="ts2-label">Highest Attainment <span className="ts2-req">*</span></label>
        <select
            className={`ts2-select ${fieldErrors.educAttainment ? 'ts2-input--error' : ''}`}
            value={data.educAttainment}
            onChange={(e) => {
              onChange('educAttainment', e.target.value);
              clearError('educAttainment');
            }}
          >
            <option value="">Select</option>
            {EDUC_ATTAINMENT.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
      </div>

      {/* => Parent/Guardian - only shown if student is a minor (under 18) */}
      {isMinor && (
        <>
          <div className="ts2-section-title" style={{ marginTop: '1.4rem' }}>
            Parent / Guardian
            <span className="ts2-section-note"> - Required for students under 18</span>
          </div>
          <div className="ts2-grid ts2-g2">
            <div className="ts2-field-group">
              <label className="ts2-label">
                Full Name <span className="ts2-req">*</span>
              </label>
              <input
                type="text"
                className={`ts2-input ${fieldErrors.guardianName ? 'ts2-input--error' : ''}`}
                placeholder="e.g. Maria Dela Cruz"
                value={data.guardianName}
                onChange={(e) => {
                  onChange('guardianName', e.target.value);
                  clearError('guardianName');
                }}
              />
            </div>
            <div className="ts2-field-group">
              {/* => Guardian address is optional per MIS 03-01 2018 */}
              <label className="ts2-label">Complete Permanent Mailing Address</label>
              <input
                type="text"
                className="ts2-input"
                placeholder="e.g. 123 Rizal St., Brgy. San Jose, Manila"
                value={data.guardianAddress}
                onChange={(e) => onChange('guardianAddress', e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="ts2-error-banner">
          <i className="ti ti-alert-circle" />
          {validate() === 'underage'
            ? `Student must be at least ${MIN_AGE} years old to proceed.`
            : validate() === 'overage'
              ? `Please double-check the birthdate - computed age exceeds ${MAX_AGE} years.`
              : "Please fill in all required fields (denoted with ' * ') before proceeding."
          }
        </div>
      )}

      {/* => Navigation */}
      <div className="ts2-nav">
        <button className="ts2-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <button className="ts2-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default TESDAStep2;