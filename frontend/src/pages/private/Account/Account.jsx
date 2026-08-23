import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import './account.css';
import axiosStudent from '../../../utils/axiosStudent.js';
import { apiFetch, RateLimitError } from '../../../utils/api.js';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';
// => Reusing the same toggle NavBar already uses, since theme persistence
// => now lives centrally in ThemeContext regardless of which component calls it
import ThemeToggle from '../../../components/ThemeToggle.jsx';

// icons
// => errorIcon reused from Enrollment.jsx's existing assets, still needed
// => for the rate-limit state's icon below
import errorIcon    from '../../../assets/icons/warning.png';
import lockIcon     from '../../../assets/icons/lock.png';
// => Reused from setPassword.jsx's same checklist pattern - checkmark.png
// => should already exist on the student side from that page, circle.png
// => needs to be added if it isn't already there
import checkIcon    from '../../../assets/icons/checkmark.png';
import circleIcon   from '../../../assets/icons/circle.png';
// => Same eye/eye-off pair setPassword.jsx already uses on the student side
import eyeIcon      from '../../../assets/icons/eye.png';
import eyeOffIcon   from '../../../assets/icons/eye-off.png';

// => NCR has no province level in PSGC - same constant TESDAStep1.jsx uses
const NCR_REGION_CODE = '1300000000';

// => Strips non-digits and caps at 11 - same treatment as TESDAStep1.jsx's contactNo handling
const sanitizeMobile = (value) => value.replace(/\D/g, '').slice(0, 11);

// => Same validators as TESDAStep1.jsx / SHSStep1.jsx, duplicated here so
// => Account enforces identical formatting rules to the enrollment forms
const validateMobile = (value) => {
  if (!value) return 'Contact number is required.';
  if (!/^09\d{9}$/.test(value)) return 'Must start with 09 and be exactly 11 digits.';
  return null;
};

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const validateEmail = (value) => {
  if (!value) return 'Email is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return null;
};

const FACEBOOK_LINK_REGEX = /^(https?:\/\/)?(www\.|web\.)?facebook\.com\/.+$/i;
const validateFacebookLink = (value) => {
  if (!value) return 'Facebook profile link is required.';
  if (!FACEBOOK_LINK_REGEX.test(value)) return 'Please enter a valid Facebook URL (e.g. https://www.facebook.com/yourname).';
  return null;
};

// => Same proper-case normalizer TESDAStep1.jsx uses for street/guardian
// => address - keeps numbers and punctuation, only normalizes letter casing
const toProperCase = (value) => {
  return value
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase()
    .replace(/(^\w|(?<=[\s\-\/#.,])\w)/g, (c) => c.toUpperCase());
};

// => Same 4 rules enforced server-side in accountServices.js
// => validatePasswordStrength - keep both lists in sync if the rule set
// => ever changes
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const Account = () => {
  // => Page-level fetch state - mirrors Enrollment.jsx's loading/error/rate-limit pattern
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  // => Locked Personal Information - read straight from GET /api/account, never edited
  const [personal, setPersonal] = useState(null);

  // => Form 1: Contact & Address (editable)
  const [form, setForm] = useState({
    email: '', contactNo: '', facebookLink: '',
    street: '', barangay: '', city: '', province: '', district: '', region: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // => Inline field-level validation, same pattern as TESDAStep1.jsx
  const [emailError, setEmailError] = useState('');
  const [facebookError, setFacebookError] = useState('');
  const [contactError, setContactError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({
    email: false, contactNo: false, facebookLink: false,
    city: false, barangay: false, street: false,
  });
  const [showProfileErrors, setShowProfileErrors] = useState(false);

  // => Form 2: Password Reset (editable, separate submit from Form 1 per your direction)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // => Independent toggle per field - showing New Password shouldn't
  // => reveal Current or Confirm at the same time
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRulesMet = PASSWORD_RULES.every(rule => rule.test(passwordForm.newPassword));
  const newPasswordsMatch = passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword;

  // => Address cascade state - same shape as TESDAStep1.jsx's addr* state
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const isNCR = form.region === NCR_REGION_CODE;

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // => Clears one field's red-border flag as soon as the student interacts
  // => with it, same as TESDAStep1.jsx's clearError()
  const clearProfileFieldError = (field) => {
    setProfileFieldErrors(prev => ({ ...prev, [field]: false }));
  };

  // => Combined validator for Form 1 - required fields + format checks,
  // => same shape as TESDAStep1.jsx's validate()
  const validateProfileForm = () => {
    if (!form.email) return 'missing';
    if (!form.contactNo) return 'missing';
    if (!form.facebookLink) return 'missing';
    if (!form.city) return 'missing';
    if (!form.barangay) return 'missing';
    if (!form.street) return 'missing';
    if (validateMobile(form.contactNo)) return 'error';
    if (validateEmail(form.email)) return 'error';
    if (validateFacebookLink(form.facebookLink)) return 'error';
    return 'valid';
  };

  // => Resolved display names for the locked Region/Province fields -
  // => codes only exist in form state, students never see raw PSGC codes
  const regionName = regions.find(r => r.code === form.region)?.name || form.region;
  const provinceName = provinces.find(p => p.code === form.province)?.name
    || (loadingProvinces ? 'Loading...' : form.province);

  // => Fetch account data on mount - wrapped in useCallback so RateLimitNotice
  // => can retry with the exact same function, same pattern as Enrollment.jsx
  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setRateLimitInfo(null);
    try {
      const data = await apiFetch('/api/account', { credentials: 'include' });
      const acc = data.account;

      setPersonal({
        firstName: acc.first_name,
        middleName: acc.middle_name,
        lastName: acc.last_name,
        nameExtension: acc.name_extension,
        birthDate: acc.birth_date,
        sex: acc.sex,
        civilStatus: acc.civil_status,
        nationality: acc.nationality,
        employmentStatus: acc.employment_status,
        highestEducAttainment: acc.highest_educ_attainment,
      });

      // => Setting region/city here (not just on user interaction) is what
      // => triggers the cascade effects below to pre-load the matching
      // => provinces/cities/barangays lists for display
      setForm({
        email: acc.email || '',
        contactNo: acc.contact_no || '',
        facebookLink: acc.facebook_link || '',
        street: acc.street || '',
        barangay: acc.barangay_code || '',
        city: acc.city_code || '',
        province: acc.province_code || '',
        district: acc.district_code || '',
        region: acc.region_code || '',
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimitInfo(err.retryAfter);
      } else {
        setLoadError('Failed to fetch account details.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  // => Fetch regions on mount - same as TESDAStep1.jsx
  useEffect(() => {
    fetch('/api/location/regions')
      .then(r => r.json())
      .then(d => setRegions(d))
      .catch(err => console.error('Failed to fetch regions:', err));
  }, []);

  // => Fetch provinces or cities depending on region - reacts to both a
  // => user's dropdown change AND the initial region loaded from the GET,
  // => so the existing address pre-populates correctly on page load
  useEffect(() => {
    if (!form.region) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      return;
    }

    if (isNCR) {
      setLoadingCities(true);
      fetch(`/api/location/cities-by-region/${form.region}`)
        .then(r => r.json())
        .then(d => setCities(d))
        .catch(err => console.error('Failed to fetch NCR cities:', err))
        .finally(() => setLoadingCities(false));
    } else {
      setLoadingProvinces(true);
      fetch(`/api/location/provinces/${form.region}`)
        .then(r => r.json())
        .then(d => setProvinces(d))
        .catch(err => console.error('Failed to fetch provinces:', err))
        .finally(() => setLoadingProvinces(false));
    }
  }, [form.region]);

  // => Fetch cities when province changes
  useEffect(() => {
    if (!form.province || isNCR) return;
    setLoadingCities(true);
    fetch(`/api/location/cities/${form.province}`)
      .then(r => r.json())
      .then(d => setCities(d))
      .catch(err => console.error('Failed to fetch cities:', err))
      .finally(() => setLoadingCities(false));
  }, [form.province]);

  // => Fetch barangays when city changes
  useEffect(() => {
    if (!form.city) return;
    setLoadingBarangays(true);
    fetch(`/api/location/barangays/${form.city}`)
      .then(r => r.json())
      .then(d => setBarangays(d))
      .catch(err => console.error('Failed to fetch barangays:', err))
      .finally(() => setLoadingBarangays(false));
  }, [form.city]);

  // => Form 1 submit - PATCH /api/account/profile via axiosStudent (mutation, not apiFetch)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    // => Run inline validators and surface their errors on submit attempt,
    // => same sequence as TESDAStep1.jsx's handleNext()
    const mobileErr = validateMobile(form.contactNo);
    const emailErr = validateEmail(form.email);
    const facebookErr = validateFacebookLink(form.facebookLink);
    setContactError(mobileErr || '');
    setEmailError(emailErr || '');
    setFacebookError(facebookErr || '');

    setProfileFieldErrors({
      email: !form.email || !!emailErr,
      contactNo: !form.contactNo || !!mobileErr,
      facebookLink: !form.facebookLink || !!facebookErr,
      city: !form.city,
      barangay: !form.barangay,
      street: !form.street,
    });

    if (validateProfileForm() !== 'valid') {
      setShowProfileErrors(true);
      return;
    }
    setShowProfileErrors(false);

    setSavingProfile(true);
    try {
      await axiosStudent.patch('/account/profile', form);
      toast.success('Profile updated successfully.');
    } catch (err) {
      // => Controller sends { success: false, message } on validation errors - see accountController.js
      const message = err.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  // => Form 2 submit - PATCH /api/account/password via axiosStudent
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // => Mirrors the full rule set enforced server-side in
    // => accountServices.js validatePasswordStrength
    if (!passwordRulesMet) {
      toast.error('New password does not meet the requirements below.');
      return;
    }
    if (!newPasswordsMatch) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await axiosStudent.patch('/account/password', passwordForm);
      toast.success('Password changed successfully.');
      // => Clear all three fields after a successful change - nothing left
      // => sitting in the form that could be resubmitted accidentally
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password. Please try again.';
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  // => Rate-limited / loading / error states - same layout pattern as Enrollment.jsx
  if (rateLimitInfo) {
    return (
      <div className="acct-page">
        <div className="acct-empty">
          <img src={errorIcon} alt="" className="acct-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchAccount} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="acct-page">
        {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
        <LoadingState message="Loading your account..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="acct-page">
        <div className="acct-empty">
          <img src={errorIcon} alt="" className="acct-empty-icon" />
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="acct-page">
      <div className="acct-header">
        <h1 className="acct-title">Account Settings</h1>
        <p className="acct-subtitle">Update your contact details, address, and password.</p>
      </div>

      {/* ============================================================
          EDITABLE: Display Preferences
          => Day/Night toggle - syncs with student_accounts.is_night_mode,
          => same toggle instance behavior as the public NavBar's toggle
          ============================================================ */}
      <section className="acct-card">
        <h2 className="acct-card-title">Display Preferences</h2>
        <div className="acct-card-title-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="acct-label" style={{ marginBottom: '4px' }}>Day / Night Mode</p>
            <p className="acct-subtitle" style={{ margin: 0 }}>
              This applies across the site and is saved to your account.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* ============================================================
          LOCKED: Personal Information
          => Tied to the submitted PSA birth certificate, never editable here
          ============================================================ */}
      <section className="acct-card">
        <div className="acct-card-title-row">
          <img src={lockIcon} alt="" className="acct-lock-icon" />
          <h2 className="acct-card-title">Personal Information</h2>
        </div>
        <p className="acct-locked-note">
          These details are tied to your submitted documents and cannot be edited
          here. To request a correction, please submit a support ticket for our office to assist you.
        </p>

        <div className="acct-grid acct-g3">
          <div className="acct-field-group">
            <label className="acct-label">First Name</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.firstName || ''} disabled readOnly />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Middle Name</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.middleName || ''} disabled readOnly />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Last Name</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.lastName || ''} disabled readOnly />
          </div>
        </div>

        <div className="acct-grid acct-g3">
          <div className="acct-field-group">
            <label className="acct-label">Name Extension</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.nameExtension || 'N/A'} disabled readOnly />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Sex</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.sex || ''} disabled readOnly />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Civil Status</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.civilStatus || ''} disabled readOnly />
          </div>
        </div>

        <div className="acct-grid acct-g3">
          <div className="acct-field-group">
            <label className="acct-label">Birth Date</label>
            <input
              type="text"
              className="acct-input acct-input--locked"
              value={personal.birthDate
                ? new Date(personal.birthDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                : ''}
              disabled
              readOnly
            />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Nationality</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.nationality || ''} disabled readOnly />
          </div>
          <div className="acct-field-group">
            <label className="acct-label">Employment Status</label>
            <input type="text" className="acct-input acct-input--locked" value={personal.employmentStatus || ''} disabled readOnly />
          </div>
        </div>

        <div className="acct-field-group">
          <label className="acct-label">Highest Educational Attainment</label>
          <input type="text" className="acct-input acct-input--locked" value={personal.highestEducAttainment || ''} disabled readOnly />
        </div>
      </section>

      {/* ============================================================
          EDITABLE: Contact & Address
          ============================================================ */}
      <section className="acct-card">
        <h2 className="acct-card-title">Contact & Address</h2>

        <form onSubmit={handleProfileSubmit}>
          <div className="acct-grid acct-g2">
            <div className="acct-field-group">
              <label className="acct-label">Email Address <span className="acct-req">*</span></label>
              <input
                type="email"
                className={`acct-input ${emailError || profileFieldErrors.email ? 'acct-input--error' : ''}`}
                value={form.email}
                onChange={(e) => {
                  updateForm('email', e.target.value);
                  setEmailError(validateEmail(e.target.value) || '');
                  clearProfileFieldError('email');
                }}
                required
              />
              {emailError && <span className="acct-field-error">{emailError}</span>}
            </div>
            <div className="acct-field-group">
              <label className="acct-label">Contact Number <span className="acct-req">*</span></label>
              <input
                type="text"
                className={`acct-input ${contactError || profileFieldErrors.contactNo ? 'acct-input--error' : ''}`}
                placeholder="e.g. 09XXXXXXXXX"
                maxLength={11}
                value={form.contactNo}
                onChange={(e) => {
                  const raw = sanitizeMobile(e.target.value);
                  updateForm('contactNo', raw);
                  setContactError(validateMobile(raw) || '');
                  clearProfileFieldError('contactNo');
                }}
                required
              />
              {contactError && <span className="acct-field-error">{contactError}</span>}
            </div>
          </div>

          <div className="acct-field-group">
            <label className="acct-label">Facebook Profile Link <span className="acct-req">*</span></label>
            <input
              type="text"
              className={`acct-input ${facebookError || profileFieldErrors.facebookLink ? 'acct-input--error' : ''}`}
              placeholder="e.g. https://www.facebook.com/yourname"
              value={form.facebookLink}
              onChange={(e) => {
                updateForm('facebookLink', e.target.value);
                setFacebookError(validateFacebookLink(e.target.value) || '');
                clearProfileFieldError('facebookLink');
              }}
              required
            />
            {facebookError && <span className="acct-field-error">{facebookError}</span>}
          </div>

          <p className="acct-address-note">
            Region and Province are fixed since 3A Prime Hospitality Training and Assessment
            Center is based in Cebu City. Only City/Municipality, Barangay, and House No./Street
            can be updated here. If you have relocated outside Cebu, please get in touch with
            our office directly.
          </p>

          <div className="acct-grid acct-g3" style={{ marginTop: '0.5rem' }}>
            <div className="acct-field-group">
              <label className="acct-label">Region</label>
              <input
                type="text"
                className="acct-input acct-input--locked"
                value={regionName}
                disabled
                readOnly
              />
            </div>

            {/* => Province hidden for NCR - same as TESDAStep1.jsx */}
            {!isNCR && (
              <div className="acct-field-group">
                <label className="acct-label">Province</label>
                <input
                  type="text"
                  className="acct-input acct-input--locked"
                  value={provinceName}
                  disabled
                  readOnly
                />
              </div>
            )}

            <div className="acct-field-group">
              <label className="acct-label">City / Municipality <span className="acct-req">*</span></label>
              <select
                className={`acct-select ${profileFieldErrors.city ? 'acct-input--error' : ''}`}
                value={form.city}
                onChange={(e) => {
                  const selectedCode = e.target.value;
                  updateForm('city', selectedCode);
                  updateForm('barangay', '');
                  setBarangays([]);
                  // => Auto-fill district from the already-loaded cities
                  // => list, same pattern as TESDAStep1.jsx's city onChange
                  const selected = cities.find(c => c.code === selectedCode);
                  updateForm('district', selected?.district || '');
                  clearProfileFieldError('city');
                }}
                disabled={(!form.province && !isNCR) || loadingCities}
                required
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

          <div className="acct-grid acct-g2">
            <div className="acct-field-group">
              <label className="acct-label">Barangay <span className="acct-req">*</span></label>
              <select
                className={`acct-select ${profileFieldErrors.barangay ? 'acct-input--error' : ''}`}
                value={form.barangay}
                onChange={(e) => {
                  updateForm('barangay', e.target.value);
                  clearProfileFieldError('barangay');
                }}
                disabled={!form.city || loadingBarangays}
                required
              >
                <option value="">
                  {loadingBarangays ? 'Loading...' : !form.city ? '- Select City first -' : 'Select Barangay'}
                </option>
                {barangays.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="acct-field-group">
              <label className="acct-label">House No. / Street <span className="acct-req">*</span></label>
              <input
                type="text"
                className={`acct-input ${profileFieldErrors.street ? 'acct-input--error' : ''}`}
                placeholder="e.g. 123 Rizal St."
                value={form.street}
                onChange={(e) => {
                  updateForm('street', toProperCase(e.target.value));
                  clearProfileFieldError('street');
                }}
                required
              />
            </div>
          </div>

          {showProfileErrors && validateProfileForm() !== 'valid' && (
            <div className="acct-error-banner">
              Please correct the highlighted fields above before saving.
            </div>
          )}

          <div className="acct-actions">
            <button type="submit" className="acct-btn-save" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* ============================================================
          EDITABLE: Password Reset
          => Separate form/endpoint from Contact & Address, per your direction
          ============================================================ */}
      <section className="acct-card">
        <h2 className="acct-card-title">Change Password</h2>

        <form onSubmit={handlePasswordSubmit}>
          {/* => All three password fields now share one row, matching the
              => Admin Dashboard's one-line layout for this section */}
          <div className="acct-grid acct-g3">
            <div className="acct-field-group">
              <label className="acct-label">Current Password <span className="acct-req">*</span></label>
              <div className="acct-password-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="acct-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="acct-password-toggle"
                  onClick={() => setShowCurrentPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  <img
                    src={showCurrentPassword ? eyeOffIcon : eyeIcon}
                    alt={showCurrentPassword ? 'Hide password' : 'Show password'}
                    className="acct-password-icon"
                  />
                </button>
              </div>
            </div>

            <div className="acct-field-group">
              <label className="acct-label">New Password <span className="acct-req">*</span></label>
              <div className="acct-password-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="acct-input"
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="acct-password-toggle"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  <img
                    src={showNewPassword ? eyeOffIcon : eyeIcon}
                    alt={showNewPassword ? 'Hide password' : 'Show password'}
                    className="acct-password-icon"
                  />
                </button>
              </div>
              {/* => Live checklist, ticks off each rule in real time as the student types */}
              <ul className="acct-password-rules">
                {PASSWORD_RULES.map(rule => {
                  const met = rule.test(passwordForm.newPassword);
                  return (
                    <li key={rule.label} className={met ? 'acct-rule-met' : ''}>
                      <img
                        src={met ? checkIcon : circleIcon}
                        alt=""
                        className="acct-rule-icon"
                      />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="acct-field-group">
              <label className="acct-label">Confirm New Password <span className="acct-req">*</span></label>
              <div className="acct-password-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="acct-input"
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="acct-password-toggle"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  <img
                    src={showConfirmPassword ? eyeOffIcon : eyeIcon}
                    alt={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="acct-password-icon"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="acct-actions">
            <button type="submit" className="acct-btn-save" disabled={savingPassword}>
              {savingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Account;
