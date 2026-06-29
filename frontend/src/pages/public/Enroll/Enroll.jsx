import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Enroll.css';

// => Importing the course requirements components for Step 3
import CourseRequirements1 from './../../../components/public/CourseRequirements1/CourseRequirements1';
import CourseRequirements2 from './../../../components/public/CourseRequirements2/CourseRequirements2';
import CourseRequirements3 from './../../../components/public/CourseRequirements3/CourseRequirements3';

import TESDAStep1 from '../../../components/public/TESDA/TESDAStep1';
import TESDAStep2 from '../../../components/public/TESDA/TESDAStep2';
import TESDAStep3 from '../../../components/public/TESDA/TESDAStep3';
import TESDAStep4 from '../../../components/public/TESDA/TESDAStep4';
import TESDAStep5 from '../../../components/public/TESDA/TESDAStep5';

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

// => Controls which enrollment type the user selected: null | 'shs' | 'tesda'
const [enrollType, setEnrollType] = useState(null);

// => TESDA multi-step state: tracks which of the 7 pages is active
const [tesdaStep, setTesdaStep] = useState(1);

// => TESDA form data - Learner/Manpower Profile (Step 1)
const [tesdaProfile, setTesdaProfile] = useState({
  lastName: '',
  nameExtension: 'N/A',
  firstName: '',
  middleName: '',
  street: '',
  barangay: '',
  district: '',
  city: '',
  province: '',
  region: '',
  email: '',
  contactNo: '',
  nationality: 'Filipino',
});

// => TESDA form data - Personal Information (Step 2)
const [tesdaPersonal, setTesdaPersonal] = useState({
  sex: '',
  civilStatus: '',
  // => 2018 form: only Employed/Unemployed, no employment type field
  employmentStatus: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  birthCity: '',
  birthProvince: '',
  birthRegion: '',
  educAttainment: '',
  guardianName: '',
  guardianAddress: '',
});

// => TESDA form data - Client Classification (Step 3)
const [tesdaClassifications, setTesdaClassifications] = useState([]);

// => TESDA form data - NCAE/YP4SC (Step 4)
const [tesdaNcae, setTesdaNcae] = useState({
  takenBefore: '',
  where: '',
  when: '',
});

// => TESDA form data - Course & Batch (Step 5)
const [tesdaCourse, setTesdaCourse] = useState({
  // => branch selected first - required by courseController and classController
  branch: '',
  course: '',
  courseFee: '',
  // => renamed from batch to courseClass to match classController's class_id
  courseClass: '',
});

// => TESDA form data - File uploads (Step 5b)
// => Base docs required for all + dynamic additional docs per course
const [tesdaFiles, setTesdaFiles] = useState({
  birthCert: null,
  schoolDoc: null,
  validId: null,
  // => additional course-specific docs will be added dynamically
});

// => TESDA form data - Scholarship (Step 6)
const [tesdaScholarship, setTesdaScholarship] = useState({
  isScholar: '',
  scholarshipType: '',
  otherScholarship: '',
});

// => TESDA form data - Privacy Disclaimer (Step 7)
const [tesdaPrivacy, setTesdaPrivacy] = useState({
  agreed: false,
});

// => Stable handler for TESDA file changes - lifted so Step 7 submit can access all files
const handleTesdaFileChange = useCallback((key, file) => {
  setTesdaFiles(prev => ({ ...prev, [key]: file }));
}, []);

// => TESDA navigation helpers
const tesdaGoNext = () => {
  
  setTesdaStep(prev => Math.min(prev + 1, 5));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const tesdaGoBack = () => {

  setTesdaStep(prev => Math.max(prev - 1, 1));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// => Final TESDA form submission - assembles all data into FormData
const handleTesdaSubmit = async () => {
  const formData = new FormData();

  // => Step 1: Profile
  Object.entries(tesdaProfile).forEach(([k, v]) => formData.append(k, v));

  // => Step 2: Personal
  Object.entries(tesdaPersonal).forEach(([k, v]) => formData.append(k, v));

  // => Step 3: Classifications (array)
  tesdaClassifications.forEach(c => formData.append('classifications[]', c));

  // => Step 4: NCAE
  Object.entries(tesdaNcae).forEach(([k, v]) => formData.append(k, v));

  // => Step 5: Course
  Object.entries(tesdaCourse).forEach(([k, v]) => formData.append(k, v));

  // => Step 5b: Files
  Object.entries(tesdaFiles).forEach(([k, file]) => {
    if (file) formData.append(k, file);
  });

  // => Step 6: Scholarship
  Object.entries(tesdaScholarship).forEach(([k, v]) => formData.append(k, v));

  // => Step 7: Privacy
  formData.append('privacyAgreed', tesdaPrivacy.agreed);

  // => TODO: wire up to actual API endpoint
  console.log('TESDA form submitted');
};

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
      {/* Hero strip - always visible */}
      <div className="hero-strip">
        <div className="hero-inner">
          <span className="hero-badge">Admissions</span>
          <h1 className="hero-title">
            {enrollType === null && 'Start Your Enrollment'}
            {enrollType === 'shs' && 'SHS Enrollment'}
            {enrollType === 'tesda' && 'TESDA Enrollment'}
          </h1>
          <p className="hero-sub">
            {enrollType === null
              ? 'Choose your enrollment type to get started.'
              : enrollType === 'shs'
              ? 'Complete the form below to enroll in Senior High School.'
              : 'Complete the form below to enroll in a TESDA course.'
            }
          </p>
          <div className="hero-rule" />
        </div>
      </div>

      {/* => Selection screen: shown when no enrollment type is chosen yet */}
      {enrollType === null && (
        <div className="enroll-selection">
          <p className="enroll-selection-sub">Which program are you enrolling in?</p>
          <div className="enroll-cards">

            <button
              className="enroll-card"
              onClick={() => setEnrollType('shs')}
            >
              <i className="ti ti-school enroll-card-icon" />
              <span className="enroll-card-title">Senior High School</span>
              <span className="enroll-card-desc">
                Grade 11 & 12 · Academic and Technical-Vocational tracks
              </span>
              <span className="enroll-card-cta">
                Start SHS Enrollment <i className="ti ti-arrow-right" />
              </span>
            </button>

            <button
              className="enroll-card"
              onClick={() => setEnrollType('tesda')}
            >
              <i className="ti ti-certificate enroll-card-icon" />
              <span className="enroll-card-title">TESDA Course</span>
              <span className="enroll-card-desc">
                Technical-Vocational training · NC I · NC II · NC III
              </span>
              <span className="enroll-card-cta">
                Start TESDA Enrollment <i className="ti ti-arrow-right" />
              </span>
            </button>

          </div>
        </div>
      )}

      {/* => SHS flow: existing tabs layout, unchanged */}
      {enrollType === 'shs' && (
        <div className="enroll-wrap">
          {/* => Back to selection */}
          <button className="enroll-back-type" onClick={() => setEnrollType(null)}>
            <i className="ti ti-arrow-left" /> Change Enrollment Type
          </button>

          {/* existing SHS tab content goes here - keep exactly as is */}
          {/* step-tabs, progress-bar, tab-content divs, etc. */}
        </div>
      )}

      {/* => TESDA flow: 7-step linear form with progress bar */}
      {enrollType === 'tesda' && (
        <div className="enroll-wrap">

          {/* => Back to selection - only on Step 1 */}
          {tesdaStep === 1 && (
            <button className="enroll-back-type" onClick={() => setEnrollType(null)}>
              <i className="ti ti-arrow-left" /> Change Enrollment Type
            </button>
          )}

          {/* => TESDA Progress indicator */}
          <div className="tesda-progress">
            <div className="tesda-progress-text">
              Step {tesdaStep} of 5 &mdash;{' '}
              <span className="tesda-progress-label">
                {tesdaStep === 1 && 'Learner / Manpower Profile'}
                {tesdaStep === 2 && 'Personal Information'}
                {tesdaStep === 3 && 'Client Classification'}
                {tesdaStep === 4 && 'NCAE / YP4SC'}
                {tesdaStep === 5 && 'Course, Scholarship & Legal Consent'}
              </span>
            </div>
            <div className="tesda-progress-bar">
              <div
                className="tesda-progress-fill"
                style={{ width: `${(tesdaStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* => TESDA Steps */}
          {tesdaStep === 1 && (
            <TESDAStep1
              data={tesdaProfile}
              onChange={(key, val) => setTesdaProfile(prev => ({ ...prev, [key]: val }))}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 2 && (
            <TESDAStep2
              data={tesdaPersonal}
              onChange={(key, val) => setTesdaPersonal(prev => ({ ...prev, [key]: val }))}
              onBack={tesdaGoBack}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 3 && (
            <TESDAStep3
              selected={tesdaClassifications}
              onChange={setTesdaClassifications}
              onBack={tesdaGoBack}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 4 && (
            <TESDAStep4
              data={tesdaNcae}
              onChange={(key, val) => setTesdaNcae(prev => ({ ...prev, [key]: val }))}
              onBack={tesdaGoBack}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 5 && (
            <TESDAStep5
              data={tesdaCourse}
              onChange={(key, val) => setTesdaCourse(prev => ({ ...prev, [key]: val }))}
              files={tesdaFiles}
              onFileChange={handleTesdaFileChange}
              scholarData={tesdaScholarship}
              onScholarChange={(key, val) => setTesdaScholarship(prev => ({ ...prev, [key]: val }))}
              privacyData={tesdaPrivacy}
              onPrivacyChange={(key, val) => setTesdaPrivacy(prev => ({ ...prev, [key]: val }))}
              onBack={tesdaGoBack}
              onSubmit={handleTesdaSubmit}
            />
          )}

        </div>
      )}
    </>
  );
};

export default Enroll;