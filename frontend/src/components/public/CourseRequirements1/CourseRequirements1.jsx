import React, { useState, useEffect } from 'react';
import './CourseRequirements1.css';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

const CourseRequirements1 = ({ data, onChange, onBack, onNext }) => {

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // => Tracks the full branch object of the currently selected branch
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // => Tracks the selected course object for displaying the fee
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // => Controls whether validation errors are shown - mirrors Enroll.jsx pattern
  const [showErrors, setShowErrors] = useState(false);

  // => Fetch all active branches from the database on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        setBranches(data);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        // => Always turn off loading whether it succeeds or fails
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // => Fetch courses whenever the selected branch changes
  useEffect(() => {
    if (!data.branch) {
      // => Clear courses when branch is deselected
      setCourses([]);
      setSelectedCourse(null);
      return;
  }

  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await fetch(`/api/courses?branch_id=${data.branch}`);
      const result = await res.json();
      // => Guard: only set if result is actually an array, otherwise default to empty
      setCourses(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

    fetchCourses();
  }, [data.branch]); // => re-runs every time branch selection changes

  // => Fetch classes whenever course or branch changes
  useEffect(() => {
    if (!data.course || !data.branch) {
      // => Clear classes if either branch or course is not yet selected
      setClasses([]);
      return;
    }

    const fetchClasses = async () => {
      setClassesLoading(true);
      try {
        const res = await fetch(`/api/classes?course_id=${data.course}&branch_id=${data.branch}`);
        const result = await res.json();
        // => Guard: only set if result is actually an array
        setClasses(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };

    fetchClasses();
  }, [data.course, data.branch]); // => re-runs when either course or branch changes

  // => Validates all required fields in Step 3.1 - mirrors validateStep1/2 pattern
  const validateStep31 = () => {
    if (!data.assessmentType) return 'missing';
    if (!data.clientClassification) return 'missing';
    if (!data.clientType) return 'missing';
    if (!data.branch) return 'missing';
    if (!data.course) return 'missing';
    // => 'reserve' is a valid class selection when no classes are available
    if (!data.courseClass) return 'missing';
    if (!data.isSHS) return 'missing';
    if (!data.isScholar) return 'missing';
    return 'valid';
  };

  // => Intercept onNext - validate first before allowing progression, commented parts for easier routing. 
  const handleNext = () => {
    // => Validation temporarily disabled for testing substeps 3.2 and 3.3
    // => Re-enable when ready by uncommenting the block below
    // if (validateStep31() !== 'valid') {
    //   setShowErrors(true);
    //   return;
    // }
    // setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNext();
  };

  return (
    <div className="cr1-wrap">

      <div className="cr1-section-title">Course Selection</div>

      {/* Row 1 - Assessment Type + Client Classification + Client Type */}
      <div className="cr1-grid g-3">

        <div className="cr1-field-group">
          <label className="cr1-label">Assessment Type <span className="cr1-req">*</span> 
            <Info content="Full Qualification - Full competency training.
            COC (Certificate of Competency) - Reenrollment upon Core Competency/ies failure after assessment. 
            Renewal - Renewal of existing National Certification. Ideally you should renew before it expires." /> 
          </label>
          <select
            className="cr1-select"
            value={data.assessmentType}
            onChange={(e) => onChange('assessmentType', e.target.value)}
          >
            <option value="">Select</option>
            <option value="full_qualification">Full Qualification</option>
            <option value="coc">COC</option>
            <option value="renewal">Renewal</option>
          </select>
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">
            Client Classification <span className="cr1-req">*</span>
              <Info content="Select the client classification that best describes you. This is important for us to know so we can provide you with the appropriate assistance and support. If you belong to multiple classifications, please select the one that you identify with the most or that is most relevant to your current situation." />
          </label>
          <select
            className="cr1-select"
            value={data.clientClassification}
            onChange={(e) => onChange('clientClassification', e.target.value)}
          >
            <option value="">- Select -</option>
            <option value="students">Students</option>
            <option value="osy">Out-of-School Youth</option>
            <option value="solo_parent">Solo Parent</option>
            <option value="solo_parent_children">Solo Parent's Children</option>
            <option value="senior_citizens">Senior Citizens</option>
            <option value="displaced_heis">Displaced HEIs Teaching Personnel</option>
            <option value="displaced_workers">Displaced Workers</option>
            <option value="tvet_trainers">TVET Trainers</option>
            <option value="currently_employed">Currently Employed Workers</option>
            <option value="contractual_employees">Employees with Contractual/Job-Order Status</option>
            <option value="tesda_alumni">TESDA Alumni</option>
            <option value="urban_rural_poor">Urban and Rural Poor</option>
            <option value="informal_workers">Informal Workers</option>
            <option value="industry_workers">Industry Workers</option>
            <option value="cooperatives">Cooperatives</option>
            <option value="family_enterprises">Family Enterprises</option>
            <option value="micro_entrepreneurs">Micro Entrepreneurs</option>
            <option value="family_of_micro_entrepreneurs">Family Members of Microentrepreneur</option>
            <option value="farmers_fisherman">Farmers and Fisherman</option>
            <option value="family_of_farmers">Family Members of Farmers and Fisherman</option>
            <option value="community_coordinator">Community Trng. & Employment Coordinator</option>
            <option value="returning_ofw">Returning/Repatriated Overseas Filipino Workers</option>
            <option value="ofw_dependents">Overseas Filipino Workers (OFW) Dependents</option>
            <option value="pwd">Persons with Disabilities</option>
            <option value="indigenous_people">Indigenous People & Cultural Communities</option>
            <option value="disadvantaged_women">Disadvantaged Women</option>
            <option value="natural_disaster_victims">Victim of Natural Disasters and Calamities</option>
            <option value="trafficking_victims">Victim or Survivor of Human Trafficking</option>
            <option value="drug_dependents">Drug Dependent Surrenderers</option>
            <option value="rebel_returnees">Rebel Returnees or Decommissioned Combatants</option>
            <option value="inmates">Inmates and Detainees</option>
            <option value="wounded_afp_pnp">Wounded-in-Action AFP & PNP Personnel</option>
            <option value="family_afp_pnp_killed">Family Members of AFP and PNP Killed-and-Wounded in-Action</option>
            <option value="family_inmates">Family Members of Inmates and Detainees</option>
            <option value="uniformed_personnel">Uniformed Personnel</option>
          </select>
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">Client Type <span className="cr1-req">*</span>
            <Info content="Select the client type that best describes you. 
            
            TVET means Technical-Vocational Education and Training. 

            TVET Graduating Student – Currently in the last term of a TVET course, not yet finished.
            TVET Graduate – Already finished a TVET course and has the certificate.
            Industry Worker – Currently working in a company/industry.
            K-12 – Still a basic education student (usually SHS).
            OFW – Overseas Filipino Worker (working or has worked abroad).
            " />
          </label>
          <select
            className="cr1-select"
            value={data.clientType}
            onChange={(e) => onChange('clientType', e.target.value)}
          >
            <option value="">Select</option>
            <option value="tvet_graduating">TVET Graduating Student</option>
            <option value="tvet_graduate">TVET Graduate</option>
            <option value="industry_worker">Industry Worker</option>
            <option value="k12">K-12</option>
            <option value="ofw">OFW</option>
          </select>
        </div>

      </div>

      {/* Row 2 - Branch + Course + Class */}
      <div className="cr1-grid g-3">

        <div className="cr1-field-group">
          <label className="cr1-label">
            Branch <span className="cr1-req">*</span>
            {/* => Fetches active branches from database */}
            <Info content="Select a branch of the organization. Please be advised that the course availability may vary by branch." />
          </label>
          <select
            className="cr1-select"
            value={data.branch}
            onChange={(e) => {
              onChange('branch', e.target.value);
              // => Reset course and fee when branch changes
              onChange('course', '');
              onChange('courseFee', '');
              setSelectedCourse(null);
              setClasses([]);
              // => Find and store the full branch object when user selects
              const found = branches.find((b) => b.branch_id === parseInt(e.target.value));
              setSelectedBranch(found || null);
            }}
            disabled={branchesLoading}
          >
            {/* => Show loading state while fetching */}
            <option value="">{branchesLoading ? 'Loading...' : '- Select Branch -'}</option>
            {branches.map((branch) => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name}
              </option>
            ))}
          </select>

          {/* => Show location link only when a branch is selected and has a maps_url */}
          {selectedBranch?.maps_url && (
            <a href={selectedBranch.maps_url} target="_blank" rel="noopener noreferrer" className="cr1-maps-link">
              <i className="ti ti-map-pin" /> Show Location
            </a>
          )}
          
        </div>
        

      
        <div className="cr1-field-group">
          <label className="cr1-label">
            Course & Fee <span className="cr1-req">*</span>
            {/* => Fetches active courses for the selected branch */}
            <Info content="Select a course from the chosen branch. "/>
            
          </label>
          <select
            className="cr1-select"
            value={data.course}
            onChange={(e) => {
              onChange('course', e.target.value);
              // => Reset class when course changes
              onChange('courseClass', '');
              setClasses([]);
              // => Find and store the full course object to display the fee
              const found = courses.find((c) => c.course_id === parseInt(e.target.value));
              setSelectedCourse(found || null);
              onChange('courseFee', found ? found.amount : '');
            }}
            disabled={!data.branch || coursesLoading}
          >
            {/* => Disabled until a branch is selected */}
            <option value="">
              {!data.branch ? '- Select a branch first -' : coursesLoading ? 'Loading...' : '- Select Course -'}
            </option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.title}
              </option>
            ))}
          </select>

          {/* => Display course fee once a course is selected */}
          {selectedCourse && (
            <span className="cr1-course-fee">
              Course Fee: <strong>₱{Number(selectedCourse.amount).toLocaleString('en-PH')}</strong>
            </span>
          )}
          {!selectedCourse && (
            <span className="cr1-field-hint">Course fee will display here once a course is selected which you can pay gradually in the office.</span>
          )}
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">
            Class <span className="cr1-req">*</span>
            {/* => Fetches available classes for the selected course and branch */}
            <Info content="Available Class - a class has been set up by an admin and actively enrolling students into it.
            Reserved - the organization is accredited to offer such course but no class is currently available. However, you can still apply for reservation." />
          </label>
          <select
            className="cr1-select"
            value={data.class}
            onChange={(e) => onChange('courseClass', e.target.value)}
            disabled={!data.course || classesLoading}
          >
            <option value="">
              {!data.course ? '- Select a course first -' : classesLoading ? 'Loading...' : '- Select Class -'}
            </option>
            {/* => Show Reserve option only  when no classes are available */}
            {data.course && !classesLoading && classes.length === 0 && (
              <option value="reserve">Reserve a Slot</option>
            )}
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {/* => Show start date, instructor, and remaining slots */}
                {new Date(cls.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                {' - '}
                {cls.instructor_full_name ?? 'TBA'}
                {' ('}
                {cls.remaining_slots} slots left
                {')'}
              </option>
            ))}
          </select>

          {/* => Show reserve option when a course is selected but no classes are available */}
          {data.course && !classesLoading && classes.length === 0 && (
            <span className="cr1-field-hint">
              No classes are currently available for this course at the selected branch.{' '}
              You may still apply for a <strong>reservation</strong> and will be notified once a class opens.
            </span>
          )}
        </div>

      </div>

      {/* Row 3 - SHS + TESDA Scholar */}
      <div className="cr1-grid g-2">

        <div className="cr1-field-group">
          <label className="cr1-label">Are you a Senior High School (SHS) student? <span className="cr1-req">*</span></label>
          <div className="cr1-radio-group">
            <label className="cr1-radio-label">
              <input
                type="radio"
                name="isSHS"
                value="yes"
                checked={data.isSHS === 'yes'}
                onChange={(e) => onChange('isSHS', e.target.value)}
              />
              <span>Yes</span>
            </label>
            <label className="cr1-radio-label">
              <input
                type="radio"
                name="isSHS"
                value="no"
                checked={data.isSHS === 'no'}
                onChange={(e) => onChange('isSHS', e.target.value)}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">Are you a TESDA Scholar? <span className="cr1-req">*</span></label>
          <div className="cr1-radio-group">
            <label className="cr1-radio-label">
              <input
                type="radio"
                name="isScholar"
                value="yes"
                checked={data.isScholar === 'yes'}
                onChange={(e) => onChange('isScholar', e.target.value)}
              />
              <span>Yes</span>
            </label>
            <label className="cr1-radio-label">
              <input
                type="radio"
                name="isScholar"
                value="no"
                checked={data.isScholar === 'no'}
                onChange={(e) => onChange('isScholar', e.target.value)}
              />
              <span>No</span>
            </label>
          </div>
          {/* => Scholar notice - evidence upload will be wired up later for 100% discount */}
          {data.isScholar === 'yes' && (
            <span className="cr1-field-hint cr1-hint-scholar">
              <i className="ti ti-info-circle" /> TESDA Scholars receive a 100% discount.
              Evidence of scholarship will be required on the next step.
            </span>
          )}
        </div>

      </div>

      {/* => Error banner - shown when user tries to proceed with missing fields */}
      {showErrors && validateStep31() !== 'valid' && (
        <div className="step-error-banner">
          <i className="ti ti-alert-circle" />
          Please fill in all required fields (denoted with ' * ') before proceeding.
        </div>
      )}

      {/* Navigation */}
      <div className="cr1-nav">
        <button className="cr1-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Back
        </button>
        {/* => Uses handleNext instead of onNext directly to trigger validation first */}
        <button className="cr1-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>

    </div>
  );
};

export default CourseRequirements1;
