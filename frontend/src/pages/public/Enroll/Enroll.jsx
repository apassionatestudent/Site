import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Enroll.css';

import TESDAStep1 from '../../../components/public/TESDA/TESDAStep1';
import TESDAStep2 from '../../../components/public/TESDA/TESDAStep2';
import TESDAStep3 from '../../../components/public/TESDA/TESDAStep3';

// => New: SHS step imports, mirrors the TESDA import block above
import SHSStep1 from '../../../components/public/SHS/SHSStep1';
import SHSStep2 from '../../../components/public/SHS/SHSStep2';
import SHSStep3 from '../../../components/public/SHS/SHSStep3';

import InformationModal from '../../../components/InformationModal/informationModal';


const Enroll = () => {
const navigate = useNavigate();

// => Controls which enrollment type the user selected: null | 'shs' | 'tesda'
const [enrollType, setEnrollType] = useState(null);

// => Shows the post-submission "next steps" modal, replaces the old alert()
const [showInfoModal, setShowInfoModal] = useState(false);

// => Real enrollment status ('Pending' or 'Reserved') returned by the
// => submission response - drives which InformationModal variant is
// => shown, since a batch can fill up between page load and submit and
// => silently downgrade the student to Reserved server-side
const [submissionStatus, setSubmissionStatus] = useState(null);

// => 'explicit' (student picked Reserve themselves) or 'downgraded'
// => (their real batch pick filled up before this submit landed) - only
// => meaningful when submissionStatus is 'Reserved'
const [submissionReservedReason, setSubmissionReservedReason] = useState(null);

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
  // => Preset to Cebu since 3A Prime is physically located in Cebu City -
  // => defaults the cascade so most applicants don't need to touch it
  province: '0702200000',
  region: '0700000000',
  email: '',
  facebookLink: '', 
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
  birthplaceCity: '',      
  birthplaceProvince: '',  
  birthplaceRegion: '',    
  educAttainment: '',
  guardianName: '',
  guardianAddress: '',
  // => required since student_guardian.guardian_contact_no is NOT NULL
  guardianContactNo: '',
});

// => TESDA form data - Client Classification (Step 3)
const [tesdaClassifications, setTesdaClassifications] = useState([]);
// => Free-text value when 'others' is checked in Step 3
const [tesdaOthersText, setTesdaOthersText] = useState('');

// => TESDA form data - NCAE/YP4SC (Step 4)
const [tesdaNcae, setTesdaNcae] = useState({
  takenBefore: '',
  where: '',
  when: '',
});

// => TESDA form data - Course & Batch (Step 5)
const [tesdaCourse, setTesdaCourse] = useState({
  // => sector selected first, filters the course dropdown - replaces the
  // => old branch selector now that the institution is single-branch
  sector: '',
  course: '',
  courseFee: '',
  // => renamed from batch to courseClass to match classController's class_id
  courseClass: '',
});

// => TESDA form data - File uploads (Step 3)
// => No more hardcoded keys - every key is a requirement_id-based id
// => added dynamically as TESDAStep3 fetches the course's requirements.
// => Each value is now an array of Files, not a single File, since a
// => requirement can allow more than one file (max_files)
const [tesdaFiles, setTesdaFiles] = useState({});

// => Mirrors tesdaFiles' keys with { id: documentType } pairs, kept in
// => sync by TESDAStep3 via onRequirementsChange below. Needed at submit
// => time since field ids like "req_12" are frontend-only - the backend
// => needs the actual document_type string to write into tesda_documents
const [tesdaRequirements, setTesdaRequirements] = useState([]);

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

// => SHS multi-step state: tracks which of the 3 pages is active
const [shsStep, setShsStep] = useState(1);

const [shsProfile, setShsProfile] = useState({
  lrn: '',
  lastName: '',
  firstName: '',
  middleName: '',
  suffix: 'N/A',
  sex: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  // => was a single placeOfBirth string - split to match SHSStep1's actual
  // => cascade (birthplaceRegion/Province/City), separate from home address below
  birthplaceRegion: '',
  birthplaceProvince: '',
  birthplaceCity: '',
  citizenship: 'Filipino',
  religion: '',
  // => new: "Others" specify text, read/written by SHSStep1 as data.religionOthers
  religionOthers: '',
  // => Preset to Cebu since 3A Prime is physically located in Cebu City -
  // => defaults the cascade so most applicants don't need to touch it
  region: '0700000000',
  province: '0702200000',
  city: '',
  barangay: '',
  district: '',
  street: '',
  contactNo: '',
  // => new: required field in SHSStep1, was never added here - admins use
  // => this for batch group-chat additions
  facebookLink: '',
  email: '',
});

const [shsAcademic, setShsAcademic] = useState({
  lastSchoolAttended: '',
  schoolAddress: '',
  gradeLevelCompleted: '',
  schoolYearCompleted: '',
  // => Academic Track removed from the UI - only Technical Professional
  // => Track is offered per the SY 2026-2027 flyer. Hardcoded here rather
  // => than removed from the schema, since shs_enrollments.track and
  // => shs_classes.track are both NOT NULL and shs_classes matching still
  // => keys off this value.
  track: 'technical professional',
  cluster: '',
  electives: '',
  // => matches shs_enrollments.class_id - stays '' when no class is
  // => available for the track+cluster combo (Reserve path)
  class: '',
});

// => SHS form data - Document uploads for Step 2. Kept separate from
// => shsAcademic since File objects aren't plain serializable data like
// => the rest of the academic fields - mirrors how shsPrivacy is kept
// => separate from shsFamily in Step 3.
const [shsDocuments, setShsDocuments] = useState({
  psaBirthCertificate: null,
  grade10ReportCard: null,
  goodMoralCertificate: null,
  // => photos2x2/photos1x1 removed - that upload feature was pulled from
  // => SHSStep2.jsx once physical-submission-only was decided; these keys
  // => were dead state left behind
  escCertificate: null,
});

// => SHS form data - Parent/Guardian, Emergency Contact, Health Information (Step 3)
const [shsFamily, setShsFamily] = useState({
  fatherName: '', fatherOccupation: '', fatherContactNo: '',
  motherName: '', motherOccupation: '', motherContactNo: '',
  guardianName: '', guardianOccupation: '', guardianRelationship: '', guardianContactNo: '',
  emergencyName: '', emergencyRelationship: '', emergencyContactNo: '', emergencyAddress: '',
  hasMedicalCondition: '',   // => 'none' | 'yes'
  medicalConditionDetail: '',
  allergies: '',
  maintenanceMedication: '',
});

// => SHS form data - Data Privacy Consent (replaces Section VII's signature
// => block per stakeholder direction - no signature capture, consent only)
const [shsPrivacy, setShsPrivacy] = useState({
  agreed: false,
});

// => Clears every field back to its initial blank state - called once the
// => user dismisses the post-submission modal, so a second visit to /enroll
// => never shows leftover data from a submission that already went through
const resetAllForms = () => {
  setEnrollType(null);

  setTesdaStep(1);
  setTesdaProfile({
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
    facebookLink: '',
    contactNo: '',
    nationality: 'Filipino',
  });
  setTesdaPersonal({
    sex: '',
    civilStatus: '',
    employmentStatus: '',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    birthplaceCity: '',
    birthplaceProvince: '',
    birthplaceRegion: '',
    educAttainment: '',
    guardianName: '',
    guardianAddress: '',
    guardianContactNo: '',
  });
  setTesdaClassifications([]);
  setTesdaOthersText('');
  setTesdaNcae({ takenBefore: '', where: '', when: '' });
  setTesdaCourse({ sector: '', course: '', courseFee: '', courseClass: '' });
  setTesdaFiles({});
  setTesdaRequirements([]);
  setTesdaScholarship({ isScholar: '', scholarshipType: '', otherScholarship: '' });
  setTesdaPrivacy({ agreed: false });

  setShsStep(1);
  setShsProfile({
    lrn: '',
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: 'N/A',
    sex: '',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    birthplaceRegion: '',
    birthplaceProvince: '',
    birthplaceCity: '',
    citizenship: 'Filipino',
    religion: '',
    religionOthers: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    district: '',
    street: '',
    contactNo: '',
    facebookLink: '',
    email: '',
  });
  setShsAcademic({
    lastSchoolAttended: '',
    schoolAddress: '',
    gradeLevelCompleted: '',
    schoolYearCompleted: '',
    track: 'technical professional',
    cluster: '',
    electives: '',
    class: '',
  });
  setShsDocuments({
    psaBirthCertificate: null,
    grade10ReportCard: null,
    goodMoralCertificate: null,
    escCertificate: null,
  });
  setShsFamily({
    fatherName: '', fatherOccupation: '', fatherContactNo: '',
    motherName: '', motherOccupation: '', motherContactNo: '',
    guardianName: '', guardianOccupation: '', guardianRelationship: '', guardianContactNo: '',
    emergencyName: '', emergencyRelationship: '', emergencyContactNo: '', emergencyAddress: '',
    hasMedicalCondition: '',
    medicalConditionDetail: '',
    allergies: '',
    maintenanceMedication: '',
  });
  setShsPrivacy({ agreed: false });
};

// => Fires when the info modal's countdown finishes and the user closes it
const handleInfoModalClose = () => {
  setShowInfoModal(false);
  setSubmissionStatus(null);
  setSubmissionReservedReason(null);
  resetAllForms();
  navigate('/login');
};

// => SHS navigation helpers - same shape as tesdaGoNext/tesdaGoBack
const shsGoNext = () => {
  setShsStep(prev => Math.min(prev + 1, 3));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const shsGoBack = () => {
  setShsStep(prev => Math.max(prev - 1, 1));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// => Final SHS form submission - assembles all data into FormData.
// => NOTE: '/api/enrollment/submit-shs' is a placeholder endpoint - this
// => route/controller/service/model doesn't exist on the backend yet.
// => Flagging this explicitly rather than assuming a path, since SHS
// => backend work hasn't been scoped yet (still pending DepEd/Section VII
// => stakeholder clarification).
const handleShsSubmit = async () => {
  const formData = new FormData();

  Object.entries(shsProfile).forEach(([k, v]) => formData.append(k, v));
  formData.append('academicData', JSON.stringify(shsAcademic));
  formData.append('familyData', JSON.stringify(shsFamily));
  formData.append('privacyAgreed', shsPrivacy.agreed);

  // => shsDocuments values are arrays now, since SHSStep2.jsx moved every
  // => document field to array-based state so grade10ReportCard can hold
  // => up to 2 files. Loop each array and append every File individually
  // => under the same field name, so multer's .fields() collects them
  // => together server-side. Empty arrays (e.g. escCertificate left blank)
  // => are skipped entirely instead of appending a stray empty value.
  Object.entries(shsDocuments).forEach(([k, fileArray]) => {
    if (!fileArray || fileArray.length === 0) return;
    fileArray.forEach((file) => formData.append(k, file));
  });

  try {
    const res = await fetch('/api/enrollment/submit-shs', {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();

    // => Reads the actual backend message (e.g. a specific validation
    // => error) before throwing, instead of a generic "Server responded
    // => with 400" that threw that detail away
    if (!res.ok) throw new Error(result.message || `Server responded with ${res.status}`);

    console.log('SHS enrollment submitted:', result);

    setSubmissionStatus(result.status || null);
    setSubmissionReservedReason(result.reserved_reason || null);
    setShowInfoModal(true);
  } catch (err) {
    console.error('SHS submission failed:', err);
    toast.error(err.message || 'Submission failed. Please try again.');
  }
};

// => Stable handler for TESDA file changes - lifted so Step 3 submit can
// => access all files. fileList is now always an array (a requirement
// => can hold more than one file when max_files > 1)
const handleTesdaFileChange = useCallback((key, fileList) => {
  setTesdaFiles(prev => ({ ...prev, [key]: fileList }));
}, []);

// => Stable handler receiving TESDAStep3's current requirement list
// => whenever the selected course's requirements change
const handleTesdaRequirementsChange = useCallback((requirements) => {
  setTesdaRequirements(requirements);
}, []);

// => TESDA navigation helpers
const tesdaGoNext = () => {
  
  setTesdaStep(prev => Math.min(prev + 1, 3));
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

  // => Step 3: Classifications - tesdaClassifications is a single string
  // => (TESDAStep3 is single-select via radio buttons), wrapped in an array
  // => here since insertClientClassifications expects Array.isArray() to pass
  formData.append('classifications', JSON.stringify(tesdaClassifications ? [tesdaClassifications] : []));

  // => Step 4: NCAE 
  formData.append('ncaeData', JSON.stringify(tesdaNcae));

  // => Step 5: Course
  formData.append('courseData', JSON.stringify(tesdaCourse));
  formData.append('scholarshipData', JSON.stringify(tesdaScholarship)); // scholarship

  // => Step 3: Files - each requirement now holds an array of files, so
  // => every file is appended under the same field name. Backend handling
  // => for mapping each file back to its document_type on tesda_documents
  // => is still separate not-yet-built work, this only fixes the FormData
  // => shape on the frontend side.
  Object.entries(tesdaFiles).forEach(([k, fileList]) => {
    (fileList || []).forEach(file => {
      if (file) formData.append(k, file);
    });
  });

  // => Manifest telling the backend which document_type each dynamic
  // => field id corresponds to - field ids are frontend-only, the DB
  // => needs the actual admin-defined document_type label
  const documentRequirements = {};
  tesdaRequirements.forEach((req) => {
    documentRequirements[req.id] = req.documentType;
  });
  formData.append('documentRequirements', JSON.stringify(documentRequirements));

  // => Step 6: Scholarship
  Object.entries(tesdaScholarship).forEach(([k, v]) => formData.append(k, v));

  formData.append('othersText', tesdaOthersText); 

  // => Step 7: Privacy
  formData.append('privacyAgreed', tesdaPrivacy.agreed);

  try {
    const res = await fetch('/api/enrollment/submit', {
      method: 'POST',
      // => Do NOT set Content-Type manually - fetch sets it automatically with the boundary for FormData
      body: formData,
    });

    const result = await res.json();

    // => Reads the actual backend message (e.g. a specific validation
    // => error) before throwing, instead of a generic "Server responded
    // => with 400" that threw that detail away
    if (!res.ok) throw new Error(result.message || `Server responded with ${res.status}`);

    console.log('Enrollment submitted:', result);

    setSubmissionStatus(result.status || null);
    setSubmissionReservedReason(result.reserved_reason || null);
    setShowInfoModal(true);
  } catch (err) {
    console.error('Submission failed:', err);
    toast.error(err.message || 'Submission failed. Please try again.');
  }
};


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

      {/* => SHS flow: 3-step linear form with progress bar, mirrors TESDA flow below */}
      {enrollType === 'shs' && (
        <div className="enroll-wrap">

          {/* => Back to selection - only on Step 1 */}
          {shsStep === 1 && (
            <button className="enroll-back-type" onClick={() => setEnrollType(null)}>
              <i className="ti ti-arrow-left" /> Change Enrollment Type
            </button>
          )}

          {/* => SHS Progress indicator - reuses .tesda-progress since those
               tokens are generic (--accent, --enroll-tabs-bg, etc.), not
               TESDA-branded, so no need to duplicate the CSS */}
          <div className="tesda-progress">
            <div className="tesda-progress-text">
              Step {shsStep} of 3 &mdash;{' '}
              <span className="tesda-progress-label">
                {shsStep === 1 && 'Student Information'}
                {shsStep === 2 && 'Academic Information & SHS Enrollment Details'}
                {shsStep === 3 && 'Family, Emergency & Health Information'}
              </span>
            </div>
            <div className="tesda-progress-bar">
              <div
                className="tesda-progress-fill"
                style={{ width: `${(shsStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* => SHS Steps */}
          {shsStep === 1 && (
            <SHSStep1
              data={shsProfile}
              onChange={(key, val) => setShsProfile(prev => ({ ...prev, [key]: val }))}
              onNext={shsGoNext}
            />
          )}

          {shsStep === 2 && (
            <SHSStep2
              data={shsAcademic}
              onChange={(key, val) => setShsAcademic(prev => ({ ...prev, [key]: val }))}
              documents={shsDocuments}
              onDocumentsChange={(key, val) => setShsDocuments(prev => ({ ...prev, [key]: val }))}
              onBack={shsGoBack}
              onNext={shsGoNext}
            />
          )}

          {shsStep === 3 && (
            <SHSStep3
              data={shsFamily}
              onChange={(key, val) => setShsFamily(prev => ({ ...prev, [key]: val }))}
              privacyData={shsPrivacy}
              onPrivacyChange={(key, val) => setShsPrivacy(prev => ({ ...prev, [key]: val }))}
              onBack={shsGoBack}
              onSubmit={handleShsSubmit}
            />
          )}

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
              Step {tesdaStep} of 3 &mdash;{' '}
              <span className="tesda-progress-label">
                {tesdaStep === 1 && 'Personal & Contact Information'}
                {tesdaStep === 2 && 'Classification & Assessment History'}
                {tesdaStep === 3 && 'Course, Scholarship & Legal Consent'}
              </span>
            </div>
            <div className="tesda-progress-bar">
              <div
                className="tesda-progress-fill"
                style={{ width: `${(tesdaStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* => TESDA Steps */}
          {tesdaStep === 1 && (
            <TESDAStep1
              profileData={tesdaProfile}
              onProfileChange={(key, val) => setTesdaProfile(prev => ({ ...prev, [key]: val }))}
              personalData={tesdaPersonal}
              onPersonalChange={(key, val) => setTesdaPersonal(prev => ({ ...prev, [key]: val }))}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 2 && (
            <TESDAStep2
              selected={tesdaClassifications}
              onChange={setTesdaClassifications}
              othersText={tesdaOthersText}
              onOthersTextChange={setTesdaOthersText}
              ncaeData={tesdaNcae}
              onNcaeChange={(key, val) => setTesdaNcae(prev => ({ ...prev, [key]: val }))}
              onBack={tesdaGoBack}
              onNext={tesdaGoNext}
            />
          )}

          {tesdaStep === 3 && (
            <TESDAStep3
              data={tesdaCourse}
              onChange={(key, val) => setTesdaCourse(prev => ({ ...prev, [key]: val }))}
              files={tesdaFiles}
              onFileChange={handleTesdaFileChange}
              onRequirementsChange={handleTesdaRequirementsChange}
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

      {/* => Shared for both TESDA and SHS - the mockup steps inside
           InformationModal are generic enough to cover either flow for now */}
      <InformationModal
        isOpen={showInfoModal}
        onClose={handleInfoModalClose}
        variant={
          submissionStatus === 'Reserved'
            ? (submissionReservedReason === 'downgraded' ? 'reserved-downgraded' : 'reserved-explicit')
            : 'pending'
        }
      />
    </>
  );
};

export default Enroll;