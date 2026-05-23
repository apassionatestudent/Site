import React, { useMemo } from 'react';

import './CourseRequirements2.css';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

// => Industry sector options for Competency Assessment dropdown
const INDUSTRY_SECTORS = [
  'Agriculture and Fisheries',
  'Automotive',
  'Chemical Process Operations',
  'Construction',
  'Decorative Crafts',
  'Electronics',
  'Furniture and Fixtures',
  'Garments',
  'Health, Social and Community',
  'HVAC - Heating, Ventilation, and Air Conditioning',
  'Information and Communication Technology',
  'Logistics and Storing',
  'Maritime',
  'Processed Food',
  'Tourism',
  'Utility Sector',
];

const tesdaCoursesBySector = {
  'Agriculture and Fisheries': [
    'Agricultural Crops Production NC II',
    'Aquaponic Food Production NC II', 
    'Organic Agriculture Production NC II',
    'Fruit Growing NC II',
    'Grains Production NC II',
    'Sugarcane Production NC II',
    'Seaweeds Production NC II',
    'Aquaculture NC II',
    'Horticulture NC III',
    'Fish Capture NC II'
  ],
  'Automotive': [
    'Automotive Servicing NC I',
    'Automotive Servicing NC II',
    'Automotive Servicing NC IV (Engine Repair)'
  ],
  'Chemical Process Operations': [
    'Process Inspection NC II',
    'Rubber Processing NC II'
  ],
  'Construction': [
    'Carpentry NC II',
    'Carpentry NC III',
    'Masonry NC I',
    'Masonry NC II',
    'Masonry NC III',
    'Plumbing NC I',
    'Plumbing NC II',
    'Plumbing NC III',
    'Construction Painting NC II',
    'Scaffolding NC II (Scaffold Erection)',
    'Tile Setting NC II',
    'Photovoltaic Systems Installation NC II'
  ],
  'Decorative Crafts': [
    'Pyrotechnics NC II'
  ],
  'Electronics': [
    'Consumer Electronics Products Assembly and Servicing NC II',
    'Instrumentation and Control Servicing NC II',
    'Mechatronics Servicing NC II'
  ],
  'Furniture and Fixtures': [
    'Furniture Finishing NC II',
    'Upholstery NC II'
  ],
  'Garments': [
    'Dressmaking NC II',
    'Tailoring NC II'
  ],
  'Health, Social and Community': [
    'Caregiving NC II',
    'Massage Therapy NC II',
    'Barangay Health Services NC II',
    'Hilot (Wellness) NC II',
    'Beauty Care NC II',
    'Bookkeeping NC III',
    'Early Childhood Care and Development NC III',
    'Domestic Work NC II'
  ],
  'HVAC - Heating, Ventilation, and Air Conditioning': [
    'Refrigeration and Airconditioning Servicing NC II',
    'Commercial Air-Conditioning Installation and Servicing NC III'
  ],
  'Information and Communication Technology': [
    'Computer Systems Servicing NC II',
    'Programming NC IV',
    'Visual Graphic Design NC III',
    'Web Development (WordPress)'
  ],
  'Logistics and Storing': [
    'Driving NC II',
    'Fishport/Wharf Operations NC I'
  ],
  'Maritime': [
    'Ships\' Catering NC II'
  ],
  'Processed Food': [
    'Food Processing NC I',
    'Food Processing NC II',
    'Bread and Pastry Production NC II'
  ],
  'Tourism': [
    'Cookery NC II',
    'Bartending NC II',
    'Housekeeping NC II',
    'Front Office Services NC II',
    'Food and Beverage Services NC II'
  ],
  'Utility Sector': [
    'Electrical Installation and Maintenance NC II',
    'Cable TV Installation NC II'
  ]
};

// => Reusable date formatter => restricts to future dates only (mm/dd/yyyy)
const formatFutureDate = (value) => {
  const v = value.replace(/\D/g, '').slice(0, 8);
  let out = '';
  if (v.length > 4) out = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
  else if (v.length > 2) out = v.slice(0, 2) + '/' + v.slice(2);
  else out = v;
  return out;
};

// => Validate that a date is in the future (for expiry/issuance fields)
const validateFutureDate = (value) => {
  if (!value || value.length < 10) return '';
  const [mm, dd, yyyy] = value.split('/');
  if (!mm || !dd || !yyyy || yyyy.length < 4) return '';
  const date = new Date(`${yyyy}-${mm}-${dd}`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(date.getTime())) return 'Invalid date.';
  if (date <= today) return 'Date must be in the future.';
  return '';
};

// => Capitalizes first letter of each word, letters and spaces only
// => Numbers and special characters are blocked entirely
const formatNameField = (value) => {
  return value
    .replace(/[^a-zA-Z\s]/g, '') // => Strip anything that isn't a letter or space
    .replace(/\s{2,}/g, ' ') // => Collapse multiple spaces into one
    .replace(/^\s+/, '') // => No leading spaces
    .replace(/(^\s*\w|(?<=\s)\w)/g, (char) => char.toUpperCase()); // => Capitalize first letter of each word
};

// => Validates a past-or-present date range (work experience dates must not be in the future)
// => Returns an error string or empty string if valid
const validatePastDate = (value) => {
  if (!value || value.length < 10) return '';
  const [mm, dd, yyyy] = value.split('/');
  if (!mm || !dd || !yyyy || yyyy.length < 4) return '';
  const date = new Date(`${yyyy}-${mm}-${dd}`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(date.getTime())) return 'Invalid date.';
  if (date > today) return 'Date must not be in the future.';
  return '';
};

// => Reusable repeatable card header
const CardHeader = ({ index, total, label, onRemove }) => (
  <div className="cr2-card-header">
    <span className="cr2-card-num">{label} {index + 1}</span>
    {/* => Only show remove button when there's more than one entry */}
    {total > 1 && (
      <button
        className="cr2-remove-btn"
        onClick={onRemove}
        title="Remove this entry"
        type="button"
      >
        <i className="ti ti-trash" aria-hidden="true" />
      </button>
    )}
  </div>
);

// => Main component
const CourseRequirements2 = ({ data, onChange, isScholar, onBack, onNext }) => {

  // => Add a blank entry to a repeatable section
  const addEntry = (field, template) => {
    onChange(field, [...data[field], { ...template, id: Date.now() }]);
  };

  // => Remove an entry from a repeatable section by index
  const removeEntry = (field, index) => {
    onChange(field, data[field].filter((_, i) => i !== index));
  };

  // => Update a single field within a repeatable entry
  const updateEntry = (field, index, key, value) => {
    onChange(
      field,
      data[field].map((entry, i) =>
        i === index ? { ...entry, [key]: value } : entry
      )
    );
  };

  // => Update multiple fields on a single entry atomically - prevents race conditions
  // => when multiple fields depend on each other (e.g. level => title => sector)
  const updateEntryBatch = (field, index, updates) => {
    onChange(
      field,
      data[field].map((entry, i) =>
        i === index ? { ...entry, ...updates } : entry
      )
    );
  };

  // => Handle future-date input change for a specific entry field
  const handleFutureDate = (field, index, key, raw) => {
    updateEntry(field, index, key, formatFutureDate(raw));
  };

  // => Handle future-date error display for a specific entry field
  const getFutureDateError = (entry, key) => {
    const val = entry[key];
    if (!val || val.length < 10) return '';
    return validateFutureDate(val);
  };

  // => Filter courses by qualification level for dropdown
  const getCoursesByLevel = (level) => {
    // => Return empty if no level selected
    if (!level) return [];

    return Object.entries(tesdaCoursesBySector)
      .flatMap(([sector, courseList]) =>
        courseList
          // => Use exact word boundary match to prevent NC I matching NC II/III/IV
          .filter(course => {
            const escaped = level.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`\\b${escaped}\\b`).test(course);
          })
          .map(course => ({ title: course, sector }))
      )
      // => Alphabetical order by course title for easier navigation
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  // => Get sector for a specific course title
  const getSectorForCourse = (courseTitle) => {
    for (const [sector, courses] of Object.entries(tesdaCoursesBySector)) {
      if (courses.includes(courseTitle)) {
        return sector;
      }
    }
    return '';
  };

  // => Tracks which fields have been touched (blurred) to show errors only after interaction
  const [touched, setTouched] = React.useState({});

  // => Mark a specific field in a repeatable entry as touched on blur
  const handleBlur = (field, index, key) => {
    setTouched(prev => ({ ...prev, [`${field}-${index}-${key}`]: true }));
  };

  // => Returns true if a field has been touched and is empty
  const showFieldError = (field, index, key, value) => {
    return touched[`${field}-${index}-${key}`] && !value?.toString().trim();
  };

  // => Validates all required fields across Work Experience and Trainings
  // => Returns true only if every card in both sections is fully filled
  const validateRequiredSections = () => {
    if (isScholar) return true;

    const workFields = ['company', 'position', 'salary', 'dateFrom', 'dateTo', 'appointmentStatus', 'yearsExp'];
    const allWorkValid = data.workExperience.every(entry => {
      const allFilled = workFields.every(f => entry[f]?.toString().trim());
      // => Also block if dates are in the future or yearsExp exceeds retirement cap
      const datesValid = !validatePastDate(entry.dateFrom) && !validatePastDate(entry.dateTo);
      const yearsValid = !entry.yearsExp || parseInt(entry.yearsExp) <= 42;
      return allFilled && datesValid && yearsValid;
    });

    const trainingFields = ['title', 'venue', 'hours', 'dateFrom', 'dateTo', 'conductedBy'];
    const allTrainingValid = data.trainings.every(entry => {
      const allFilled = trainingFields.every(f => entry[f]?.toString().trim());
      // => Also block if training dates are in the future
      const datesValid = !validatePastDate(entry.dateFrom) && !validatePastDate(entry.dateTo);
      return allFilled && datesValid;
    });

    return allWorkValid && allTrainingValid;
  };

  // => On Next click: touch all required fields so errors surface, then block or proceed
  const handleNext = () => {
    if (isScholar) { onNext(); return; }

    const newTouched = {};

    const workFields = ['company', 'position', 'salary', 'dateFrom', 'dateTo', 'appointmentStatus', 'yearsExp'];
    data.workExperience.forEach((_, i) =>
      workFields.forEach(f => { newTouched[`workExperience-${i}-${f}`] = true; })
    );

    const trainingFields = ['title', 'venue', 'hours', 'dateFrom', 'dateTo', 'conductedBy'];
    data.trainings.forEach((_, i) =>
      trainingFields.forEach(f => { newTouched[`trainings-${i}-${f}`] = true; })
    );

    setTouched(prev => ({ ...prev, ...newTouched }));

    if (validateRequiredSections()) onNext();
  };

  return (
    <div className="cr2-wrap">

      {/* Work Experience => hidden when student is a TESDA Scholar */}
      {!isScholar && (
        <section className="cr2-section">
          <div className="cr2-section-title">
            Work Experience (National Qualification-related) <span className="cr2-req">* </span> 
          </div>
          <label className="cr2-label">Any relevant work experience to the course being pursued.</label> <br /> <br />
          {data.workExperience.map((entry, index) => (
            <div key={entry.id} className="cr2-card">
              <CardHeader
                index={index}
                total={data.workExperience.length}
                label="Entry"
                onRemove={() => removeEntry('workExperience', index)}
              />

              {/* Row A => Company + Position + Monthly Salary */}
              <div className="cr2-grid g-3">
                <div className="cr2-field-group">
                  <label className="cr2-label">Name of Company</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('workExperience', index, 'company', entry.company) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. ABC Corporation"
                    value={entry.company}
                    onChange={(e) => updateEntry('workExperience', index, 'company', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('workExperience', index, 'company')}
                  />
                  {/* => Show inline error only after field is touched and still empty */}
                  {showFieldError('workExperience', index, 'company', entry.company) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">Position</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('workExperience', index, 'position', entry.position) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. Service Crew"
                    value={entry.position}
                    onChange={(e) => updateEntry('workExperience', index, 'position', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('workExperience', index, 'position')}
                  />
                  {showFieldError('workExperience', index, 'position', entry.position) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">Monthly Salary (in PHP)</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('workExperience', index, 'salary', entry.salary) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. 15000"
                    value={entry.salary}
                    // => Restrict to numbers only
                    onChange={(e) => updateEntry('workExperience', index, 'salary', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('workExperience', index, 'salary')}
                  />
                  {showFieldError('workExperience', index, 'salary', entry.salary) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
              </div>

              {/* Row B => Inclusive Dates (2 fields per orig form) + Appointment Status + Years Exp */}
              <div className="cr2-grid g-3">
                <div className="cr2-field-group">
                  <label className="cr2-label">Inclusive Dates</label>
                  {/* => Two separate text fields matching the original TESDA form layout */}
                  <div className="cr2-date-range">
                    <input
                      type="text"
                      className={`cr2-input ${(showFieldError('workExperience', index, 'dateFrom', entry.dateFrom) || validatePastDate(entry.dateFrom)) ? 'cr2-input--error' : ''}`}
                      placeholder="From (mm/dd/yyyy)"
                      maxLength={10}
                      value={entry.dateFrom}
                      // => Use formatFutureDate only for auto-formatting the mm/dd/yyyy mask, not for future restriction
                      onChange={(e) => updateEntry('workExperience', index, 'dateFrom', formatFutureDate(e.target.value))}
                      onBlur={() => handleBlur('workExperience', index, 'dateFrom')}
                    />
                    <span className="cr2-date-sep">to</span>
                    <input
                      type="text"
                      className={`cr2-input ${(showFieldError('workExperience', index, 'dateTo', entry.dateTo) || validatePastDate(entry.dateTo)) ? 'cr2-input--error' : ''}`}
                      placeholder="To (mm/dd/yyyy)"
                      maxLength={10}
                      value={entry.dateTo}
                      onChange={(e) => updateEntry('workExperience', index, 'dateTo', formatFutureDate(e.target.value))}
                      onBlur={() => handleBlur('workExperience', index, 'dateTo')}
                    />
                  </div>

                  {/* => Show one shared error under the date range if either date is missing */}
                  {showFieldError('workExperience', index, 'dateFrom', entry.dateFrom) || showFieldError('workExperience', index, 'dateTo', entry.dateTo) ? (
                    <span className="cr2-field-error">Both dates are required.</span>
                  ) : (
                    <>
                      {validatePastDate(entry.dateFrom) && (
                        <span className="cr2-field-error">From: {validatePastDate(entry.dateFrom)}</span>
                      )}
                      {validatePastDate(entry.dateTo) && (
                        <span className="cr2-field-error">To: {validatePastDate(entry.dateTo)}</span>
                      )}
                    </>
                  )}

                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">Status of Appointment</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('workExperience', index, 'appointmentStatus', entry.appointmentStatus) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. Regular, Contractual"
                    value={entry.appointmentStatus}
                    onChange={(e) => updateEntry('workExperience', index, 'appointmentStatus', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('workExperience', index, 'appointmentStatus')}
                  />
                  {showFieldError('workExperience', index, 'appointmentStatus', entry.appointmentStatus) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">No. of Yrs. Working Experience</label>
                  <input
                    type="text"
                    className={`cr2-input ${(showFieldError('workExperience', index, 'yearsExp', entry.yearsExp) || (entry.yearsExp && parseInt(entry.yearsExp) > 42)) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. 3"
                    value={entry.yearsExp}
                    // => Restrict to numbers only, max 2 digits to prevent obviously wrong values
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                      updateEntry('workExperience', index, 'yearsExp', raw);
                    }}
                    onBlur={() => handleBlur('workExperience', index, 'yearsExp')}
                  />
                  {showFieldError('workExperience', index, 'yearsExp', entry.yearsExp) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                  {/* => Show cap error only when field is filled but exceeds the working age limit */}
                  {entry.yearsExp && !showFieldError('workExperience', index, 'yearsExp', entry.yearsExp) && parseInt(entry.yearsExp) > 42 && (
                    <span className="cr2-field-error">Years of experience cannot exceed 42 (retirement age limit).</span>
                  )}
                </div>
              </div>

            </div>
          ))}

          <button
            type="button"
            className="cr2-add-btn"
            onClick={() => addEntry('workExperience', {
              company: '', position: '', salary: '',
              dateFrom: '', dateTo: '', appointmentStatus: '', yearsExp: '',
            })}
          >
            <i className="ti ti-plus" aria-hidden="true" /> Add Work Experience
          </button>
        </section>
      )}

      {/* Other Training / Seminars => hidden when student is a TESDA Scholar */}
      {!isScholar && (
        <section className="cr2-section">
          <div className="cr2-section-title">
            Other Training / Seminars Attended (National Qualification-related) <span className="cr2-req">*</span>
          </div>
          <label className="cr2-label">Any relevant training to the course being pursued.</label> <br /> <br />

          {data.trainings.map((entry, index) => (
            <div key={entry.id} className="cr2-card">
              <CardHeader
                index={index}
                total={data.trainings.length}
                label="Entry"
                onRemove={() => removeEntry('trainings', index)}
              />

              {/* Row A => Title + Venue + No. of Hours */}
              <div className="cr2-grid g-3">
                <div className="cr2-field-group">
                  <label className="cr2-label">Title</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('trainings', index, 'title', entry.title) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. Food Safety Seminar"
                    value={entry.title}
                    onChange={(e) => updateEntry('trainings', index, 'title', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('trainings', index, 'title')}
                  />
                  {showFieldError('trainings', index, 'title', entry.title) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">Venue</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('trainings', index, 'venue', entry.venue) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. Cebu City Hall"
                    value={entry.venue}
                    onChange={(e) => updateEntry('trainings', index, 'venue', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('trainings', index, 'venue')}
                  />
                  {showFieldError('trainings', index, 'venue', entry.venue) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">No. of Hours</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('trainings', index, 'hours', entry.hours) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. 8"
                    value={entry.hours}
                    // => Restrict to numbers only
                    onChange={(e) => updateEntry('trainings', index, 'hours', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    onBlur={() => handleBlur('trainings', index, 'hours')}
                  />
                  {showFieldError('trainings', index, 'hours', entry.hours) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
              </div>

              {/* Row B => Inclusive Dates + Conducted By */}
              <div className="cr2-grid g-2">
                <div className="cr2-field-group">
                  <label className="cr2-label">Inclusive Dates</label>
                  <div className="cr2-date-range">
                    <input
                      type="text"
                      className={`cr2-input ${(showFieldError('trainings', index, 'dateFrom', entry.dateFrom) || validatePastDate(entry.dateFrom)) ? 'cr2-input--error' : ''}`}
                      placeholder="From (mm/dd/yyyy)"
                      maxLength={10}
                      value={entry.dateFrom}
                      onChange={(e) => updateEntry('trainings', index, 'dateFrom', formatFutureDate(e.target.value))}
                      onBlur={() => handleBlur('trainings', index, 'dateFrom')}
                    />
                    <span className="cr2-date-sep">to</span>
                    <input
                      type="text"
                      className={`cr2-input ${(showFieldError('trainings', index, 'dateTo', entry.dateTo) || validatePastDate(entry.dateTo)) ? 'cr2-input--error' : ''}`}
                      placeholder="To (mm/dd/yyyy)"
                      maxLength={10}
                      value={entry.dateTo}
                      onChange={(e) => updateEntry('trainings', index, 'dateTo', formatFutureDate(e.target.value))}
                      onBlur={() => handleBlur('trainings', index, 'dateTo')}
                    />
                  </div>

                  {showFieldError('trainings', index, 'dateFrom', entry.dateFrom) || showFieldError('trainings', index, 'dateTo', entry.dateTo) ? (
                    <span className="cr2-field-error">Both dates are required.</span>
                  ) : (
                    <>
                      {validatePastDate(entry.dateFrom) && (
                        <span className="cr2-field-error">From: {validatePastDate(entry.dateFrom)}</span>
                      )}
                      {validatePastDate(entry.dateTo) && (
                        <span className="cr2-field-error">To: {validatePastDate(entry.dateTo)}</span>
                      )}
                    </>
                  )}

                </div>
                <div className="cr2-field-group">
                  <label className="cr2-label">Conducted By</label>
                  <input
                    type="text"
                    className={`cr2-input ${showFieldError('trainings', index, 'conductedBy', entry.conductedBy) ? 'cr2-input--error' : ''}`}
                    placeholder="e.g. TESDA Region VII"
                    value={entry.conductedBy}
                    onChange={(e) => updateEntry('trainings', index, 'conductedBy', formatNameField(e.target.value))}
                    onBlur={() => handleBlur('trainings', index, 'conductedBy')}
                  />
                  {showFieldError('trainings', index, 'conductedBy', entry.conductedBy) && (
                    <span className="cr2-field-error">This field is required.</span>
                  )}
                </div>
              </div>

            </div>
          ))}

          <button
            type="button"
            className="cr2-add-btn"
            onClick={() => addEntry('trainings', {
              title: '', venue: '', dateFrom: '', dateTo: '', hours: '', conductedBy: '',
            })}
          >
            <i className="ti ti-plus" aria-hidden="true" /> Add Training / Seminar
          </button>
        </section>
      )}

      {/* Licensure Examinations => Optional, visible to all */}
      <section className="cr2-section">
        <div className="cr2-section-title">
          Licensure Examination(s) Passed
          <span className="cr2-optional"> - Optional</span>
        </div>

        <label className="cr2-label">Licensure awarded by the Professional Regulation Commission (PRC).</label> <br /> <br />

        {data.licensures.map((entry, index) => (
          <div key={entry.id} className="cr2-card">
            <CardHeader
              index={index}
              total={data.licensures.length}
              label="Entry"
              onRemove={() => removeEntry('licensures', index)}
            />

            {/* Row A => Title + Year Taken + Examination Venue */}
            <div className="cr2-grid g-3">
              <div className="cr2-field-group">
                <label className="cr2-label">Title</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. Registered Nurse"
                  value={entry.title}
                  onChange={(e) => updateEntry('licensures', index, 'title', formatNameField(e.target.value))}
                />
              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Year Taken</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. 2022"
                  maxLength={4}
                  value={entry.yearTaken}
                  // => Restrict to 4-digit number only
                  onChange={(e) => updateEntry('licensures', index, 'yearTaken', e.target.value.replace(/\D/g, '').slice(0, 4))}
                />

                {/* I think no one would take a licensure exam before 1950 or in the future, so we can show an error if the year is out of that range */}
                {entry.yearTaken && entry.yearTaken.length === 4 && (parseInt(entry.yearTaken) < 1950 || parseInt(entry.yearTaken) > new Date().getFullYear()) && (
                  <span className="cr2-field-error">Enter a valid year between 1950 and {new Date().getFullYear()}.</span>
                )}

              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Examination Venue</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. PRC Cebu"
                  value={entry.venue}
                  onChange={(e) => updateEntry('licensures', index, 'venue', formatNameField(e.target.value))}
                />
              </div>
            </div>

            {/* Row B => Rating + Remarks + Expiry Date */}
            <div className="cr2-grid g-3">
              <div className="cr2-field-group">
                <label className="cr2-label">Rating</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. 85.50"
                  value={entry.rating}
                  onChange={(e) => updateEntry('licensures', index, 'rating', e.target.value)}
                />
              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Remarks</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. Passed"
                  value={entry.remarks}
                  onChange={(e) => updateEntry('licensures', index, 'remarks', formatNameField(e.target.value))}
                />
              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Expiry Date</label>
                <input
                  type="text"
                  className={`cr2-input ${getFutureDateError(entry, 'expiryDate') ? 'cr2-input--error' : ''}`}
                  placeholder="mm/dd/yyyy"
                  maxLength={10}
                  value={entry.expiryDate}
                  onChange={(e) => handleFutureDate('licensures', index, 'expiryDate', e.target.value)}
                />
                {/* => Show error when date is not in the future */}
                {getFutureDateError(entry, 'expiryDate') && (
                  <span className="cr2-field-error">{getFutureDateError(entry, 'expiryDate')}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="cr2-add-btn"
          onClick={() => addEntry('licensures', {
            title: '', yearTaken: '', venue: '', rating: '', remarks: '', expiryDate: '',
          })}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Add Licensure Examination
        </button>
      </section>

      {/* Competency Assessments => Optional, visible to all */}
      <section className="cr2-section">
        <div className="cr2-section-title">
          Competency Assessment(s) Passed
          <span className="cr2-optional"> - Optional</span>
        </div>
        <label className="cr2-label">National Certification awarded by TESDA.</label> <br /> <br />

        {data.competencies.map((entry, index) => (
          <div key={entry.id} className="cr2-card">
            <CardHeader
              index={index}
              total={data.competencies.length}
              label="Entry"
              onRemove={() => removeEntry('competencies', index)}
            />

            {/* Row A — Qualification Level FIRST (Title depends on it), then Title, then Industry Sector */}
            <div className="cr2-grid g-3">

              {/* => Qualification Level — must be selected before Title becomes available */}
              <div className="cr2-field-group">
                <label className="cr2-label">Qualification Level</label>
                <select
                  className="cr2-select"
                  value={entry.qualificationLevel || ''}
                  onChange={(e) => {
                    // => Reset title and sector atomically when level changes
                    updateEntryBatch('competencies', index, {
                      qualificationLevel: e.target.value,
                      title: '',
                      industrySector: '',
                    });
                  }}
                >
                  <option value="">Select Level</option>
                  <option value="NC I">NC I</option>
                  <option value="NC II">NC II</option>
                  <option value="NC III">NC III</option>
                  <option value="NC IV">NC IV</option>
                </select>
              </div>

              {/* => Title — filtered by selected level, disabled until level is chosen */}
              <div className="cr2-field-group">
                <label className="cr2-label">Title</label>
                <select
                  className="cr2-select"
                  value={entry.title || ''}
                  onChange={(e) => {
                    const selectedTitle = e.target.value;
                    // => Auto-fill sector atomically with title selection
                    const sector = getSectorForCourse(selectedTitle);
                    updateEntryBatch('competencies', index, {
                      title: selectedTitle,
                      industrySector: sector,
                    });
                  }}
                  disabled={!entry.qualificationLevel}
                >
                  <option value="">
                    {entry.qualificationLevel ? 'Select Course' : '— Select Level first —'}
                  </option>
                  {getCoursesByLevel(entry.qualificationLevel || '').map(({ title }) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              {/* => Industry Sector — auto-filled when course is selected, read-only */}
              <div className="cr2-field-group">
                <label className="cr2-label">
                  <span className="cr2-label-row">
                    Industry Sector
                    <Info content="Auto-filled based on the selected course. This field is read-only." />
                  </span>
                </label>
                <input
                  type="text"
                  className="cr2-input"
                  value={entry.industrySector || (entry.title ? 'Unknown Sector' : '—')}
                  readOnly
                  title="Industry Sector — auto-filled based on selected course"
                  style={{ background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-secondary)' }}
                />
              </div>

            </div>

            {/* Row B => Certificate Number + Date of Issuance + Expiration Date */}
            <div className="cr2-grid g-3">
              <div className="cr2-field-group">
                {/* => No character restriction => cert numbers may contain letters */}
                <label className="cr2-label">Certificate Number</label>
                <input
                  type="text"
                  className="cr2-input"
                  placeholder="e.g. NC-II-0123456"
                  value={entry.certNumber}
                  onChange={(e) => updateEntry('competencies', index, 'certNumber', e.target.value)}
                />
              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Date of Issuance</label>
                <input
                  type="text"
                  className={`cr2-input ${getFutureDateError(entry, 'dateIssued') ? 'cr2-input--error' : ''}`}
                  placeholder="mm/dd/yyyy"
                  maxLength={10}
                  value={entry.dateIssued}
                  onChange={(e) => handleFutureDate('competencies', index, 'dateIssued', e.target.value)}
                />

                {validatePastDate(entry.dateIssued) && (
                  <span className="cr2-field-error">{validatePastDate(entry.dateIssued)}</span>
                )}

              </div>
              <div className="cr2-field-group">
                <label className="cr2-label">Expiration Date</label>
                <input
                  type="text"
                  className={`cr2-input ${getFutureDateError(entry, 'expirationDate') ? 'cr2-input--error' : ''}`}
                  placeholder="mm/dd/yyyy"
                  maxLength={10}
                  value={entry.expirationDate}
                  onChange={(e) => handleFutureDate('competencies', index, 'expirationDate', e.target.value)}
                />
                {getFutureDateError(entry, 'expirationDate') && (
                  <span className="cr2-field-error">{getFutureDateError(entry, 'expirationDate')}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="cr2-add-btn"
          onClick={() => addEntry('competencies', {
            title: '', qualificationLevel: '', industrySector: '',
            certNumber: '', dateIssued: '', expirationDate: '',
          })}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Add Competency Assessment
        </button>
      </section>

      {/* Navigation */}
      <div className="cr2-nav">
        <button type="button" className="cr2-btn-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Back
        </button>
        {/* <button type="button" className="cr2-btn-next" onClick={onNext}> */}
        <button type="button" className="cr2-btn-next" onClick={handleNext}>
          Next <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>

    </div>
  );
};

export default CourseRequirements2;
