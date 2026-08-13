import React, { useState, useEffect } from 'react';
import './TESDAStep1.css';
import Info from '../../Info.jsx';

// => Name extension options from MIS 03-01
const NAME_EXTENSIONS = ['N/A', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

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

// => Capitalizes the first letter of each word
// => Handles names with spaces like "John Paul" => "John Paul"
const toTitleCase = (value) => {
  return value
    .replace(/[^a-zA-Z\s\-']/g, '')       // => Allow letters, spaces, hyphens, apostrophes (for names like O'Brien)
    .replace(/^\s+/, '')                    // => No leading spaces
    .replace(/\s{2,}/g, ' ')               // => Collapse multiple spaces into one
    .replace(/(^\w|(?<=[\s\-])\w)/g, (c) => c.toUpperCase()); // => Capitalize after space or hyphen
};

// => Converts to proper case: first letter of each word capitalized, the
// => rest forced to lowercase. Unlike toTitleCase() above (which only
// => forces the first letter and leaves the rest of the casing as typed),
// => this fully normalizes case. Used for the guardian name and address.
const toProperCase = (value) => {
  return value
    .replace(/^\s+/, '')                    // => No leading spaces
    .replace(/\s{2,}/g, ' ')               // => Collapse multiple spaces into one
    .toLowerCase()
    .replace(/(^\w|(?<=[\s\-\/#.,])\w)/g, (c) => c.toUpperCase()); // => Capitalize after space, hyphen, slash, #, period, or comma
};

// => Guardian name uses the same character restriction as the main name
// => fields (letters, spaces, hyphens, apostrophes only), proper-cased
const toProperCaseName = (value) => {
  return toProperCase(value.replace(/[^a-zA-Z\s\-']/g, ''));
};

// => Validates Philippine mobile number
// => Must start with '09' and be exactly 11 digits
const validateMobile = (value) => {
  if (!value) return 'Contact number is required.';
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

// => Broad email format check: accepts any real provider (gmail.com,
// => icloud.com, yahoo.com, outlook.com, custom domains, .com.ph, .edu,
// => etc.) - only rejects structurally malformed input. Same pattern as
// => SHSStep1.jsx and StudentDetail.jsx, so all three enforce identically.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validateEmail = (value) => {
  if (!value) return 'Email is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return null;
};

// => Accepts facebook.com links with no subdomain, www., or Meta's actual
// => "web." desktop subdomain, with or without http(s)://. Matches
// => SHSStep1.jsx and StudentDetail.jsx so all three enforce identically.
const FACEBOOK_LINK_REGEX = /^(https?:\/\/)?(www\.|web\.)?facebook\.com\/.+$/i;
const validateFacebookLink = (value) => {
  if (!value) return 'Facebook profile link is required.';
  if (!FACEBOOK_LINK_REGEX.test(value)) return 'Please enter a valid Facebook URL (e.g. https://www.facebook.com/yourname).';
  return null;
};

// => Merged Step 1: Learner/Manpower Profile (old Step1) + Personal
// => Information (old Step2). Two separate data objects are still passed
// => in/out so Enroll.jsx's tesdaProfile/tesdaPersonal state shape does
// => not need to change - only the step numbering changes.
const TESDAStep1 = ({ profileData, onProfileChange, personalData, onPersonalChange, onNext }) => {

  // ============================================================
  // => Address cascade state (old Step1) - prefixed "addr" so it
  // => doesn't collide with the birthplace cascade below
  // ============================================================
  const [addrRegions, setAddrRegions] = useState([]);
  const [addrProvinces, setAddrProvinces] = useState([]);
  const [addrCities, setAddrCities] = useState([]);
  const [addrBarangays, setAddrBarangays] = useState([]);

  const [addrLoadingProvinces, setAddrLoadingProvinces] = useState(false);
  const [addrLoadingCities, setAddrLoadingCities] = useState(false);
  const [addrLoadingBarangays, setAddrLoadingBarangays] = useState(false);

  // => Auto-filled from PSGC city data
  const [district, setDistrict] = useState('');

  // => Nationality list fetched from /api/reference/nationalities
  const [nationalities, setNationalities] = useState([]);
  const [loadingNationalities, setLoadingNationalities] = useState(true);

  // => Inline field-level errors for email, facebook, and contact
  const [emailError, setEmailError] = useState('');
  const [facebookError, setFacebookError] = useState('');
  const [contactError, setContactError] = useState('');
  // => Inline error for the guardian contact number, mirrors contactError above
  const [guardianContactError, setGuardianContactError] = useState('');

  // ============================================================
  // => Birthplace cascade state (old Step2) - prefixed "birth"
  // ============================================================
  const [birthRegions, setBirthRegions] = useState([]);
  const [birthProvinces, setBirthProvinces] = useState([]);
  const [birthCities, setBirthCities] = useState([]);
  const [birthLoadingProvinces, setBirthLoadingProvinces] = useState(false);
  const [birthLoadingCities, setBirthLoadingCities] = useState(false);

  // => Computed age from birthdate fields (formatted string, for display)
  const [computedAge, setComputedAge] = useState('');
  // => Same computation as computedAge but kept as a raw number (or null)
  //    so validate() can compare it against MIN_AGE/MAX_AGE directly
  const [computedAgeRaw, setComputedAgeRaw] = useState(null);

  // ============================================================
  // => Combined field-level error flags - one object covering both
  // => sections, since this is now a single step with a single Next button
  // ============================================================
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
    email: false,
    facebookLink: false,
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
    guardianContactNo: false,
  });

  // => Controls whether validation errors are visible
  const [showErrors, setShowErrors] = useState(false);

  // => Track if selected region is NCR (no province level) - address
  const isNCR = profileData.region === '1300000000';
  // => Track if selected region is NCR (no province level) - birthplace
  const isBirthNCR = personalData.birthplaceRegion === '1300000000';

  // => Whether guardian fields should show (minor = under 18)
  const isMinor = (() => {
    if (!personalData.birthYear || !personalData.birthMonth || !personalData.birthDay) return false;
    const birth = new Date(
      parseInt(personalData.birthYear),
      MONTHS.indexOf(personalData.birthMonth),
      parseInt(personalData.birthDay)
    );
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return (age - 1) < 18;
    }
    return age < 18;
  })();

  // => Helper to clear a specific field error as soon as user interacts with it
  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => Fetch nationalities from backend on mount
  useEffect(() => {
    fetch('/api/reference/nationalities')
      .then(r => r.json())
      .then(d => setNationalities(Array.isArray(d) ? d : []))
      .catch(err => console.error('Failed to fetch nationalities:', err))
      .finally(() => setLoadingNationalities(false));
  }, []);

  // => Fetch address regions on mount
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setAddrRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch birthplace regions on mount - separate call from address
  // => regions above so either cascade can be swapped independently
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setBirthRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch address provinces or cities depending on region
  useEffect(() => {
    if (!profileData.region) {
      setAddrProvinces([]);
      setAddrCities([]);
      setAddrBarangays([]);
      return;
    }

    if (isNCR) {
      // => NCR has no provinces, go straight to cities
      setAddrLoadingCities(true);
      fetch(`/api/location/cities-by-region/${profileData.region}`)
        .then(r => r.json())
        .then(d => setAddrCities(d))
        .catch(err => console.error('Failed to fetch NCR cities:', err))
        .finally(() => setAddrLoadingCities(false));
    } else {
      setAddrLoadingProvinces(true);
      fetch(`/api/location/provinces/${profileData.region}`)
        .then(r => r.json())
        .then(d => setAddrProvinces(d))
        .catch(err => console.error('Failed to fetch provinces:', err))
        .finally(() => setAddrLoadingProvinces(false));
    }
  }, [profileData.region]);

  // => Fetch address cities when province changes
  useEffect(() => {
    if (!profileData.province || isNCR) return;
    setAddrLoadingCities(true);
    fetch(`/api/location/cities/${profileData.province}`)
      .then(r => r.json())
      .then(d => setAddrCities(d))
      .catch(err => console.error('Failed to fetch cities:', err))
      .finally(() => setAddrLoadingCities(false));
  }, [profileData.province]);

  // => Fetch barangays when address city changes
  useEffect(() => {
    if (!profileData.city) return;
    setAddrLoadingBarangays(true);
    fetch(`/api/location/barangays/${profileData.city}`)
      .then(r => r.json())
      .then(d => setAddrBarangays(d))
      .catch(err => console.error('Failed to fetch barangays:', err))
      .finally(() => setAddrLoadingBarangays(false));
  }, [profileData.city]);

  // => Fetch birthplace provinces or cities depending on birthplace region
  useEffect(() => {
    if (!personalData.birthplaceRegion) {
      setBirthProvinces([]);
      setBirthCities([]);
      return;
    }
    if (isBirthNCR) {
      setBirthLoadingCities(true);
      // => NCR has no provinces, fetch cities directly by region
      fetch(`/api/location/cities-by-region/${personalData.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setBirthCities(d))
        .catch(err => console.error('Failed to fetch NCR cities:', err))
        .finally(() => setBirthLoadingCities(false));
    } else {
      setBirthLoadingProvinces(true);
      fetch(`/api/location/provinces/${personalData.birthplaceRegion}`)
        .then(r => r.json())
        .then(d => setBirthProvinces(d))
        .catch(err => console.error('Failed to fetch provinces:', err))
        .finally(() => setBirthLoadingProvinces(false));
    }
  }, [personalData.birthplaceRegion]);

  // => Fetch cities when birthplace province changes
  useEffect(() => {
    if (!personalData.birthplaceProvince || isBirthNCR) return;
    setBirthLoadingCities(true);
    fetch(`/api/location/cities/${personalData.birthplaceProvince}`)
      .then(r => r.json())
      .then(d => setBirthCities(d))
      .catch(err => console.error('Failed to fetch cities:', err))
      .finally(() => setBirthLoadingCities(false));
  }, [personalData.birthplaceProvince]);

  // => Compute and display age when birthdate fields change
  useEffect(() => {
    if (!personalData.birthYear || !personalData.birthMonth || !personalData.birthDay) {
      setComputedAge('');
      setComputedAgeRaw(null);
      return;
    }
    const birth = new Date(
      parseInt(personalData.birthYear),
      MONTHS.indexOf(personalData.birthMonth),
      parseInt(personalData.birthDay)
    );
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setComputedAge(age >= 0 ? `${age} years old` : '');
    setComputedAgeRaw(age >= 0 ? age : null);
  }, [personalData.birthYear, personalData.birthMonth, personalData.birthDay]);

  // => Generate days array based on selected month and year
  const getDays = () => {
    if (!personalData.birthMonth || !personalData.birthYear) return Array.from({ length: 31 }, (_, i) => i + 1);
    const monthIndex = MONTHS.indexOf(personalData.birthMonth);
    const daysInMonth = new Date(parseInt(personalData.birthYear), monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // => Generate year range - limited to the last 100 years (matches
  // => MAX_AGE below), so the dropdown never offers a year the age gate
  // => would reject anyway.
  const getYears = () => {
    const current = new Date().getFullYear();
    return Array.from({ length: MAX_AGE }, (_, i) => current - i);
  };

  // => Combined validator - runs both old Step1 and old Step2 checks in
  // => sequence, since they now live under one Next button
  const validate = () => {
    // -- Learner / Manpower Profile checks --
    if (!profileData.lastName) return 'missing';
    if (!profileData.firstName) return 'missing';
    if (!profileData.region) return 'missing';
    if (!isNCR && !profileData.province) return 'missing';
    if (!profileData.city) return 'missing';
    if (!profileData.barangay) return 'missing';
    if (!profileData.street) return 'missing';
    if (!profileData.contactNo) return 'missing';
    if (!profileData.nationality) return 'missing';
    if (!profileData.email) return 'missing';
    if (!profileData.facebookLink) return 'missing';
    if (validateMobile(profileData.contactNo)) return 'error';
    if (validateEmail(profileData.email)) return 'error';
    if (validateFacebookLink(profileData.facebookLink)) return 'error';

    // -- Personal Information checks --
    if (!personalData.sex) return 'missing';
    if (!personalData.civilStatus) return 'missing';
    if (!personalData.employmentStatus) return 'missing';
    if (!personalData.birthMonth) return 'missing';
    if (!personalData.birthDay) return 'missing';
    if (!personalData.birthYear) return 'missing';
    // => Must come after the birthdate-missing check above, since
    // => computedAgeRaw is null until all 3 birthdate fields are filled
    if (computedAgeRaw !== null && computedAgeRaw < MIN_AGE) return 'underage';
    if (computedAgeRaw !== null && computedAgeRaw > MAX_AGE) return 'overage';
    if (!personalData.birthplaceRegion) return 'missing';
    if (!isBirthNCR && !personalData.birthplaceProvince) return 'missing';
    if (!personalData.birthplaceCity) return 'missing';
    if (!personalData.educAttainment) return 'missing';
    // => Guardian name and contact number required if student is a minor
    if (isMinor && !personalData.guardianName) return 'missing';
    if (isMinor) {
      const guardianErr = validateMobile(personalData.guardianContactNo);
      // => Distinguish "field is empty" from "field is filled but wrong
      // => format" so the banner doesn't tell the person to fill in a
      // => field they've already filled in
      if (guardianErr) return personalData.guardianContactNo ? 'error' : 'missing';
    }

    return 'valid';
  };

  const handleNext = () => {
    // => Run inline validators and show their errors on submit attempt
    const mobileErr = validateMobile(profileData.contactNo);
    const emailErr = validateEmail(profileData.email);
    const facebookErr = validateFacebookLink(profileData.facebookLink);
    setContactError(mobileErr || '');
    setEmailError(emailErr || '');
    setFacebookError(facebookErr || '');
    // => Only validate guardian contact when the guardian section is visible
    setGuardianContactError(isMinor ? (validateMobile(personalData.guardianContactNo) || '') : '');

    // => Mark which specific fields are empty/invalid so they turn red
    setFieldErrors({
      lastName: !profileData.lastName,
      firstName: !profileData.firstName,
      region: !profileData.region,
      province: !isNCR && !profileData.province,
      city: !profileData.city,
      barangay: !profileData.barangay,
      street: !profileData.street,
      contactNo: !profileData.contactNo || !!mobileErr,
      nationality: !profileData.nationality,
      email: !!emailErr,
      facebookLink: !!facebookErr,
      sex: !personalData.sex,
      civilStatus: !personalData.civilStatus,
      employmentStatus: !personalData.employmentStatus,
      birthMonth: !personalData.birthMonth,
      birthDay: !personalData.birthDay,
      birthYear: !personalData.birthYear,
      birthplaceRegion: !personalData.birthplaceRegion,
      birthplaceProvince: !isBirthNCR && !personalData.birthplaceProvince,
      birthplaceCity: !personalData.birthplaceCity,
      educAttainment: !personalData.educAttainment,
      guardianName: isMinor && !personalData.guardianName,
      guardianContactNo: isMinor && !/^09\d{9}$/.test(personalData.guardianContactNo || ''),
    });

    if (validate() !== 'valid') {
      setShowErrors(true);
      return;
    }

    // => Clear all field highlights on successful validation
    setFieldErrors({
      lastName: false, firstName: false, region: false, province: false,
      city: false, barangay: false, street: false, contactNo: false,
      nationality: false, email: false, facebookLink: false,
      sex: false, civilStatus: false, employmentStatus: false,
      birthMonth: false, birthDay: false, birthYear: false,
      birthplaceRegion: false, birthplaceProvince: false, birthplaceCity: false,
      educAttainment: false, guardianName: false, guardianContactNo: false,
    });
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="ts1-wrap">

      {/* ============================================================
          SECTION A: Learner / Manpower Profile (old Step 1)
          ============================================================ */}

      <div className="ts1-section-title">Learner / Manpower Profile</div>

      {/* => Name row: Last Name, Extension, First Name, Middle Name */}
      <div className="ts1-grid ts1-name-row">
        <div className="ts1-field-group">
          <label className="ts1-label">Last Name <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${fieldErrors.lastName ? 'ts1-input--error' : ''}`}
            placeholder="e.g. Dela Cruz"
            value={profileData.lastName}
            onChange={(e) => {
              onProfileChange('lastName', toTitleCase(e.target.value));
              clearError('lastName');
            }}
          />
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Name Extension</label>
          <select
            className="ts1-select"
            value={profileData.nameExtension}
            onChange={(e) => onProfileChange('nameExtension', e.target.value)}
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
            value={profileData.firstName}
            // => toTitleCase handles multi-word first names like "John Paul"
            onChange={(e) => {
              onProfileChange('firstName', toTitleCase(e.target.value));
              clearError('firstName');
            }}
          />
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">Middle Name</label>
          <input
            type="text"
            className="ts1-input"
            placeholder="e.g. Santos"
            value={profileData.middleName}
            onChange={(e) => onProfileChange('middleName', toTitleCase(e.target.value))}
          />
        </div>
      </div>

      {/* Complete Mailing Address */}
      <div className="ts1-section-title" style={{ marginTop: '1.8rem' }}>
        Complete Permanent Mailing Address
      </div>

      {/* => Row 1: Region + Province + City */}
      <div className="ts1-grid ts1-g3">
        <div className="ts1-field-group">
          <label className="ts1-label">
            Region <span className="ts1-req">*</span>
            <Info content="Fixed to Region VII (Central Visayas), since 3A Prime Hospitality Training and Assessment Center Inc. is physically located in Cebu City." />
          </label>
          <select
            className="ts1-select"
            value={profileData.region}
            // => Locked to Region VII - training is conducted on-site in
            // => Cebu City, so no other region applies
            disabled
          >
            {addrRegions.map(r => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* => Province hidden for NCR - kept for structural safety, though
             region is now locked so this branch is effectively always true */}
        {!isNCR && (
          <div className="ts1-field-group">
            <label className="ts1-label">
              Province <span className="ts1-req">*</span>
              <Info content="Fixed to Cebu, since 3A Prime Hospitality Training and Assessment Center Inc. is physically located in Cebu City." />
            </label>
            <select
              className="ts1-select"
              value={profileData.province}
              // => Locked to Cebu - training is conducted on-site in Cebu
              // => City, so no other province applies
              disabled
            >
              {addrProvinces.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ts1-field-group">
          <label className="ts1-label">City / Municipality <span className="ts1-req">*</span></label>
          <select
            className={`ts1-select ${fieldErrors.city ? 'ts1-input--error' : ''}`}
            value={profileData.city}
            onChange={(e) => {
              const selectedCode = e.target.value;
              onProfileChange('city', selectedCode);
              onProfileChange('barangay', '');
              setAddrBarangays([]);
              // => Auto-fill district from the already-loaded cities list
              const selected = addrCities.find(c => c.code === selectedCode);
              const raw = selected?.district || '';
              setDistrict(
                raw === 'Lone' ? 'Lone District'
                : raw ? `${raw} District`
                : ''
              );
              onProfileChange('district', raw);
            }}
            disabled={(!profileData.province && !isNCR) || addrLoadingCities}
          >
            <option value="">
              {addrLoadingCities ? 'Loading...' : 'Select City / Municipality'}
            </option>
            {addrCities.map(c => (
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
            value={district || (profileData.city ? 'Not in PSGC' : '-')}
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
            value={profileData.barangay}
            onChange={(e) => onProfileChange('barangay', e.target.value)}
            disabled={!profileData.city || addrLoadingBarangays}
          >
            <option value="">
              {addrLoadingBarangays ? 'Loading...' : !profileData.city ? '- Select City first -' : 'Select Barangay'}
            </option>
            {addrBarangays.map(b => (
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
            value={profileData.street}
            onChange={(e) => {
              // => Same proper-case treatment as guardian address - keeps
              // => numbers and punctuation, only normalizes letter casing
              onProfileChange('street', toProperCase(e.target.value));
              clearError('street');
            }}
          />
        </div>
      </div>

      {/* => Row 3: Email + Facebook - both required as of the student_profile
           NOT NULL tightening. Replaces the old dual-purpose "email or FB
           name" single field. */}
      <div className="ts1-grid ts1-g2" style={{ marginTop: '1.2rem' }}>

        <div className="ts1-field-group">
          <label className="ts1-label">Email Address <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${emailError || fieldErrors.email ? 'ts1-input--error' : ''}`}
            placeholder="e.g. juan@email.com"
            value={profileData.email}
            onChange={(e) => {
              onProfileChange('email', e.target.value);
              setEmailError(validateEmail(e.target.value) || '');
              clearError('email');
            }}
          />
          {emailError && (
            <span className="ts1-field-error">{emailError}</span>
          )}
        </div>

        <div className="ts1-field-group">
          <label className="ts1-label">
            Facebook Profile Link <span className="ts1-req">*</span>
            <Info content="Used to add you to your batch's Facebook group chat, where your trainer and staff post class schedules, requirements, and updates." />
          </label>
          <input
            type="text"
            className={`ts1-input ${facebookError || fieldErrors.facebookLink ? 'ts1-input--error' : ''}`}
            placeholder="e.g. https://www.facebook.com/yourname"
            value={profileData.facebookLink}
            onChange={(e) => {
              onProfileChange('facebookLink', e.target.value);
              setFacebookError(validateFacebookLink(e.target.value) || '');
              clearError('facebookLink');
            }}
          />
          {facebookError && (
            <span className="ts1-field-error">{facebookError}</span>
          )}
        </div>
      </div>

      {/* => Row 3b: Contact No. + Nationality */}
      <div className="ts1-grid ts1-g2" style={{ marginTop: '1.2rem' }}>

        <div className="ts1-field-group">
          <label className="ts1-label">Contact No. <span className="ts1-req">*</span></label>
          <input
            type="text"
            className={`ts1-input ${contactError ? 'ts1-input--error' : ''}`}
            placeholder="e.g. 09XXXXXXXXX"
            value={profileData.contactNo}
            maxLength={11}
            onChange={(e) => {
              // => Strip non-digits, enforce 09 prefix and 11-digit max
              const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
              onProfileChange('contactNo', raw);
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
            value={profileData.nationality}
            onChange={(e) => onProfileChange('nationality', e.target.value)}
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

      {/* ============================================================
          SECTION B: Personal Information (old Step 2)
          ============================================================ */}

      <div className="ts2-section-title" style={{ marginTop: '1.8rem' }}>Personal Information</div>

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
                  checked={personalData.sex === opt}
                  onChange={(e) => {
                    onPersonalChange('sex', e.target.value);
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
            value={personalData.civilStatus}
            onChange={(e) => {
              onPersonalChange('civilStatus', e.target.value);
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
            value={personalData.employmentStatus}
            onChange={(e) => {
              onPersonalChange('employmentStatus', e.target.value);
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
            value={personalData.birthMonth}
            onChange={(e) => {
              onPersonalChange('birthMonth', e.target.value);
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
            value={personalData.birthDay}
            onChange={(e) => {
              onPersonalChange('birthDay', e.target.value);
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
            value={personalData.birthYear}
            onChange={(e) => {
              onPersonalChange('birthYear', e.target.value);
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
            value={personalData.birthplaceRegion}
            onChange={(e) => {
              onPersonalChange('birthplaceRegion', e.target.value);
              onPersonalChange('birthplaceProvince', '');
              onPersonalChange('birthplaceCity', '');
              setBirthProvinces([]);
              setBirthCities([]);
              clearError('birthplaceRegion');
            }}
          >
            <option value="">Select Region</option>
            {birthRegions.map(r => (
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
              value={personalData.birthplaceProvince}
              onChange={(e) => {
                onPersonalChange('birthplaceProvince', e.target.value);
                onPersonalChange('birthplaceCity', '');
                setBirthCities([]);
                clearError('birthplaceProvince');
              }}
              disabled={!personalData.birthplaceRegion || birthLoadingProvinces}
            >
              <option value="">
                {birthLoadingProvinces ? 'Loading...' : !personalData.birthplaceRegion ? '- Select Region first -' : 'Select Province'}
              </option>
              {birthProvinces.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ts2-field-group">
          <label className="ts2-label">City / Municipality <span className="ts2-req">*</span></label>
          <select
            className={`ts2-select ${fieldErrors.birthplaceCity ? 'ts2-input--error' : ''}`}
            value={personalData.birthplaceCity}
            onChange={(e) => {
              onPersonalChange('birthplaceCity', e.target.value);
              clearError('birthplaceCity');
            }}
            disabled={(!personalData.birthplaceProvince && !isBirthNCR) || birthLoadingCities}
          >
            <option value="">
              {birthLoadingCities ? 'Loading...' : 'Select City / Municipality'}
            </option>
            {birthCities.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* => Educational Attainment section */}
      <div className="ts2-section-title" style={{ marginTop: '1.4rem' }}>
        Educational Attainment Before the Training
      </div>

      <div className="ts2-field-group">
        <label className="ts2-label">Highest Attainment <span className="ts2-req">*</span></label>
        <select
            className={`ts2-select ${fieldErrors.educAttainment ? 'ts2-input--error' : ''}`}
            value={personalData.educAttainment}
            onChange={(e) => {
              onPersonalChange('educAttainment', e.target.value);
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
                value={personalData.guardianName}
                onChange={(e) => {
                  onPersonalChange('guardianName', toProperCaseName(e.target.value));
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
                value={personalData.guardianAddress}
                onChange={(e) => onPersonalChange('guardianAddress', toProperCase(e.target.value))}
              />
            </div>
            <div className="ts2-field-group">
              <label className="ts2-label">
                Guardian Contact No. <span className="ts2-req">*</span>
              </label>
              <input
                type="text"
                className={`ts2-input ${guardianContactError || fieldErrors.guardianContactNo ? 'ts2-input--error' : ''}`}
                placeholder="e.g. 09XXXXXXXXX"
                value={personalData.guardianContactNo}
                maxLength={11}
                onChange={(e) => {
                  // => Strip non-digits, enforce 09 prefix and 11-digit max, same as contactNo above
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                  onPersonalChange('guardianContactNo', raw);
                  setGuardianContactError(validateMobile(raw) || '');
                  clearError('guardianContactNo');
                }}
              />
              {guardianContactError && (
                <span className="ts1-field-error">{guardianContactError}</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* => Single combined error banner covering both sections */}
      {showErrors && validate() !== 'valid' && (
        <div className="ts1-error-banner">
          <i className="ti ti-alert-circle" />
          {validate() === 'error'
            ? 'Please correct the errors above before proceeding.'
            : validate() === 'underage'
              ? `Student must be at least ${MIN_AGE} years old to proceed.`
              : validate() === 'overage'
                ? `Please double-check the birthdate - computed age exceeds ${MAX_AGE} years.`
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
