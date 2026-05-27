import React, { useState, useCallback } from 'react';
import './CourseRequirements3.css';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

const CourseRequirements3 = ({ files = {}, onFileChange, onBack, onSubmit }) => {
  // const [files, setFiles] = useState({
  //   birthCert: null,
  //   schoolDoc: null,
  //   validId: null
  // });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // => Controls visibility of the error banner above the action buttons
  const [showBanner, setShowBanner] = useState(false);

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  const validateFile = (file, field) => {
    if (!file) return 'This field is required.';
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG and PNG files are allowed.';
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return 'File size must be less than 5MB.';
    }
    return null;
  };

  const handleFileChange = useCallback((e, field) => {
    const file = e.target.files[0];

    // => Delegate file storage up to Enroll.jsx via onFileChange prop
    onFileChange(field, file);

    // => Validate inline to avoid stale closure on allowedTypes
    let error = null;
    if (!file) {
      error = 'This field is required.';
    } else if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      error = 'Only JPG and PNG files are allowed.';
    } else if (file.size > 5 * 1024 * 1024) {
      error = 'File size must be less than 5MB.';
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, [onFileChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // => Always validate all 3 required fields regardless of what's in files
    const newErrors = {};
    ['birthCert', 'schoolDoc', 'validId'].forEach(field => {
      const error = validateFile(files[field], field);
      if (error) newErrors[field] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // => Show banner so user knows why submission was blocked
      setShowBanner(true);
      return;
    }

// => Clear banner once all files are valid and submission proceeds
setShowBanner(false);
    
    setIsSubmitting(true);
    
    // => Simulate form submission for now
    try {
      await onSubmit?.();
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // => TODO: I need to replace the 'content' with actual usage of each doc. 
  const requirements = [
    {
      id: 'birthCert',
      label: 'NSO/PSA Birth Certificate',
      description: 'Official birth certificate from PSA/NSO', 
      content: 'The Philippine Statistics Authority (PSA) is the central statistical authority of the Philippine government. This will be used to verify your identity and age.'
    },
    {
      id: 'schoolDoc',
      label: 'Form 137 or TOR or High School/College Diploma',
      description: 'Latest school records or diploma',
      content: 'Form 137 (Report Card) or Transcript of Records (TOR) from your most recent school. If you have graduated, you can submit a copy of your High School or College Diploma instead.'
    },
    {
      id: 'validId',
      label: 'Valid ID',
      description: 'Primary Government-issued ID (any)',
      content: 'A valid government-issued ID (e.g., passport, driver’s license, or national ID) is required for verification purposes.'
    }
  ];

  return (
    <div className="cr3-wrap">
        <div className="cr3-container">
        <div className="cr3-header">
            <h3 className="cr3-title">Upload Requirements</h3>
            <p className="cr3-subtitle">
            Please upload clear, legible scans of the following (original) documents. 
            Only JPG and PNG files are accepted (max 5MB each).
            </p>
        </div>

        <form className="cr3-form" onSubmit={handleSubmit}>
            <div className="cr3-uploads">
            {requirements.map(({ id, label, description, content }) => (
                <div key={id} className="cr3-upload-group">
                <label className="cr3-upload-label">
                    <span className="cr3-label-row">
                      {label}
                      <span className="cr3-required">*</span>
                      <Info content={content} />
                  </span>
                </label>
                <p className="cr3-upload-desc">{description}</p> 
                
                <div className="cr3-file-input-wrapper">
                    <input
                    type="file"
                    id={id}
                    className="cr3-file-input"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => handleFileChange(e, id)}
                    disabled={isSubmitting}
                    />
                    <label htmlFor={id} className={`cr3-file-label ${files[id] ? 'has-file' : ''}`}>
                    {files[id] ? (
                        <>
                        <i className="cr3-file-icon ti ti-check"></i>
                        <span className="cr3-file-name">{files[id].name}</span>
                        </>
                    ) : (
                        <>
                        <i className="cr3-file-icon ti ti-upload"></i>
                        <span>Choose file</span>
                        </>
                    )}
                    </label>
                </div>
                
                {errors[id] && (
                    <span className="cr3-error">{errors[id]}</span>
                )}
                </div>
            ))}
            </div>

            <div className="cr3-actions-wrap">
              {/* => Error banner — only shown after a failed submit attempt */}
              {showBanner && Object.values(files).some(f => !f) && (
                <div className="cr3-error-banner">
                  <i className="ti ti-alert-circle" aria-hidden="true" />
                  Please upload all required documents before submitting.
                </div>
              )}

              <div className="cr3-actions">
                <button 
                  type="button" 
                  className="cr3-btn cr3-btn-back"
                  onClick={onBack}
                  disabled={isSubmitting}
                >
                  <i className="ti ti-arrow-left"></i>
                  Back
                </button>
                <button 
                  type="submit" 
                  className="cr3-btn cr3-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="ti ti-loader-2 cr3-spinner"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Enrollment
                      <i className="ti ti-send"></i>
                    </>
                  )}
                </button>
              </div>
            </div>

        </form>
        </div>
    </div>
  );
};

export default CourseRequirements3;