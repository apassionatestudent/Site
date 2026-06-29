import React, { useState, useEffect } from 'react';
import './TESDAStep1.css';

// => Name extension options from MIS 03-01
const NAME_EXTENSIONS = ['N/A', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

// => Capitalizes the first letter of each word
// => Handles names with spaces like "John Paul" → "John Paul"
const toTitleCase = (value) => {
  return value
    .replace(/[^a-zA-Z\s\-']/g, '')       // => Allow letters, spaces, hyphens, apostrophes (for names like O'Brien)
    .replace(/^\s+/, '')                    // => No leading spaces
    .replace(/\s{2,}/g, ' ')               // => Collapse multiple spaces into one
    .replace(/(^\w|(?<=[\s\-])\w)/g, (c) => c.toUpperCase()); // => Capitalize after space or hyphen
};

// => Validates Philippine mobile number
// => Must start with '09' and be exactly 11 digits
const validateMobile = (value) => {
  if (!value) return 'Contact number is required.';
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

// => Validates email using regex
// => Allows standard email format: user@domain.tld
const validateEmail = (value) => {
  if (!value) return null; // => Email is optional, only validate format if filled
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'Please enter a valid email address.';
  return null;
};

const TESDAStep1 = ({ data, onChange, onNext }) => {

  // => Philippine Standard Geographic Code (PSGC) state
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // => Auto-filled from PSGC city data
  const [district, setDistrict] = useState('');

  // => Nationality list fetched from /api/reference/nationalities
  const [nationalities, setNationalities] = useState([]);
  const [loadingNationalities, setLoadingNationalities] = useState(true);

  // => Inline field-level errors for email and contact
  const [emailError, setEmailError] = useState('');
  const [contactError, setContactError] = useState('');

  // => Field-level error flags - highlight individual fields on failed submit
  const [fieldErrors, setFieldErrors] = useState({
    lastName: false,
    firstName: false,
    region: false,
    province: false,
    city: false,
    barangay: false,
    street: false,
    contactNo: false,
    nationality: false,
  });

  // => Controls whether validation errors are visible
  const [showErrors, setShowErrors] = useState(false);

  // => Track if selected region is NCR (no province level)
  const isNCR = data.region === '1300000000';

  // => Fetch nationalities from backend on mount
  useEffect(() => {
    fetch('/api/reference/nationalities')
      .then(r => r.json())
      .then(d => setNationalities(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch nationalities:', err))
      .finally(() => setLoadingNationalities(false));
  }, []);

  // => Fetch regions on mount
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch provinces or cities depending on region
  useEffect(() => {
    if (!data.region) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      return;
    }

    if (isNCR) {
      // => NCR has no provinces, go straight to cities
      setLoadingCities(true);
      fetch(`/api/location/cities-by-region/${data.region}`)
        .then(r => r.json())
        .then(d => setCities(d))
        .catch(err => console.error('Failed to fetch NCR cities:', err))
        .finally(() => setLoadingCities(false));
    } else {
      setLoadingProvinces(true);
      fetch(`/api/location/provinces/${data.region}`)
        .then(r => r.json())
        .then(d => setProvinces(d))
        .catch(err => console.error('Failed to fetch provinces:', err))
        .finally(() => setLoadingProvinces(false));
    }
  }, [data.region]);

  // => Fetch cities when province changes
  useEffect(() => {
    if (!data.province || isNCR) return;
    setLoadingCities(true);
    fetch(`/api/location/cities/${data.province}`)
      .then(r => r.json())
      .then(d => setCities(d))
      .catch(err => console.error('Failed to fetch cities:', err))
      .finally(() => setLoadingCities(false));
  }, [data.province]);

  // => Fetch barangays when city changes
  useEffect(() => {
    if (!data.city) return;
    setLoadingBarangays(true);
    fetch(`/api/location/barangays/${data.city}`)
      .then(r => r.json())
      .then(d => setBarangays(d))
      .catch(err => console.error('Failed to fetch barangays:', err))
      .finally(() => setLoadingBarangays(false));
  }, [data.city]);

  // => Validates required fields for Step 1
  const validate = () => {
    if (!data.lastName) return 'missing';
    if (!data.firstName) return 'missing';
    if (!data.region) return 'missing';
    if (!isNCR && !data.province) return 'missing';
    if (!data.city) return 'missing';
    if (!data.barangay) return 'missing';
    if (!data.street) return 'missing';
    if (!data.contactNo) return 'missing';
    if (!data.nationality) return 'missing';
    // => Fail if inline field errors exist
    if (validateMobile(data.contactNo)) return 'error';
    if (data.email && validateEmail(data.email)) return 'error';
    return 'valid';
  };

  const handleNext = () => {
    // => Run inline validators and show their errors on submit attempt
    const mobileErr = validateMobile(data.contactNo);
    const emailErr = validateEmail(data.email);
    setContactError(mobileErr || '');
    setEmailError(emailErr || '');

    // => Mark which specific fields are empty/invalid so they turn red
    setFieldErrors({
      lastName: !data.lastName,
      firstName: !data.firstName,
      region: !data.region,
      province: !isNCR && !data.province,
      city: !data.city,
      barangay: !data.barangay,
      street: !data.street,
      contactNo: !data.contactNo || !!mobileErr,
      nationality: !data.nationality,
    });

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    // => Clear all field highlights on successful validation
    setFieldErrors({
      lastName: false,
      firstName: false,
      region: false,
      province: false,
      city: false,
      barangay: false,
      street: false,
      contactNo: false,
      nationality: false,
    });
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="ts1-wrap">

      {/* Section 1 - Name */}
      <div className="ts1-section-title">Learner / Manpower Profile</div>

      {/* => Name row: Last Name, Extension, First Name, Middle Name */}
      <div className="ts1-grid ts1-name-row">
        <div className="ts1-field-group">
          <label className="ts1-label">Last Name <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${fieldErrors.lastName ? 'ts1-input--error' : ''}`}
            placeholder="e.g. Dela Cruz"
            value={data.lastName}
            onChange={(e) => {
              onChange('lastName', toTitleCase(e.target.value));
              setFieldErrors(prev => ({ ...prev, lastName: false }));
            }}
          />
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Name Extension</label>
          <select
            className="ts1-select"
            value={data.nameExtension}
            onChange={(e) => onChange('nameExtension', e.target.value)}
          >
            {NAME_EXTENSIONS.map(ext => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">First Name <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${fieldErrors.firstName ? 'ts1-input--error' : ''}`}
            placeholder="e.g. Juan"
            value={data.firstName}
            // => toTitleCase handles multi-word first names like "John Paul"
            onChange={(e) => {
              onChange('firstName', toTitleCase(e.target.value));
              setFieldErrors(prev => ({ ...prev, firstName: false }));
            }}
          />
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Middle Name</label>
          <input
            type="text"
            className="ts1-input"
            placeholder="e.g. Santos"
            value={data.middleName}
            onChange={(e) => onChange('middleName', toTitleCase(e.target.value))}
          />
        </div>
      </div>

      {/* Section 2 - Complete Mailing Address */}
      <div className="ts1-section-title" style={{ marginTop: '1.8rem' }}>
        Complete Permanent Mailing Address
      </div>

      {/* => Row 1: Region + Province + City */}
      <div className="ts1-grid ts1-g3">
        <div className="ts1-field-group">
          <label className="ts1-label">Region <span className="ts1-req">*</span></label>
          <select
            className={`ts1-select ${fieldErrors.region ? 'ts1-input--error' : ''}`}
            value={data.region}
            onChange={(e) => {
              // => Reset dependent fields when region changes
              onChange('region', e.target.value);
              onChange('province', '');
              onChange('city', '');
              onChange('barangay', '');
              onChange('district', '');
              setDistrict('');
              setProvinces([]);
              setCities([]);
              setBarangays([]);
            }}
          >
            <option value="">Select Region</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* => Province hidden for NCR */}
        {!isNCR && (
          <div className="ts1-field-group">
            <label className="ts1-label">Province <span className="ts1-req">*</span></label>
            <select
              className={`ts1-select ${fieldErrors.province ? 'ts1-input--error' : ''}`}
              value={data.province}
              onChange={(e) => {
                onChange('province', e.target.value);
                onChange('city', '');
                onChange('barangay', '');
                setCities([]);
                setBarangays([]);
              }}
              disabled={!data.region || loadingProvinces}
            >
              <option value="">
                {loadingProvinces ? 'Loading...' : !data.region ? '- Select Region first -' : 'Select Province'}
              </option>
              {provinces.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ts1-field-group">
          <label className="ts1-label">City / Municipality <span className="ts1-req">*</span></label>
          <select
            className={`ts1-select ${fieldErrors.city ? 'ts1-input--error' : ''}`}
            value={data.city}
            onChange={(e) => {
              const selectedCode = e.target.value;
              onChange('city', selectedCode);
              onChange('barangay', '');
              setBarangays([]);
              // => Auto-fill district from the already-loaded cities list
              const selected = cities.find(c => c.code === selectedCode);
              const raw = selected?.district || '';
              // => Format district label same way as original Enroll.jsx
              setDistrict(
                raw === 'Lone' ? 'Lone District'
                : raw ? `${raw} District`
                : ''
              );
              onChange('district', raw);
            }}
            disabled={(!data.province && !isNCR) || loadingCities}
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

      {/* => Row 2: District (auto-filled) + Barangay + House No./Street */}
      <div className="ts1-grid ts1-g3" style={{ marginTop: '1.2rem' }}>
        <div className="ts1-field-group">
          <label className="ts1-label">
            Congressional District
          </label>
          <input
            type="text"
            className="ts1-input"
            value={district || (data.city ? 'Not in PSGC' : '-')}
            readOnly
            title="Auto-filled from selected city"
            style={{ background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-secondary)' }}
          />
          <span className="ts1-field-hint">Auto-filled from selected city.</span>
        </div>
        
        <div className="ts1-field-group">
          <label className="ts1-label">Barangay <span className="ts1-req">*</span></label>
          <select
            className={`ts1-select ${fieldErrors.barangay ? 'ts1-input--error' : ''}`}
            value={data.barangay}
            onChange={(e) => onChange('barangay', e.target.value)}
            disabled={!data.city || loadingBarangays}
          >
            <option value="">
              {loadingBarangays ? 'Loading...' : !data.city ? '- Select City first -' : 'Select Barangay'}
            </option>
            {barangays.map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">House No. / Street <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${fieldErrors.street ? 'ts1-input--error' : ''}`}
            placeholder="e.g. 123 Rizal St."
            value={data.street}
            onChange={(e) => {
              onChange('street', e.target.value);
              setFieldErrors(prev => ({ ...prev, street: false }));
            }}
          />
        </div>
      </div>

      {/* => Row 3: Email + Contact No. + Nationality */}
      <div className="ts1-grid ts1-g3" style={{ marginTop: '1.2rem' }}>

        <div className="ts1-field-group">
          {/* TODO: I need to be able to add a way to enter an email address as username, but the problem is the problem is that there are some old people enrolling, so it seems like they don't have an email address. In such case I may need to user a literal username.  */}
          <label className="ts1-label">Email Address / Facebook Account</label>
          <input
            type="text"
            className={`ts1-input ${emailError ? 'ts1-input--error' : ''}`}
            placeholder="e.g. juan@email.com or Facebook name"
            value={data.email}
            onChange={(e) => {
              onChange('email', e.target.value);
              // => Validate on change so error clears as soon as user fixes it
              setEmailError(validateEmail(e.target.value) || '');
            }}
          />
          {/* => Only show email error if filled AND invalid */}
          {emailError && (
            <span className="ts1-field-error">{emailError}</span>
          )}
          <span className="ts1-field-hint">
            If no email, enter your Facebook account name instead.
          </span>
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Contact No. <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${contactError ? 'ts1-input--error' : ''}`}
            placeholder="e.g. 09XX-XXX-XXXX"
            value={data.contactNo}
            maxLength={11}
            onChange={(e) => {
              // => Strip non-digits, enforce 09 prefix and 11-digit max
              const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
              onChange('contactNo', raw);
              setContactError(validateMobile(raw) || '');
            }}
          />
          {contactError && (
            <span className="ts1-field-error">{contactError}</span>
          )}
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Nationality <span className="ts1-req">*</span></label>
          {/* => Dropdown fetched from /api/reference/nationalities */}
          <select
            className={`ts1-select ${fieldErrors.nationality ? 'ts1-input--error' : ''}`}
            value={data.nationality}
            onChange={(e) => onChange('nationality', e.target.value)}
            disabled={loadingNationalities}
          >
            <option value="">
              {loadingNationalities ? 'Loading...' : 'Select Nationality'}
            </option>
            {nationalities.map((n) => (
              // => Handles both array of strings and array of objects
              <option
                key={typeof n === 'string' ? n : n.code ?? n.id}
                value={typeof n === 'string' ? n : n.name}
              >
                {typeof n === 'string' ? n : n.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="ts1-error-banner">
          <i className="ti ti-alert-circle" />
          {validate() === 'error'
            ? 'Please correct the errors above before proceeding.'
            : "Please fill in all required fields (denoted with ' * ') before proceeding."
          }
        </div>
      )}

      {/* => Navigation: Step 1 has no Back */}
      <div className="ts1-nav">
        <button className="ts1-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default TESDAStep1;