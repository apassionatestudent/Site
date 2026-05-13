import React from 'react';
import './CourseRequirements1.css';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

const CourseRequirements1 = ({ data, onChange, onBack, onNext }) => {

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
            {/* => Will be replaced with dynamic options from database */}
            <span className="cr1-note"> - from database</span>
          </label>
          <select className="cr1-select" disabled>
            <option value="">- Coming soon -</option>
          </select>
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">Client Type <span className="cr1-req">*</span></label>
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
            {/* => Will be replaced with branches from database */}
            <Info content="Select a branch of the organization. Please be advised that the course availability may vary by branch." />
            <span className="cr1-note"> - from database</span>
          </label>
          <select className="cr1-select" disabled>
            <option value="">- Coming soon -</option>
          </select>
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">
            Course <span className="cr1-req">*</span>
            {/* => Will be replaced with courses from database including course fee */}
            <Info content="Select a course from the chosen branch."/>
            <span className="cr1-note"> - from database</span>
          </label>
          <select className="cr1-select" disabled>
            <option value="">- Coming soon -</option>
          </select>
          {/* => Course fee placeholder - will display once course is selected from db */}
          {data.course && (
            <span className="cr1-course-fee">
              Course Fee: <strong>{data.courseFee || '-'}</strong>
            </span>
          )}
          {!data.course && (
            <span className="cr1-field-hint">Course fee will display here once a course is selected.</span>
          )}
        </div>

        <div className="cr1-field-group">
          <label className="cr1-label">
            Class <span className="cr1-req">*</span>
            {/* => Will be replaced with available classes from database */}
            <Info content="Available Class - a class has been set up by an admin and actively enrolling students into it.
            Reserved - the organization is accredited to offer such course but no class is currently available. However, you can still apply for reservation." />
            <span className="cr1-note"> - from database</span>
          </label>
          <select className="cr1-select" disabled>
            <option value="">- Coming soon -</option>
          </select>
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

      {/* Navigation */}
      <div className="cr1-nav">
        <button className="cr1-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Back
        </button>
        <button className="cr1-btn-next" onClick={onNext}>
          Next <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>

    </div>
  );
};

export default CourseRequirements1;
