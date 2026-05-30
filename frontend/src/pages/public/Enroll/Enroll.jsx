import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Enroll.css';

// => Importing the course requirements components for Step 3
import CourseRequirements1 from './../../../components/public/CourseRequirements1/CourseRequirements1';
import CourseRequirements2 from './../../../components/public/CourseRequirements2/CourseRequirements2';
import CourseRequirements3 from './../../../components/public/CourseRequirements3/CourseRequirements3';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

const Enroll = () => {
    // ============================================================
    // ALL useState declarations
    // ============================================================

    // => Personal Information - Step 1 Full Name
    const [lastName, setLastName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [sex, setSex] = useState('');

    // => Birth Information
    const [motherName, setMotherName] = useState('');
    const [fatherName, setFatherName] = useState('');

    const [showStepErrors, setShowStepErrors] = useState(false); 
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
    const [telephone, setTelephone] = useState('');
    const [mailRegion, setMailRegion] = useState('');
    const [mailProvinces, setMailProvinces] = useState([]);
    const [mailProvince, setMailProvince] = useState('');
    const [mailCities, setMailCities] = useState([]);
    const [mailCity, setMailCity] = useState('');
    const [mailZip, setMailZip] = useState('');
    const [mailDistrict, setMailDistrict] = useState('');
    const [mailBarangays, setMailBarangays] = useState([]);
    const [mailBarangay, setMailBarangay] = useState('');
    const [mailStreet, setMailStreet] = useState('');
    const [loadingMailProvinces, setLoadingMailProvinces] = useState(false);
    const [loadingMailCities, setLoadingMailCities] = useState(false);
    const [loadingMailBarangays, setLoadingMailBarangays] = useState(false);
    const [guardianName, setGuardianName] = useState('');
    const [guardianSameAddress, setGuardianSameAddress] = useState(false);

    // => Demographic information state
    const [civilStatus, setCivilStatus] = useState('');
    const [educAttainment, setEducAttainment] = useState('');
    const [educOther, setEducOther] = useState(''); // => shown when 'Others' is selected
    const [employmentStatus, setEmploymentStatus] = useState('');

    // => Contact fields
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [mobile, setMobile] = useState('');
    const [mobileError, setMobileError] = useState('');
    const [fax, setFax] = useState('');
    const [facebook, setFacebook] = useState('');
    const [otherContact, setOtherContact] = useState('');
    const [facebookError, setFacebookError] = useState('');
    const [otherContactError, setOtherContactError] = useState('');

    const [step3SubStep, setStep3SubStep] = useState(1); // => 1=3.1, 2=3.2, 3=3.3\

    const stepTabsRef = useRef(null); // ref for the tabs container or the target element

    // const goNext = () => {
    //   if (activeStep === 3 && step3SubStep === 1) {
    //     // From Step 3.1 to Step 3.2
    //     setStep3SubStep(2);
    //     return;
    //   }
    //   const next = (activeStep || 1) < 3 ? (activeStep || 1) + 1 : 3;
    //   handleTabClick(next);
    // };
    const goNext = () => {
      // => Validate Step 1 before moving to Step 2
      // if (activeStep === 1) {
      //   if (!validateStep1()) {
      //     setShowStepErrors(true);
      //     return;
      //   }
      //   setShowStepErrors(false);
      // }
      if (activeStep === 1) {
        if (validateStep1() !== 'valid') {
          setShowStepErrors(true);
          return;
        }
        setShowStepErrors(false);
      }

      // => Validate Step 2 before moving to Step 3
      // if (activeStep === 2) {
      //   if (!validateStep2()) {
      //     setShowStepErrors(true);
      //     return;
      //   }
      //   setShowStepErrors(false);
      // }
      if (activeStep === 2) {
        if (validateStep2() !== 'valid') {
          setShowStepErrors(true);
          return;
        }
        setShowStepErrors(false);
      }

      if (activeStep === 3 && step3SubStep === 1) {
        setStep3SubStep(2);
        return;
      }

      const next = (activeStep || 1) < 3 ? (activeStep || 1) + 1 : 3;
      handleTabClick(next);
    };

    // => Nav functions in Step 3 
    const goToStep32 = () => setStep3SubStep(2);
    const goToStep33 = () => setStep3SubStep(3);
    const goToStep31 = () => setStep3SubStep(1);

    // => Course selection state for Step 3: Part 1 
    const [courseData, setCourseData] = useState({
      assessmentType: '',
      clientType: '',
      branch: '',
      course: '',
      courseFee: '',
      courseClass: '',
      isSHS: '',
      isScholar: '',
    });

    const handleCourseChange = (key, value) => {
      setCourseData(prev => ({ ...prev, [key]: value }));
    };

    // => Experience, trainings, licensures, competencies for Step 3: Part 2 (sub-step 2)
    const [expData, setExpData] = useState({
      workExperience: [{ id: 1, company: '', position: '', salary: '', dateFrom: '', dateTo: '', appointmentStatus: '', yearsExp: '' }],
      trainings:      [{ id: 1, title: '', venue: '', dateFrom: '', dateTo: '', hours: '', conductedBy: '' }],
      licensures:     [{ id: 1, title: '', yearTaken: '', venue: '', rating: '', remarks: '', expiryDate: '' }],
      competencies:   [{ id: 1, title: '', qualificationLevel: '', industrySector: '', certNumber: '', dateIssued: '', expirationDate: '' }],
    });

    const handleExpChange = (key, value) => {
  setExpData(prev => ({ ...prev, [key]: value }));
};

// => Document uploads state for Step 3: Part 3 (sub-step 3)
// => Lifted here from CourseRequirements3 so that handleFinalSubmit can access all files
const [docFiles, setDocFiles] = useState({
  birthCert: null,
  schoolDoc: null,
  validId: null,
});

// => useCallback stabilizes the function reference across renders
// => without this, CourseRequirements3 may receive a stale or undefined onFileChange
const handleDocChange = useCallback((key, file) => {
  setDocFiles(prev => ({ ...prev, [key]: file }));
}, []);

// => Assembles ALL form data from Steps 1, 2, and 3 into a single FormData object
// => FormData is used (not JSON) because Step 3.3 has file uploads
const handleFinalSubmit = async () => {
  const formData = new FormData();

  // => Step 1: Personal Information
  formData.append('lastName', lastName);
  formData.append('firstName', firstName);
  formData.append('middleName', middleName);
  formData.append('nameExt', nameExt);
  formData.append('sex', sex);
  formData.append('dob', dob);
  formData.append('motherName', motherName);
  formData.append('fatherName', fatherName);
  formData.append('civilStatus', civilStatus);
  formData.append('educAttainment', educAttainment);
  formData.append('educOther', educOther);
  formData.append('employmentStatus', employmentStatus);
  formData.append('nationality', nationality);
  formData.append('region', region);
  formData.append('province', province);
  formData.append('municipality', municipality);

  // => Step 2: Contact and Mailing Address
  formData.append('email', email);
  formData.append('mobile', mobile);
  formData.append('telephone', telephone);
  formData.append('fax', fax);
  formData.append('facebook', facebook);
  formData.append('otherContact', otherContact);
  formData.append('mailRegion', mailRegion);
  formData.append('mailProvince', mailProvince);
  formData.append('mailCity', mailCity);
  formData.append('mailBarangay', mailBarangay);
  formData.append('mailZip', mailZip);
  formData.append('mailDistrict', mailDistrict);
  formData.append('mailStreet', mailStreet);
  formData.append('guardianName', guardianName);

  // => Step 3.1: Course Selection
  // => JSON.stringify for nested objects since FormData only accepts strings/files
  formData.append('courseData', JSON.stringify(courseData));

  // => Step 3.2: Work Experience, Trainings, Licensures, Competencies
  formData.append('expData', JSON.stringify(expData));

  // => Step 3.3: Document uploads - appended as actual File objects
  if (docFiles.birthCert) formData.append('birthCert', docFiles.birthCert);
  if (docFiles.schoolDoc) formData.append('schoolDoc', docFiles.schoolDoc);
  if (docFiles.validId)   formData.append('validId', docFiles.validId);

  try {
    const res = await fetch('/api/enrollment/submit', {
      method: 'POST',
      // => Do NOT set Content-Type manually - fetch sets it automatically with the boundary for FormData
      body: formData,
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    const result = await res.json();
    console.log('Enrollment submitted:', result);

    // => TODO: Replace alert with a proper success page or redirect
    alert('Enrollment submitted successfully!');
  } catch (err) {
    console.error('Submission failed:', err);
    alert('Submission failed. Please try again.');
  }
};

    // => Validate Step 1 required fields before allowing next
    const validateStep1 = () => {
      if (!lastName || !firstName || !middleName) return 'missing';
      if (!region || !municipality) return 'missing';
      if (!dob) return 'missing';
      if (dobError) return 'error'; // => field filled but has a validation error
      if (!sex) return 'missing';
      if (!motherName || !fatherName) return 'missing';
      if (!civilStatus || !educAttainment || !employmentStatus) return 'missing';
      if (educAttainment === 'others' && !educOther) return 'missing';
      return 'valid';
    };

    // => Validate Step 2 required fields before allowing next
    // const validateStep2 = () => {
    //   if (!email || emailError) return false;
    //   if (!mobile || mobileError) return false;
    //   if (!mailRegion || !mailCity || !mailBarangay || !mailStreet) return false;
    //   if (isMinor && !guardianName) return false;
    //   return true;
    // };
    // => Validate Step 2 required fields before allowing next
    // => Returns 'error' if fields are filled but invalid, 'missing' if required fields are empty, 'valid' if all good
    const validateStep2 = () => {
      if (emailError || mobileError || facebookError || otherContactError) return 'error'; // => filled but invalid format
      if (!email || !mobile) return 'missing';
      if (!mailRegion) return 'missing';
      // => Province is skipped for NCR since it has none
      if (!isMailNCR && !mailProvince) return 'missing';
      if (!mailCity || !mailBarangay || !mailStreet) return 'missing';
      if (isMinor && !guardianName) return 'missing';
      return 'valid';
    };
        
    // => NCR has no provinces, goes directly to cities
    const isNCR = region === '1300000000';

    // => NCR check for mailing address
    const isMailNCR = mailRegion === '1300000000';

    // ALL useEffect + useCallback hooks

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

    // Fetch cities when province changes - OR directly for NCR
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
      // => NCR has no provinces - skip province fetch and go straight to cities
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

    // Fetch mail cities when mail province changes - OR directly for NCR
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
    // Regular functions - all AFTER hooks
    // ============================================================

    const handleTabClick = (step) => {
      if (isMobile) {
        setActiveStep(prev => prev === step ? null : step);
      } else {
        setActiveStep(step);
      }
    };

    // => Auto-capitalize first letter of each word, letters only
    // => Blocks numbers and special characters - they simply won't appear
    const formatName = (value) => {
      return value
        .replace(/[^a-zA-Z\s]/g, '') // => Remove anything that is not a letter or space
        .replace(/\s{2,}/g, ' ') // => Replace multiple spaces with a single space
        .replace(/^\s+/, '') // => Remove spaces at the beginning of the string
        .replace(/(^\s*\w|(?<=\s)\w)/g, (char) => char.toUpperCase()); // => Capitalize the first letter of each word
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

    // => PH telephone: format as (0XX) XXXX-XXXX, landline starts with 0, 11 digits total
    // => or trunk-prefixed like (02) 8XXX-XXXX for Metro Manila (10 digits)
    const formatTelephone = (value) => {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setTelephone(digits);
    };

    const telephoneDisplay = (value) => {
      const d = value.replace(/\D/g, '');
      // => Metro Manila landlines: 02 + 8-digit number = 10 digits
      if (d.startsWith('02') && d.length <= 10) {
        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
        return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
      }
      // => Provincial/other landlines: 0XX + 7-digit = 10 digits, or 11 digits
      if (d.length <= 3) return d;
      if (d.length <= 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
      return `(${d.slice(0,3)}) ${d.slice(3,7)}-${d.slice(7)}`;
    };

    // => PH fax: same format rules as telephone
    const formatFax = (value) => {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setFax(digits);
    };

    // => Facebook: must be a valid facebook.com URL
    const validateFacebook = (value) => {
      setFacebook(value);
      if (!value) { setFacebookError(''); return; }
      const fbRegex = /^https?:\/\/(www\.)?facebook\.com\/[^\s]{1,}$/i;
      setFacebookError(!fbRegex.test(value.trim())
        ? 'Please enter a valid Facebook URL (e.g. https://www.facebook.com/yourname).'
        : '');
    };

    // => Other contact: must be a valid URL, blocks suspicious patterns
    const validateOtherContact = (value) => {
      setOtherContact(value);
      if (!value) { setOtherContactError(''); return; }
      // => Must start with https:// and be a recognizable URL structure
      const urlRegex = /^https:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
      // => Block suspicious patterns: IP addresses, localhost, encoded tricks
      const suspicious = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}|localhost|127\.0\.0|0\.0\.0\.0|javascript:|data:/i;
      if (suspicious.test(value)) {
        setOtherContactError('This URL does not appear to be a valid contact link.');
        return;
      }
      setOtherContactError(!urlRegex.test(value.trim())
        ? 'Please enter a valid URL starting with https:// (e.g. https://linkedin.com/in/yourname).'
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

    // => Go to top page upon clicking the Back and Next buttons, not perfect but will do for now  
    useEffect(() => {
    // delay next tick to ensure DOM has updated (fixes timing issues)
    const id = setTimeout(() => {
      const el = stepTabsRef.current;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // fallback
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);

    return () => clearTimeout(id);
  }, [activeStep]);

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
            <div className="form-section-title">Full Name</div>

            <div className="form-grid g-name-row">
              <div className="field-group">
                <label className="field-label">Last Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. dela Cruz"
                value={lastName} onChange={(e) => setLastName(formatName(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field-label">First Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. Juan" 
                value={firstName} onChange={(e) => setFirstName(formatName(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field-label">Middle Name <span className="req">*</span></label>
                <input type="text" className="field-input" placeholder="e.g. Santos" 
                value={middleName} onChange={(e) => setMiddleName(formatName(e.target.value))} />
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

            <hr/> <br/>

            {/* Second row */}
            <div className="form-section-title">Birth Information</div>

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

            {/* Third Row */}
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
                <select className="field-select" value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="">Select</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                  {/* No support of other options at the moment, sorry. Remember this is TESDA and they don't recognize nonbiological options. */}
                </select>
              </div>

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

            {/* Fourth row */}
            <div className="form-grid g-3">
              <div className="field-group">
                <div className="field-group">
                  <label className="field-label">Mother's Name <span className="req">*</span>
                    <Info content="As shown in your PSA Birth Certificate" />
                  </label>
                  <input type="text" className="field-input" placeholder="e.g. Gabriela Silang"
                  value={motherName} onChange={(e) => setMotherName(formatName(e.target.value))} />
                </div>

              </div>

              <div className="field-group">
                <div className="field-group">
                  <label className="field-label">Father's Name <span className="req">*</span>
                    <Info content="As shown in your PSA Birth Certificate" />
                  </label>
                  <input type="text" className="field-input" placeholder="e.g. Diego Silang"
                  value={fatherName} onChange={(e) => setFatherName(formatName(e.target.value))} />
                </div>
              </div>

            </div>

            <hr/> <br/>

            {/* Demographic Information */}
            <div className="form-section-title">Demographic Information</div>

            <div className="form-grid g-3">
              <div className="field-group">
                <label className="field-label">Civil Status <span className="req">*</span>
                  <Info content="Civil status is based on legal marital status, not current romantic relationships. 
                  - Having a boyfriend or girlfriend does not change a person’s legal civil status (single).
                  - A widow/er who is currently in a relationship still retains the civil status of widow/er." />
                </label>
                <select
                  className="field-select"
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widower">Widow/er</option>
                  <option value="separated">Separated</option>
                  <option value="solo_parent">Solo Parent</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Highest Educational Attainment <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={educAttainment}
                  onChange={(e) => {
                    setEducAttainment(e.target.value);
                    // => Clear the other text field when switching away from Others
                    if (e.target.value !== 'others') setEducOther('');
                  }}
                >
                  <option value="">Select</option>
                  <option value="elem_grad">Elementary Graduate</option>
                  <option value="hs_grad">High School Graduate</option>
                  <option value="tvet_grad">TVET Graduate</option>
                  <option value="college_level">College Level</option>
                  <option value="college_grad">College Graduate</option>
                  <option value="others">Others</option> {/*  loads of options so better ask them what */}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Employment Status <span className="req">*</span></label>
                <select
                  className="field-select"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="casual">Casual</option>
                  <option value="job_order">Job Order</option>
                  <option value="probationary">Probationary</option>                  
                  <option value="permanent">Permanent</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="ofw">OFW</option>
                </select>
              </div>
            </div>

            {/* => Only shown when user selects 'Others' for educational attainment */}
            {educAttainment === 'others' && (
              <div className="field-group">
                <label className="field-label">Please specify your educational attainment <span className="req">*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Vocational Course, Post-Graduate..."
                  value={educOther}
                  onChange={(e) => setEducOther(e.target.value)}
                />
              </div>
            )}

          </div>

          {/* => Show error banner if user tries to proceed with missing required fields */}
          {showStepErrors && activeStep === 1 && validateStep1() !== 'valid' && (
            <div className="step-error-banner">
              <i className="ti ti-alert-circle" />
              {validateStep1() === 'error'
                ? 'Please correct the errors in the form before proceeding.'
                : "Please fill in all required fields (denoted with ' * ') before proceeding."
              }
            </div>
          )}

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

            {/* Row 1 - Email + Mobile + Telephone */}
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
                  placeholder="e.g. (02) 8XXX-XXXX"
                  value={telephoneDisplay(telephone)}
                  onChange={(e) => formatTelephone(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2 - Fax + Facebook + Others */}
            <div className="form-grid g-3">
              <div className="field-group">
                <label className="field-label">Fax Number</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. (02) 8XXX-XXXX"
                  value={telephoneDisplay(fax)}
                  onChange={(e) => formatFax(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Facebook Account</label>
                <input
                  type="text"
                  className={`field-input ${facebookError ? 'field-input--error' : ''}`}
                  placeholder="e.g. https://www.facebook.com/juandelacruz"
                  value={facebook}
                  onChange={(e) => validateFacebook(e.target.value)}
                />
                {/* => Show inline error when URL doesn't match facebook.com pattern */}
                {facebookError && <span className="field-error">{facebookError}</span>}
              </div>
              <div className="field-group">
                <label className="field-label">Other Contact</label>
                <input
                  type="text"
                  className={`field-input ${otherContactError ? 'field-input--error' : ''}`}
                  placeholder="e.g. https://linkedin.com/in/yourname, or Twitter, etc."
                  value={otherContact}
                  onChange={(e) => validateOtherContact(e.target.value)}
                />
                {/* => Show inline error for invalid or suspicious URLs */}
                {otherContactError && <span className="field-error">{otherContactError}</span>}
              </div>
            </div>

            <hr /><br />

            {/* Mailing Address */}
            <div className="form-section-title">Complete Permanent Mailing Address</div>

            {/* Row 1 - Region + Province + City / Municipality */}
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
                      : isMailNCR ? '- No province for NCR -'
                      : mailRegion ? 'Select Province'
                      : '- Select Region first -'}
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
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    setMailCity(selectedCode);
                    // => Auto-fill zip and district from the already-loaded cities list
                    const selected = mailCities.find(c => c.code === selectedCode);
                    setMailZip(selected?.zip || '');
                    setMailDistrict(selected?.district || '');
                  }}
                  disabled={(!mailProvince && !isMailNCR) || loadingMailCities}
                >
                  <option value="">
                    {loadingMailCities ? 'Loading...'
                      : (mailProvince || isMailNCR) ? 'Select City / Municipality'
                      : '- Select Province first -'}
                  </option>
                  {mailCities.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 - District + Zip Code (auto-filled) + Barangay + House No. / Street */}
            {/* => District and Zip share the first column slot side by side */}
            <div className="birthplace-row" style={{ marginTop: '1.2rem' }}>
              <div className="field-group">
                <label className="field-label">Congressional District &amp; Zip Code <Info content="This will be filled up automatically." /> </label>
                <div className="district-zip-row">
                  <input
                    type="text"
                    className="field-input"
                    value={
                      mailDistrict === 'Lone' ? 'Lone District'
                      : mailDistrict ? `${mailDistrict} District`
                      : mailCity ? 'Not in PSGC'
                      : '-'
                    }
                    readOnly
                    title="Congressional District - sourced from PSGC"
                    style={{ background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-secondary)' }}
                  />
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Zip"
                    value={mailZip || '-'}
                    readOnly
                    title="Zip Code - auto-filled on city select"
                    style={{ background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-secondary)' }}
                  />
                </div>
                {/* => Inform user both are auto-managed */}
                {mailCity && !mailZip && (
                  <span className="field-hint">Zip code not available for selected city.</span>
                )}
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
                      : '- Select City first -'}
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

            {/* Guardian - conditionally shown when DOB indicates age 17 or below */}
            {isMinor && (
              <>
                <hr /><br />
                <div className="guardian-section">
                  <div className="form-section-title">
                    Parent / Guardian Information
                    <span className="section-note"> - Required for students 17 years old and below</span>
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
                </div>
              </>
            )}

            {/* => Show error banner if user tries to proceed with missing required fields */}
            {showStepErrors && activeStep === 2 && validateStep2() !== 'valid' && (
              <div className="step-error-banner">
                <i className="ti ti-alert-circle" />
                {validateStep2() === 'error'
                  ? 'Please correct the errors in the form before proceeding.'
                  : "Please fill in all required fields (denoted with ' * ') before proceeding."
                }
              </div>
            )}

          </div>

          {/* {showStepErrors && activeStep === 2 && !validateStep2() && (
            <div className="step-error-banner">
              <i className="ti ti-alert-circle" /> Please fill in all required fields (denoted with ' * ') before proceeding.
            </div>
          )} */}

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

        {/* Tab 3 contents here */}
        <div className={`tab-content ${activeStep === 3 ? 'open' : ''}`} id="content-3">
          {step3SubStep === 1 && (
            <CourseRequirements1
              data={courseData}
              onChange={handleCourseChange}
              onBack={() => handleTabClick(2)} 
              onNext={goToStep32}
            />
          )}
          
          {step3SubStep === 2 && (
            <CourseRequirements2
              data={expData}
              onChange={handleExpChange}
              isScholar={courseData.isScholar === 'yes'} 
              onBack={goToStep31}
              onNext={goToStep33}
            />
          )}
          
          {step3SubStep === 3 && (
            <CourseRequirements3
              files={docFiles}
              onFileChange={handleDocChange}
              onBack={() => setStep3SubStep(2)}
              onSubmit={handleFinalSubmit}
            />
          )}
        </div>

      </div>
    </>
  );
};

export default Enroll;