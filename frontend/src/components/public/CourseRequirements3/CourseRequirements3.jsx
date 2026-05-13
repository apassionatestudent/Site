import React, { useState, useCallback } from 'react';
import './CourseRequirements3.css';

// => Info tooltip component used for additional explanations in the form
import Info from '../../../components/Info.jsx';

const CourseRequirements3 = ({ onBack, onSubmit }) => {
  const [files, setFiles] = useState({
    birthCert: null,
    schoolDoc: null,
    validId: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const error = validateFile(file, field);
    
    setFiles(prev => ({
      ...prev,
      [field]: file
    }));
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all files
    const newErrors = {};
    Object.keys(files).forEach(field => {
      const error = validateFile(files[field], field);
      if (error) newErrors[field] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    // => Simulate form submission for now
    try {
      // => typically upload files to your backend
      console.log('Submitting files:', files);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      onSubmit?.();
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
                disabled={isSubmitting || Object.keys(errors).length > 0}
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
        </form>
        </div>
    </div>
  );
};

export default CourseRequirements3;