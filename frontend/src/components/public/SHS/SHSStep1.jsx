import React, { useState, useEffect } from 'react';
import './SHSStep1.css';
import Info from '../../Info.jsx';

// => Name extension options - same list as TESDAStep1 for consistency
const NAME_EXTENSIONS = ['N/A', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

// => Month names for birthdate dropdowns
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

// => Minimum age for SHS Grade 11 enrollment - typical entry age for
// => Senior High School in the Philippines
const MIN_AGE = 16;
// => Ceiling - matches the getYears() dropdown range below, so nothing
// => older than 100 is ever offered to pick from in the first place.
const MAX_AGE = 100;

// => Common religions in the Philippines - static list, no backend needed
// => for this (unlike nationality/citizenship below, which has its own
// => reference table). "Others" reveals a specify input, same UX pattern
// => as TESDAStep3's "Others" classification checkbox.
const RELIGIONS = [
  'Roman Catholic',
  'Islam',
  'Iglesia ni Cristo',
  'Evangelical',
  'Aglipayan (Philippine Independent Church)',
  'Seventh-Day Adventist',
  "Jehovah's Witness",
  'Baptist',
  'Born Again Christian',
  'United Church of Christ in the Philippines (UCCP)',
  'Methodist',
  'Buddhist',
  'Prefer not to say',
  'Others',
];

// => Validates Philippine mobile number
// => Must start with '09' and be exactly 11 digits
const validateMobile = (value) => {
  if (!value) return 'Contact number is required.';
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

// => Validates email using regex - same EMAIL_REGEX used in
// => TESDAStep1.jsx and StudentDetail.jsx so all three enforce identically
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validateEmail = (value) => {
  if (!value) return 'Email address is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return null;
};

// => LRN (Learner Reference Number) is 12 digits per DepEd standard
// => Marked "if applicable" on the physical form, so it's optional - only
// => validated for format IF the user actually typed something in.
const validateLRN = (value) => {
  if (!value) return null;
  if (!/^\d{12}$/.test(value)) return 'LRN must be exactly 12 digits.';
  return null;
};

// => Capitalizes the first letter of each word, lowercases the rest -
// => "juan DELA cruz" -> "Juan Dela Cruz". Applied on every keystroke
// => (onChange) per direction - if someone edits mid-string later and
// => the cursor jumps to the end, that's the known controlled-input
// => tradeoff of live transforms; can add cursor-position restoration
// => via a ref if that becomes an issue in testing.
// => Excluded on purpose: email, facebookLink (would break the value).
const toProperCase = (value) => {
  if (!value) return value;
  return value.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

// => Fixes the "can't type" symptom that plain toProperCase-on-onChange
// => causes: React resets a controlled input's cursor to the END every
// => time .value is set programmatically, which happens on every render
// => once we're transforming the string on every keystroke. This grabs
// => the cursor position BEFORE the transform, applies the transform,
// => then restores that exact position on the actual DOM node (e.target)
// => right after React re-renders. toProperCase never changes string
// => length, so the original index is always still valid.
const applyProperCase = (e, key, onChangeFn) => {
  const input = e.target;
  const cursor = input.selectionStart;
  onChangeFn(key, toProperCase(input.value));
  requestAnimationFrame(() => {
    if (input) input.setSelectionRange(cursor, cursor);
  });
};

// => Not part of the physical form - admins add each SHS enrollee to a
// => batch group chat and need this anyway, so we collect it upfront here.
// => Accepts facebook.com with no subdomain, www., or Meta's actual
// => "web." desktop subdomain. Same FACEBOOK_LINK_REGEX as
// => TESDAStep1.jsx and StudentDetail.jsx (fb.com shortlinks no longer
// => accepted - flag if you want that kept as a valid alternate).
const FACEBOOK_LINK_REGEX = /^(https?:\/\/)?(www\.|web\.)?facebook\.com\/.+$/i;
const validateFacebookLink = (value) => {
  if (!value) return 'Facebook profile link is required.';
  if (!FACEBOOK_LINK_REGEX.test(value)) return 'Please enter a valid Facebook profile link (e.g. https://www.facebook.com/yourname).';
  return null;
};

const SHSStep1 = ({ data, onChange, onNext }) => {

  // => Philippine Standard Geographic Code (PSGC) state - same source as TESDAStep1,
  // => fetched from our own backend's /api/location/* endpoints (not psgc.cloud directly)
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // => Citizenship list fetched from /api/reference/nationalities - same
  // => source and pattern as TESDAStep1's Nationality dropdown
  const [nationalities, setNationalities] = useState([]);
  const [loadingNationalities, setLoadingNationalities] = useState(true);

  // => PSGC state for Place of Birth - a SEPARATE cascade from the Home
  // => Address one above (region/province/city only, no barangay/street,
  // => same depth as TESDAStep2's birthplace section). Kept in its own
  // => state so selecting a birthplace region doesn't clobber the home
  // => address selections.
  const [birthplaceRegions, setBirthplaceRegions] = useState([]);
  const [birthplaceProvinces, setBirthplaceProvinces] = useState([]);
  const [birthplaceCities, setBirthplaceCities] = useState([]);
  const [loadingBirthplaceProvinces, setLoadingBirthplaceProvinces] = useState(false);
  const [loadingBirthplaceCities, setLoadingBirthplaceCities] = useState(false);

  // => Auto-filled from PSGC city data
  const [district, setDistrict] = useState('');

  // => Computed age from birthdate fields - physical form has a separate
  // => "Age" blank line, but we auto-compute it read-only for data consistency,
  // => same approach as TESDAStep2.
  const [computedAge, setComputedAge] = useState(null);

  const [lrnError, setLrnError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [contactError, setContactError] = useState('');
  const [facebookError, setFacebookError] = useState('');

  const [showErrors, setShowErrors] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    lastName: false,
    firstName: false,
    sex: false,
    birthMonth: false,
    birthDay: false,
    birthYear: false,
    birthplaceRegion: false,
    birthplaceProvince: false,
    birthplaceCity: false,
    citizenship: false,
    religionOthers: false,
    region: false,
    province: false,
    city: false,
    barangay: false,
    street: false,
    contactNo: false,
  });

  // => Track if selected region is NCR (no province level)
  const isNCR = data.region === '1300000000';

  // => Same NCR check, but for the separate birthplace cascade
  const isBirthplaceNCR = data.birthplaceRegion === '1300000000';

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => Fetch regions on mount
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch citizenship options on mount - same endpoint as TESDAStep1
  useEffect(() => {
    fetch('/api/reference/nationalities')
      .then(r => r.json())
      .then(d => setNationalities(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch nationalities:', err))
      .finally(() => setLoadingNationalities(false));
  }, []);

  // => Fetch regions for the SEPARATE Place of Birth cascade on mount -
  // => mirrors TESDAStep2's birthplace region fetch
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setBirthplaceRegions(d))
      .catch(err => console.error('Failed to fetch birthplace regions:', err));
  }, []);

  // => Fetch provinces or cities depending on birthplace region -
  // => mirrors TESDAStep2's birthplace province/city cascade
  useEffect(() => {
    if (!data.birthplaceRegion) {
      setBirthplaceProvinces([]);
      setBirthplaceCities([]);
      return;
    }
    if (isBirthplaceNCR) {
      setLoadingBirthplaceCities(true);
      fetch(`/api/location/cities-by-region/${data.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setBirthplaceCities(d))
        .catch(err => console.error('Failed to fetch NCR birthplace cities:', err))
        .finally(() => setLoadingBirthplaceCities(false));
    } else {
      setLoadingBirthplaceProvinces(true);
      fetch(`/api/location/provinces/${data.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setBirthplaceProvinces(d))
        .catch(err => console.error('Failed to fetch birthplace provinces:', err))
        .finally(() => setLoadingBirthplaceProvinces(false));
    }
  }, [data.birthplaceRegion]);

  // => Fetch cities when birthplace province changes
  useEffect(() => {
    if (!data.birthplaceProvince || isBirthplaceNCR) return;
    setLoadingBirthplaceCities(true);
    fetch(`/api/location/cities/${data.birthplaceProvince}`)
      .then(r => r.json())
      .then(d => setBirthplaceCities(d))
      .catch(err => console.error('Failed to fetch birthplace cities:', err))
      .finally(() => setLoadingBirthplaceCities(false));
  }, [data.birthplaceProvince]);

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

  // => Compute age (as a number) when birthdate fields change - kept raw
  // => here instead of a formatted string so validate() below can compare
  // => it against MIN_AGE directly. Display formatting happens in the JSX.
  useEffect(() => {
    if (!data.birthYear || !data.birthMonth || !data.birthDay) {
      setComputedAge(null);
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
    setComputedAge(age >= 0 ? age : null);
  }, [data.birthYear, data.birthMonth, data.birthDay]);

  // => Validates required fields for Step 1
  const validate = () => {
    if (!data.lastName) return 'missing';
    if (!data.firstName) return 'missing';
    if (!data.sex) return 'missing';
    if (!data.birthMonth || !data.birthDay || !data.birthYear) return 'missing';
    // => Must come after the birthdate-missing check above, since
    // => computedAge is null until all 3 birthdate fields are filled
    if (computedAge !== null && computedAge < MIN_AGE) return 'underage';
    if (computedAge !== null && computedAge > MAX_AGE) return 'overage';
    if (!data.birthplaceRegion) return 'missing';
    if (!isBirthplaceNCR && !data.birthplaceProvince) return 'missing';
    if (!data.birthplaceCity) return 'missing';
    if (!data.citizenship) return 'missing';
    if (data.religion === 'Others' && !data.religionOthers?.trim()) return 'missing';
    if (!data.region) return 'missing';
    if (!isNCR && !data.province) return 'missing';
    if (!data.city) return 'missing';
    if (!data.barangay) return 'missing';
    if (!data.street) return 'missing';
    if (!data.contactNo) return 'missing';
    // => Fail if inline field errors exist (LRN, email, mobile, facebook format)
    if (validateLRN(data.lrn)) return 'error';
    if (validateMobile(data.contactNo)) return 'error';
    if (validateEmail(data.email)) return 'error';
    if (validateFacebookLink(data.facebookLink)) return 'error';
    return 'valid';
  };

  const handleNext = () => {
    const mobileErr = validateMobile(data.contactNo);
    const emailErr = validateEmail(data.email);
    const lrnErr = validateLRN(data.lrn);
    const facebookErr = validateFacebookLink(data.facebookLink);
    setContactError(mobileErr || '');
    setEmailError(emailErr || '');
    setLrnError(lrnErr || '');
    setFacebookError(facebookErr || '');

    setFieldErrors({
      lastName: !data.lastName,
      firstName: !data.firstName,
      sex: !data.sex,
      birthMonth: !data.birthMonth,
      birthDay: !data.birthDay,
      birthYear: !data.birthYear,
      birthplaceRegion: !data.birthplaceRegion,
      birthplaceProvince: !isBirthplaceNCR && !data.birthplaceProvince,
      birthplaceCity: !data.birthplaceCity,
      citizenship: !data.citizenship,
      religionOthers: data.religion === 'Others' && !data.religionOthers?.trim(),
      region: !data.region,
      province: !isNCR && !data.province,
      city: !data.city,
      barangay: !data.barangay,
      street: !data.street,
      contactNo: !data.contactNo || !!mobileErr,
    });

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    setFieldErrors({
      lastName: false, firstName: false, sex: false,
      birthMonth: false, birthDay: false, birthYear: false,
      birthplaceRegion: false, birthplaceProvince: false, birthplaceCity: false,
      citizenship: false, religionOthers: false, region: false,
      province: false, city: false, barangay: false,
      street: false, contactNo: false,
    });
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="shs1-wrap">

      <div className="shs1-section-title">I. Student Information</div>

      {/* => LRN - optional per physical form ("if applicable").
           => Widened to full row width instead of the short 260px box -
           => reads better than a cramped short field for a 12-digit number. */}
      <div className="shs1-field-group">
        <label className="shs1-label">
          Learner Reference Number (LRN)
          <Info content="Your Learner Reference Number is a permanent 12-digit ID assigned by DepEd. Check your Form 137 (Report Card) or ask your previous school's registrar if you don't have it on hand. If you don't have it, leave it as blank." />
        </label>
        <input
          type="text"
          className={`shs1-input ${lrnError ? 'shs1-input--error' : ''}`}
          placeholder="12-digit LRN"
          maxLength={12}
          value={data.lrn}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
            onChange('lrn', raw);
            setLrnError(validateLRN(raw) || '');
          }}
        />
        {lrnError && <span className="shs1-field-error">{lrnError}</span>}
        <span className="shs1-field-hint">Not sure? Leave this blank - our staff can pull it up from your records and add it during review.</span>
      </div>

      {/* => Name row: Last Name, First Name, Middle Name, Suffix */}
      <div className="shs1-grid shs1-name-row">
        <div className="shs1-field-group">
          <label className="shs1-label">Last Name <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${fieldErrors.lastName ? 'shs1-input--error' : ''}`}
            value={data.lastName}
            onChange={(e) => { applyProperCase(e, 'lastName', onChange); clearError('lastName'); }}
          />
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">First Name <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${fieldErrors.firstName ? 'shs1-input--error' : ''}`}
            value={data.firstName}
            onChange={(e) => { applyProperCase(e, 'firstName', onChange); clearError('firstName'); }}
          />
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Middle Name</label>
          <input
            type="text"
            className="shs1-input"
            value={data.middleName}
            onChange={(e) => applyProperCase(e, 'middleName', onChange)}
          />
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Suffix</label>
          <select
            className="shs1-select"
            value={data.suffix}
            onChange={(e) => onChange('suffix', e.target.value)}
          >
            {NAME_EXTENSIONS.map(ext => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>
        </div>
      </div>

      {/* => Sex + Birthdate + Age - merged into one row instead of leaving
           Sex isolated on its own line with empty space beside it. Order
           still matches the physical form (Sex, then Date of Birth) -
           just laid out side by side instead of stacked. */}
      <div className="shs1-grid shs1-g5">
        <div className="shs1-field-group">
          <label className="shs1-label">Sex <span className="shs1-req">*</span></label>
          <div className={`shs1-radio-group ${fieldErrors.sex ? 'shs1-radio--error' : ''}`}>
            {['Male', 'Female'].map(opt => (
              <label key={opt} className="shs1-radio-label">
                <input
                  type="radio"
                  name="sex"
                  value={opt}
                  checked={data.sex === opt}
                  onChange={(e) => { onChange('sex', e.target.value); clearError('sex'); }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Month <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.birthMonth ? 'shs1-input--error' : ''}`}
            value={data.birthMonth}
            onChange={(e) => { onChange('birthMonth', e.target.value); clearError('birthMonth'); }}
          >
            <option value="">Select Month</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Day <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.birthDay ? 'shs1-input--error' : ''}`}
            value={data.birthDay}
            onChange={(e) => { onChange('birthDay', e.target.value); clearError('birthDay'); }}
          >
            <option value="">Select Day</option>
            {getDays().map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Year <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.birthYear ? 'shs1-input--error' : ''}`}
            value={data.birthYear}
            onChange={(e) => { onChange('birthYear', e.target.value); clearError('birthYear'); }}
          >
            <option value="">Select Year</option>
            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="shs1-field-group">
          <label className="shs1-label">Age</label>
          <input
            type="text"
            className={`shs1-input shs1-input--readonly ${computedAge !== null && (computedAge < MIN_AGE || computedAge > MAX_AGE) ? 'shs1-input--error' : ''}`}
            value={computedAge !== null ? `${computedAge} years old` : '-'}
            readOnly
            title="Auto-computed from birthdate"
          />
        </div>
      </div>

      {/* => Age-gate warning - shown as soon as the birthdate pushes the
           computed age outside MIN_AGE/MAX_AGE, even before the person
           clicks Next, so they see it immediately instead of only on
           submit. */}
      {computedAge !== null && (computedAge < MIN_AGE || computedAge > MAX_AGE) && (
        <div className="shs1-error-banner" style={{ marginTop: '-0.6rem', marginBottom: '1rem' }}>
          <i className="ti ti-alert-circle" />
          {computedAge < MIN_AGE
            ? `Enrollee must be at least ${MIN_AGE} years old. Current computed age: ${computedAge}.`
            : `Please double-check the birthdate - computed age is ${computedAge}, which exceeds ${MAX_AGE}.`}
        </div>
      )}

      {/* => Place of Birth - PSGC cascade fetched from our own backend,
           same pattern and depth (region/province/city, no barangay) as
           TESDAStep2's birthplace section. This is its OWN cascade, kept
           separate from the Home Address one further down. */}
      <div className="shs1-section-title" style={{ marginTop: '1.4rem' }}>
        Place of Birth, Citizenship & Religion
      </div>

      <div className="shs1-grid shs1-g3">
        <div className="shs1-field-group">
          <label className="shs1-label">Region <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.birthplaceRegion ? 'shs1-input--error' : ''}`}
            value={data.birthplaceRegion}
            onChange={(e) => {
              onChange('birthplaceRegion', e.target.value);
              onChange('birthplaceProvince', '');
              onChange('birthplaceCity', '');
              setBirthplaceProvinces([]);
              setBirthplaceCities([]);
              clearError('birthplaceRegion');
            }}
          >
            <option value="">Select Region</option>
            {birthplaceRegions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>

        {/* => Province hidden for NCR */}
        {!isBirthplaceNCR && (
          <div className="shs1-field-group">
            <label className="shs1-label">Province <span className="shs1-req">*</span></label>
            <select
              className={`shs1-select ${fieldErrors.birthplaceProvince ? 'shs1-input--error' : ''}`}
              value={data.birthplaceProvince}
              onChange={(e) => {
                onChange('birthplaceProvince', e.target.value);
                onChange('birthplaceCity', '');
                setBirthplaceCities([]);
                clearError('birthplaceProvince');
              }}
              disabled={!data.birthplaceRegion || loadingBirthplaceProvinces}
            >
              <option value="">
                {loadingBirthplaceProvinces ? 'Loading...' : !data.birthplaceRegion ? '- Select Region first -' : 'Select Province'}
              </option>
              {birthplaceProvinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="shs1-field-group">
          <label className="shs1-label">City / Municipality <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.birthplaceCity ? 'shs1-input--error' : ''}`}
            value={data.birthplaceCity}
            onChange={(e) => { onChange('birthplaceCity', e.target.value); clearError('birthplaceCity'); }}
            disabled={(!data.birthplaceProvince && !isBirthplaceNCR) || loadingBirthplaceCities}
          >
            <option value="">
              {loadingBirthplaceCities ? 'Loading...' : 'Select City / Municipality'}
            </option>
            {birthplaceCities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* => Citizenship - fetched from /api/reference/nationalities, same
           source and dropdown pattern as TESDAStep1's Nationality field.
           Religion - static list (no reference table needed), "Others"
           reveals a specify input. */}
      <div className="shs1-grid shs1-g2" style={{ marginTop: '1.2rem' }}>
        <div className="shs1-field-group">
          <label className="shs1-label">Citizenship <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.citizenship ? 'shs1-input--error' : ''}`}
            value={data.citizenship}
            onChange={(e) => { onChange('citizenship', e.target.value); clearError('citizenship'); }}
            disabled={loadingNationalities}
          >
            <option value="">
              {loadingNationalities ? 'Loading...' : 'Select Citizenship'}
            </option>
            {nationalities.map((n) => (
              // => Handles both array of strings and array of objects, same as TESDAStep1
              <option
                key={typeof n === 'string' ? n : n.code ?? n.id}
                value={typeof n === 'string' ? n : n.name}
              >
                {typeof n === 'string' ? n : n.name}
              </option>
            ))}
          </select>
        </div>

        <div className="shs1-field-group">
          <label className="shs1-label">Religion</label>
          <select
            className="shs1-select"
            value={data.religion}
            onChange={(e) => {
              onChange('religion', e.target.value);
              // => Clear the specify text when switching away from Others
              if (e.target.value !== 'Others') onChange('religionOthers', '');
              clearError('religionOthers');
            }}
          >
            <option value="">Select Religion</option>
            {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* => Specify input - only shown when "Others" is selected above */}
      {data.religion === 'Others' && (
        <div className="shs1-field-group" style={{ maxWidth: '320px' }}>
          <label className="shs1-label">Please specify <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${fieldErrors.religionOthers ? 'shs1-input--error' : ''}`}
            value={data.religionOthers}
            onChange={(e) => { applyProperCase(e, 'religionOthers', onChange); clearError('religionOthers'); }}
          />
        </div>
      )}

      {/* => Complete Home Address - PSGC cascade, fetched from our own
           /api/location/* backend (never psgc.cloud directly) */}
      <div className="shs1-section-title" style={{ marginTop: '1.4rem' }}>
        Complete Home Address
      </div>

      <div className="shs1-grid shs1-g3">
        <div className="shs1-field-group">
          <label className="shs1-label">
            Region <span className="shs1-req">*</span>
            <Info content="Fixed to Region VII (Central Visayas), since 3A Prime Hospitality Training and Assessment Center Inc. is physically located in Cebu City." />
          </label>
          <select
            className="shs1-select"
            value={data.region}
            // => Locked to Region VII - training is conducted on-site in
            // => Cebu City, so no other region applies
            disabled
          >
            {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>

        {/* => Province hidden for NCR - kept for structural safety, though
             region is now locked so this branch is effectively always true */}
        {!isNCR && (
          <div className="shs1-field-group">
            <label className="shs1-label">
              Province <span className="shs1-req">*</span>
              <Info content="Fixed to Cebu, since 3A Prime Hospitality Training and Assessment Center Inc. is physically located in Cebu City." />
            </label>
            <select
              className="shs1-select"
              value={data.province}
              // => Locked to Cebu - training is conducted on-site in Cebu
              // => City, so no other province applies
              disabled
            >
              {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="shs1-field-group">
          <label className="shs1-label">City / Municipality <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.city ? 'shs1-input--error' : ''}`}
            value={data.city}
            onChange={(e) => {
              const selectedCode = e.target.value;
              onChange('city', selectedCode);
              onChange('barangay', '');
              setBarangays([]);
              // => Auto-fill district from the already-loaded cities list
              const selected = cities.find(c => c.code === selectedCode);
              const raw = selected?.district || '';
              setDistrict(raw === 'Lone' ? 'Lone District' : raw ? `${raw} District` : '');
              onChange('district', raw);
              clearError('city');
            }}
            disabled={(!data.province && !isNCR) || loadingCities}
          >
            <option value="">{loadingCities ? 'Loading...' : 'Select City / Municipality'}</option>
            {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="shs1-grid shs1-g3" style={{ marginTop: '1.2rem' }}>
        <div className="shs1-field-group">
          <label className="shs1-label">Barangay <span className="shs1-req">*</span></label>
          <select
            className={`shs1-select ${fieldErrors.barangay ? 'shs1-input--error' : ''}`}
            value={data.barangay}
            onChange={(e) => { onChange('barangay', e.target.value); clearError('barangay'); }}
            disabled={!data.city || loadingBarangays}
          >
            <option value="">
              {loadingBarangays ? 'Loading...' : !data.city ? '- Select City first -' : 'Select Barangay'}
            </option>
            {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>

        <div className="shs1-field-group">
          <label className="shs1-label">House No. / Street <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${fieldErrors.street ? 'shs1-input--error' : ''}`}
            placeholder="e.g. 123 Rizal St."
            value={data.street}
            onChange={(e) => { applyProperCase(e, 'street', onChange); clearError('street'); }}
          />
        </div>

        <div className="shs1-field-group">
          <label className="shs1-label">Congressional District</label>
          <input
            type="text"
            className="shs1-input"
            value={district || (data.city ? 'Not in PSGC' : '-')}
            readOnly
            title="Auto-filled from selected city"
            style={{ background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-secondary)' }}
          />
          <span className="shs1-field-hint">Auto-filled based on city/municipality.</span>
        </div>
      </div>

      <div className="shs1-section-title" style={{ marginTop: '1.4rem' }}>
        Contact Information
      </div>

      {/* => Contact + Email + Facebook Link
           => Facebook Link isn't on the physical form - added so admins can
           => add the enrollee to their batch group chat without having to
           => ask for it again later. Grid bumped from g2 to g3 for the 3rd field. */}
      <div className="shs1-grid shs1-g3" style={{ marginTop: '1.2rem' }}>
        <div className="shs1-field-group">
          <label className="shs1-label">Contact Number <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${contactError ? 'shs1-input--error' : ''}`}
            placeholder="e.g. 09XXXXXXXXX"
            value={data.contactNo}
            maxLength={11}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
              onChange('contactNo', raw);
              setContactError(validateMobile(raw) || '');
            }}
          />
          {contactError && <span className="shs1-field-error">{contactError}</span>}
        </div>

        <div className="shs1-field-group">
          <label className="shs1-label">Email Address <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${emailError ? 'shs1-input--error' : ''}`}
            placeholder="e.g. juan@email.com"
            value={data.email}
            onChange={(e) => {
              onChange('email', e.target.value);
              setEmailError(validateEmail(e.target.value) || '');
            }}
          />
          {emailError && <span className="shs1-field-error">{emailError}</span>}
        </div>

        <div className="shs1-field-group">
          <label className="shs1-label">Facebook Profile Link <span className="shs1-req">*</span></label>
          <input
            type="text"
            className={`shs1-input ${facebookError ? 'shs1-input--error' : ''}`}
            placeholder="e.g. facebook.com/juandelacruz"
            value={data.facebookLink}
            onChange={(e) => {
              onChange('facebookLink', e.target.value);
              setFacebookError(validateFacebookLink(e.target.value) || '');
            }}
          />
          {facebookError && <span className="shs1-field-error">{facebookError}</span>}
          <span className="shs1-field-hint">Used by admins to add you to your batch group chat.</span>
        </div>
      </div>

      {/* => Error banner */}
      {showErrors && validate() !== 'valid' && (
        <div className="shs1-error-banner">
          <i className="ti ti-alert-circle" />
          {validate() === 'error'
            ? 'Please correct the errors above before proceeding.'
            : validate() === 'underage'
              ? `Enrollee must be at least ${MIN_AGE} years old to proceed.`
              : validate() === 'overage'
                ? `Please double-check the birthdate - computed age exceeds ${MAX_AGE} years.`
                : "Please fill in all required fields (denoted with ' * ') before proceeding."
          }
        </div>
      )}

      {/* => Navigation: Step 1 has no Back */}
      <div className="shs1-nav">
        <button className="shs1-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" />
        </button>
      </div>

    </div>
  );
};

export default SHSStep1;
