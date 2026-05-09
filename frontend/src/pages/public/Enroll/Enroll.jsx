import React, { useState, useEffect, useCallback } from 'react';
import './Enroll.css';

const Enroll = () => {
    // ============================================================
    // ALL useState declarations
    // ============================================================
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [isMobile, setIsMobile] = useState(false);
    const [dob, setDob] = useState('');
    const [dobError, setDobError] = useState('');
    const [nameExt, setNameExt] = useState('N/A');
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [region, setRegion] = useState('');
    const [province, setProvince] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [nationalities, setNationalities] = useState([]);
    const [nationality, setNationality] = useState('Filipino'); // => most applicants are obviously Filipinos 
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [mobile, setMobile] = useState('');
    const [mobileError, setMobileError] = useState('');
    const [telephone, setTelephone] = useState('');
    const [mailRegion, setMailRegion] = useState('');
    const [mailProvinces, setMailProvinces] = useState([]);
    const [mailProvince, setMailProvince] = useState('');
    const [mailCities, setMailCities] = useState([]);
    const [mailCity, setMailCity] = useState('');
    const [mailBarangays, setMailBarangays] = useState([]);
    const [mailBarangay, setMailBarangay] = useState('');
    const [mailStreet, setMailStreet] = useState('');
    const [loadingMailProvinces, setLoadingMailProvinces] = useState(false);
    const [loadingMailCities, setLoadingMailCities] = useState(false);
    const [loadingMailBarangays, setLoadingMailBarangays] = useState(false);
    const [guardianName, setGuardianName] = useState('');
    const [guardianSameAddress, setGuardianSameAddress] = useState(false);

    // ============================================================
    // Derived state — computed from useState values, not hooks
    // ============================================================

    // => NCR has no provinces, goes directly to cities
    const isNCR = region === '130000000';

    // => NCR check for mailing address
    const isMailNCR = mailRegion === '130000000';

    // ============================================================
    // ALL useEffect + useCallback hooks
    // ============================================================

    // Resize handler
    const handleResize = useCallback(() => {
      setIsMobile(window.innerWidth <= 700);
    }, []);

    useEffect(() => {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    // Fetch regions on mount
    useEffect(() => {
      fetch('/api/location/regions')
        .then(res => res.json())
        .then(data => setRegions(data))
        .catch(err => console.error('Failed to load regions:', err));
    }, []);

    // Fetch provinces when region changes
    useEffect(() => {
      if (!region) {
        setProvinces([]); setCities([]);
        setProvince(''); setMunicipality('');
        return;
      }
      setLoadingProvinces(true);
      fetch(`/api/location/provinces/${region}`)
        .then(res => res.json())
        .then(data => { setProvinces(data); setCities([]); setProvince(''); setMunicipality(''); })
        .catch(err => console.error('Failed to load provinces:', err))
        .finally(() => setLoadingProvinces(false));
    }, [region]);

    // Fetch cities when province changes — OR directly for NCR
    useEffect(() => {
      if (!province && !isNCR) {
        setCities([]);
        setMunicipality('');
        return;
      }
      setLoadingCities(true);
      const url = isNCR
        ? `/api/location/cities-by-region/${region}`
        : `/api/location/cities/${province}`;
      fetch(url)
        .then(res => res.json())
        .then(data => { setCities(data); setMunicipality(''); })
        .catch(err => console.error('Failed to load cities:', err))
        .finally(() => setLoadingCities(false));
    }, [province, isNCR, region]);

    // Fetch nationalities on mount
    useEffect(() => {
      fetch('/api/reference/nationalities')
        .then(res => res.json())
        .then(data => setNationalities(data))
        .catch(err => console.error('Failed to load nationalities:', err));
    }, []);

    // Fetch mail provinces when mail region changes
    useEffect(() => {
      if (!mailRegion) {
        setMailProvinces([]); setMailCities([]); setMailBarangays([]);
        setMailProvince(''); setMailCity(''); setMailBarangay('');
        return;
      }
      // => NCR has no provinces — skip province fetch and go straight to cities
      if (isMailNCR) {
        setMailProvinces([]); setMailCities([]); setMailBarangays([]);
        setMailProvince(''); setMailCity(''); setMailBarangay('');
        return;
      }
      setLoadingMailProvinces(true);
      fetch(`/api/location/provinces/${mailRegion}`)
        .then(res => res.json())
        .then(data => {
          setMailProvinces(data);
          setMailCities([]); setMailBarangays([]);
          setMailProvince(''); setMailCity(''); setMailBarangay('');
        })
        .catch(err => console.error('Failed to load mail provinces:', err))
        .finally(() => setLoadingMailProvinces(false));
    }, [mailRegion, isMailNCR]);

    // Fetch mail cities when mail province changes — OR directly for NCR
    useEffect(() => {
      if (!mailProvince && !isMailNCR) {
        setMailCities([]); setMailBarangays([]);
        setMailCity(''); setMailBarangay('');
        return;
      }
      setLoadingMailCities(true);
      const url = isMailNCR
        ? `/api/location/cities-by-region/${mailRegion}`
        : `/api/location/cities/${mailProvince}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setMailCities(data);
          setMailBarangays([]);
          setMailCity(''); setMailBarangay('');
        })
        .catch(err => console.error('Failed to load mail cities:', err))
        .finally(() => setLoadingMailCities(false));
    }, [mailProvince, isMailNCR, mailRegion]);

    // Fetch barangays when mail city changes
    useEffect(() => {
      if (!mailCity) { setMailBarangays([]); setMailBarangay(''); return; }
      setLoadingMailBarangays(true);
      fetch(`/api/location/barangays/${mailCity}`)
        .then(res => res.json())
        .then(data => { setMailBarangays(data); setMailBarangay(''); })
        .catch(err => console.error('Failed to load barangays:', err))
        .finally(() => setLoadingMailBarangays(false));
    }, [mailCity]);

    // ============================================================
    // Regular functions — all AFTER hooks
    // ============================================================

    const handleTabClick = (step) => {
      if (isMobile) {
        setActiveStep(prev => prev === step ? null : step);
      } else {
        setActiveStep(step);
      }
    };

    const goNext = () => {
      const next = (activeStep || 1) < 3 ? (activeStep || 1) + 1 : 3;
      handleTabClick(next);
    };

    // => Email regex validation
    const validateEmail = (value) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmail(value);
      setEmailError(value && !regex.test(value) ? 'Please enter a valid email address.' : '');
    };

    // => PH mobile: must start with 09, exactly 11 digits
    const formatMobile = (value) => {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setMobile(digits);
      setMobileError(digits && (digits.length < 11 || !digits.startsWith('09'))
        ? 'Mobile number must be 11 digits and start with 09.'
        : '');
    };

    // => Format DOB input as mm/dd/yyyy while typing with real-time validation
    const formatDOB = (value) => {
      const v = value.replace(/\D/g, '').slice(0, 8);
      let out = '';
      if (v.length > 4) out = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
      else if (v.length > 2) out = v.slice(0,2)+'/'+v.slice(2);
      else out = v;
      setDob(out);

      const mm = parseInt(v.slice(0,2));
      const dd = parseInt(v.slice(2,4));
      const yyyy = parseInt(v.slice(4,8));

      // => Clear error while user hasn't typed the month yet
      if (v.length === 0) {
        setDobError('');
        return;
      }

      // => Validate month as soon as 2 digits are typed
      if (v.length >= 2) {
        if (mm < 1 || mm > 12) {
          setDobError('Month must be between 01 and 12.');
          return;
        }
      }

      // => Validate day as soon as 4 digits are typed
      if (v.length >= 4) {
        // => Use current year as fallback for leap year check before year is fully typed
        const yearForCheck = v.length === 8 ? yyyy : new Date().getFullYear();
        const daysInMonth = new Date(yearForCheck, mm, 0).getDate();
        if (dd < 1 || dd > daysInMonth) {
          setDobError(`Day must be between 01 and ${daysInMonth} for the selected month.`);
          return;
        }
      }

      // => Validate full date once all 8 digits are typed
      if (v.length === 8) {
        const birth = new Date(`${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`);
        const today = new Date();

        // => Cannot be a future date
        if (birth > today) {
          setDobError('Date of birth cannot be in the future.');
          return;
        }

        // => Cannot be more than 100 years ago
        // const maxAge = new Date();
        // maxAge.setFullYear(maxAge.getFullYear() - 100);
        // if (birth < maxAge) {
        //   setDobError('Please enter a valid date of birth (maximum 100 years old).');
        //   return;
        // } I am skeptical to push for this since it kinda feels discrimination. It's up to the admin whether to accept or reject it.

        // => Must be at least 15 years old to enroll
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 15);
        if (birth > minAge) {
          setDobError('You must be at least 15 years old to enroll.');
          return;
        }
      }

      // => All checks passed for current input length
      setDobError('');
    };

    const getAge = () => {
      if (!dob || dob.length < 10) return null;
      const [mm, dd, yyyy] = dob.split('/');

      if (!mm || !dd || !yyyy || yyyy.length < 4) return null;
      const birth = new Date(`${yyyy}-${mm}-${dd}`);

      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();

      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

      return isNaN(age) ? null : age;
    };

    // => isMinor drives the guardian section visibility in Step 2
    const isMinor = getAge() !== null && getAge() <= 17;

  return (
    <>
      <h2 className="sr-only">Enrollment Form - Step 1: Personal Information</h2>
      <div className="enroll-wrap">
        <section className="page-hero" data-watermark="ENROLL">
          <div className="page-hero-inner">
            <span className="page-hero-tag">Enrollment</span>
            <h1>Start Your Journey</h1>
            <p className="page-hero-sub">
              Fill out the form below and our team will get back to you within business hours.
            </p>
          </div>
          <div className="page-hero-rule" />
        </section>

        <div className="progress-bar">
          <div 
            className="progress-fill" 
            id="progressFill" 
            data-step={activeStep} // => drives the progress bar width via CSS
          />
        </div>

        {/* Steps tabs */}
        <div className="step-tabs" id="stepTabs">
          <button 
            className={`step-tab ${activeStep === 1 ? 'active' : ''}`} 
            data-step="1" 
            onClick={() => handleTabClick(1)}
          >
            <span className="step-num">1</span>
            <span className="step-label">Personal Information</span>
            <i className="ti ti-chevron-down step-chevron" aria-hidden="true"></i>
          </button>
          <button 
            className={`step-tab ${activeStep === 2 ? 'active' : ''}`} 
            data-step="2" 
            onClick={() => handleTabClick(2)}
          >
            <span className="step-num">2</span>
            <span className="step-label">Contact & Additional Information</span>
            <i className="ti ti-chevron-down step-chevron" aria-hidden="true"></i>
          </button>
          <button 
            className={`step-tab ${activeStep === 3 ? 'active' : ''}`} 
            data-step="3" 
            onClick={() => handleTabClick(3)}
          >
            <span className="step-num">3</span>
            <span className="step-label">Course Selection & Requirements</span>
            <i className="ti ti-chevron-down step-chevron" aria-hidden="true"></i>
          </button>
        </div>

        {/* Tab 1 contents here */}
        <div className={`tab-content ${activeStep === 1 ? 'open' : ''}`} id="content-1">
          <div className="form-body">

            {/* First row  */}
            <div className="form-grid g-name-row">
              <div className="field-group">
                <label className="field-label">Last Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. dela Cruz" />
              </div>
              <div className="field-group">
                <label className="field-label">First Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. Juan" />
              </div>
              <div className="field-group">
                <label className="field-label">Middle Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. Santos" />
              </div>
              <div className="field-group">
                <label className="field-label">Ext.</label>
                <select className="field-select" defaultValue="N/A">
                  <option value="N/A" >N/A</option>
                  <option value="jr">Jr.</option>
                  <option value="sr">Sr.</option>
                  <option value="ii">II</option>
                  <option value="iii">III</option>
                  <option value="iv">IV</option>
                </select>
              </div>
            </div>

            <hr/>
            <br/>

            {/* Second row */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div className="birthplace-label">Birthplace <span className="req">*</span></div>
              <div className="birthplace-row">

                <div className="field-group">
                  <select
                    className="field-select"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">Select Region</option>
                    {regions.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <select
                    className="field-select"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={!region || loadingProvinces || isNCR} // => Disable for NCR
                    // style={{ opacity: isNCR ? 0.4 : 1 }}
                  >
                    <option value="">
                      {loadingProvinces ? 'Loading...' 
                        : isNCR ? '- No province for NCR -' 
                        : region ? 'Select Province' 
                        : '- Select Region first -'}
                    </option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* City / Municipality dropdown */}
                <div className="field-group">
                  <select
                    className="field-select"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    disabled={(!province && !isNCR) || loadingCities} // => NCR bypasses province requirement
                  >
                    <option value="">
                      {loadingCities
                        ? 'Loading...'
                        : (province || isNCR)           // => NCR counts as ready even without a province
                          ? 'Select City / Municipality'
                          : '- Select Province first -'}
                    </option>
                    {cities.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Third row */}
            <div className="form-grid g-3">
              <div className="field-group">
                <label className="field-label">Date of Birth <span className="req">*</span></label>
                <div className="date-wrap">
                  <input
                    type="text"
                    className={`field-input ${dobError ? 'field-input--error' : ''}`}
                    id="dobInput"
                    placeholder="mm/dd/yyyy"
                    maxLength={10}
                    value={dob}
                    onChange={(e) => formatDOB(e.target.value)}
                  />
                  <i className="ti ti-calendar date-icon" aria-hidden="true"></i>
                </div>
                {/* => Show validation error below the field */}
                {dobError && <span className="field-error">{dobError}</span>}
              </div>
              <div className="field-group">
                <label className="field-label">Sex <span className="req">*</span></label>
                <select className="field-select">
                  <option value="">Select</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                  {/* No support of other options at the moment, sorry. Remember this is TESDA and they don't recognize nonbiological options. */}
                </select>
              </div>

              {/* TODO: Change to select with options populated from backend.  */}
              <div className="field-group">
                <label className="field-label">Nationality <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                >
                  <option value="">Select</option>
                  {nationalities.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-next" onClick={goNext}>
              Next Step <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Tab 2 contents here */}
        <div className={`tab-content ${activeStep === 2 ? 'open' : ''}`} id="content-2">
          <div className="form-body">

            {/* Contact Information */}
            <div className="form-section-title">Contact Information</div>

            <div className="form-grid g-3">
              <div className="field-group">
                <label className="field-label">Email Address <span className="req">*</span></label>
                <input
                  type="email"
                  className={`field-input ${emailError ? 'field-input--error' : ''}`}
                  placeholder="e.g. juan@email.com"
                  value={email}
                  onChange={(e) => validateEmail(e.target.value)}
                />
                {/* => Show inline error when regex fails */}
                {emailError && <span className="field-error">{emailError}</span>}
              </div>
              <div className="field-group">
                <label className="field-label">Mobile Number <span className="req">*</span></label>
                <input
                  type="text"
                  className={`field-input ${mobileError ? 'field-input--error' : ''}`}
                  placeholder="e.g. 09XXXXXXXXX"
                  maxLength={11}
                  value={mobile}
                  onChange={(e) => formatMobile(e.target.value)}
                />
                {/* => Show inline error when number is invalid */}
                {mobileError && <span className="field-error">{mobileError}</span>}
              </div>
              <div className="field-group">
                <label className="field-label">Telephone Number</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. (02) 8XXX XXXX"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </div>

            <hr /><br />

            {/* Mailing Address */}
            <div className="form-section-title">Complete Permanent Mailing Address</div>

            {/* Row 1 — Region + Province + City / Municipality */}
            <div className="birthplace-row">
              <div className="field-group">
                <label className="field-label">Region <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={mailRegion}
                  onChange={(e) => setMailRegion(e.target.value)}
                >
                  <option value="">Select Region</option>
                  {/* => Reuse the same regions list already fetched in Step 1 */}
                  {regions.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Province <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={mailProvince}
                  onChange={(e) => setMailProvince(e.target.value)}
                  disabled={!mailRegion || loadingMailProvinces || isMailNCR}
                >
                  <option value="">
                    {loadingMailProvinces ? 'Loading...'
                      : isMailNCR ? '— No province for NCR —'
                      : mailRegion ? 'Select Province'
                      : '— Select Region first —'}
                  </option>
                  {mailProvinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">City / Municipality <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={mailCity}
                  onChange={(e) => setMailCity(e.target.value)}
                  disabled={(!mailProvince && !isMailNCR) || loadingMailCities}
                >
                  <option value="">
                    {loadingMailCities ? 'Loading...'
                      : (mailProvince || isMailNCR) ? 'Select City / Municipality'
                      : '— Select Province first —'}
                  </option>
                  {mailCities.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 — District (placeholder) + Barangay + House No. / Street */}
            <div className="birthplace-row">
              <div className="field-group">
                <label className="field-label">District</label>
                {/* => District data not yet available — field reserved for future integration */}
                <select className="field-select" disabled>
                  <option value="">— Not yet available —</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Barangay <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={mailBarangay}
                  onChange={(e) => setMailBarangay(e.target.value)}
                  disabled={!mailCity || loadingMailBarangays}
                >
                  <option value="">
                    {loadingMailBarangays ? 'Loading...'
                      : mailCity ? 'Select Barangay'
                      : '— Select City first —'}
                  </option>
                  {mailBarangays.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">House No. / Street <span className="req">*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. 123 Rizal St."
                  value={mailStreet}
                  onChange={(e) => setMailStreet(e.target.value)}
                />
              </div>
            </div>

            <br/>

            {/* Guardian — conditionally shown when DOB indicates age 17 or below */}
            {isMinor && (
              <>
              <hr /><br />
              <div className="guardian-section">
                <div className="form-section-title">
                  Parent / Guardian Information
                  <span className="section-note"> — Required for students 17 years old and below</span>
                </div>
                <div className="form-grid g-2">
                  <div className="field-group">
                    <label className="field-label">Parent / Guardian Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. Maria dela Cruz"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  </div>
                </div>
                {/* => Ask if guardian shares the same permanent mailing address as the student */}
                <div className="field-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={guardianSameAddress}
                      onChange={(e) => setGuardianSameAddress(e.target.checked)}
                    />
                    <span>Guardian's address is the same as the student's permanent mailing address above</span>
                  </label>
                </div>
              </div>
              
              </>
            )}

          </div>

          {/* Back + Next navigation */}
          <div className="form-actions form-actions--split">
            <button className="btn-back" onClick={() => handleTabClick(1)}>
              <i className="ti ti-arrow-left" aria-hidden="true"></i> Back
            </button>
            <button className="btn-next" onClick={goNext}>
              Next Step <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Enroll;