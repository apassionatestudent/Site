import React, { useState, useEffect, useCallback } from 'react';
import './Enroll.css';

const Enroll = () => {
  // Loading states for cascading dropdowns => I don't want to show dropdown when json data is not yet fully loaded. 
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [activeStep, setActiveStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [dob, setDob] = useState('');
  const [nameExt, setNameExt] = useState('N/A');

  // Location state
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');

  // => NCR has no provinces, goes directly to cities
  const isNCR = region === '130000000';

  const [nationalities, setNationalities] = useState([]);
  const [nationality, setNationality] = useState('Filipino'); // => Default to Filipino

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
    setLoadingProvinces(true); // => Disable province dropdown while fetching
    fetch(`/api/location/provinces/${region}`)
      .then(res => res.json())
      .then(data => { setProvinces(data); setCities([]); setProvince(''); setMunicipality(''); })
      .catch(err => console.error('Failed to load provinces:', err))
      .finally(() => setLoadingProvinces(false)); // => Enable once loaded
  }, [region]);

  // Fetch cities when province changes — OR directly for NCR
  useEffect(() => {
    // => Reset if neither province nor NCR region is selected
    if (!province && !isNCR) {
      setCities([]);
      setMunicipality('');
      return;
    }

    setLoadingCities(true);

    // => NCR: fetch cities directly by regionCode since there's no province level
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

  // => Format DOB input as mm/dd/yyyy while typing
  const formatDOB = (value) => {
    const v = value.replace(/\D/g, '').slice(0, 8);
    let out = '';
    if (v.length > 4) out = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
    else if (v.length > 2) out = v.slice(0,2)+'/'+v.slice(2);
    else out = v;
    setDob(out);
  };

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
                    className="field-input" 
                    id="dobInput" 
                    placeholder="mm/dd/yyyy" 
                    maxLength={10} 
                    value={dob}
                    onChange={(e) => formatDOB(e.target.value)}
                  />
                  <i className="ti ti-calendar date-icon" aria-hidden="true"></i>
                </div>
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
      </div>
    </>
  );
};

export default Enroll;