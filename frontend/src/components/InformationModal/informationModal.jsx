import React, { useState, useEffect, useCallback } from 'react';
import './informationModal.css';

// => Real PNG icon imports - swap these paths for your actual asset files.
// => Suggested source per your thesis tooling: Icons8
import closeIcon from '../../assets/icons/close.png';
import checkIcon from '../../assets/icons/success.png';
import mailIcon from '../../assets/icons/email.png';
import clockIcon from '../../assets/icons/clock.png';
import fileIcon from '../../assets/icons/file-document.png';

// => Mockup "next steps" content - replace with the actual copy once finalized
const DEFAULT_STEPS = [
  {
    icon: mailIcon,
    text: 'Check your email inbox (and spam folder) for a confirmation message containing your Student Dashboard login credentials in which requires you to setup up a password.If you\'re unable to set up the password within 10 minutes, please submit a ticket or call our office.',
  },
  {
    icon: clockIcon,
    text: 'Your enrollment is now Pending. Our staff will review your information and documents within 2 to 3 business days.',
  },
  {
    icon: fileIcon,
    text: 'Keep your original documents on hand. You may be asked to present them on-site for verification before approval.',
  },
];

const CLOSE_DELAY_SECONDS = 5;

// => Generic post-submission instructions modal. Close controls (both the
// => header X and the footer button) stay disabled until the countdown
// => reaches 0, forcing the user to spend a minimum amount of time on the
// => screen before they can dismiss it.
const InformationModal = ({
  isOpen,
  onClose,
  title = 'Enrollment Submitted',
  message = 'Your enrollment form has been received. Please review the next steps below before closing this window.',
  steps = DEFAULT_STEPS,
  closeDelay = CLOSE_DELAY_SECONDS,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(closeDelay);

  // => Restart the countdown every time the modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSecondsLeft(closeDelay);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, closeDelay]);

  // => Lock page scroll while the modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  const canClose = secondsLeft <= 0;

  // => Backdrop click only closes once the delay has passed
  const handleBackdropClick = useCallback(() => {
    if (canClose) onClose();
  }, [canClose, onClose]);

  if (!isOpen) return null;

  return (
    <div className="im-backdrop" onClick={handleBackdropClick}>
      {/* => stopPropagation so clicking inside the card doesn't trigger the backdrop close */}
      <div className="im-card" onClick={(e) => e.stopPropagation()}>

        <div className="im-header">
          <div className="im-header-icon">
            <img src={checkIcon} alt="" className="im-icon-img" />
          </div>
          <button
            type="button"
            className="im-close-btn"
            onClick={onClose}
            disabled={!canClose}
            title={canClose ? 'Close' : `Please wait ${secondsLeft}s`}
          >
            {canClose
              ? <img src={closeIcon} alt="Close" className="im-close-icon" />
              : <span className="im-close-countdown">{secondsLeft}</span>
            }
          </button>
        </div>

        <div className="im-body">
          <h2 className="im-title">{title}</h2>
          <p className="im-message">{message}</p>

          <ul className="im-steps-list">
            {steps.map((step, index) => (
              <li key={index} className="im-step">
                <span className="im-step-icon">
                  <img src={step.icon} alt="" className="im-icon-img" />
                </span>
                <span className="im-step-text">{step.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="im-footer">
          <button
            type="button"
            className="im-btn-primary"
            onClick={onClose}
            disabled={!canClose}
          >
            {canClose ? 'Got it, close this' : `Please read (${secondsLeft}s)`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default InformationModal;