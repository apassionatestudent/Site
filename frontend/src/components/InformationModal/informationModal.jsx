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

// => Shown when the student had no open batch/class to choose from at
// => all and explicitly picked "Reserve a Slot" themselves on the form -
// => distinct from RESERVED_DOWNGRADED_STEPS below, since here the
// => student's own selection genuinely was Reserve, not a batch that
// => later turned out to be full.
const RESERVED_EXPLICIT_STEPS = [
  {
    icon: mailIcon,
    text: 'Check your email inbox (and spam folder) for a confirmation message containing your Student Dashboard login credentials in which requires you to setup up a password. If you\'re unable to set up the password within 10 minutes, please submit a ticket or call our office.',
  },
  {
    icon: clockIcon,
    text: 'Your enrollment is currently Reserved. There is no open batch/class available for your selection yet. You will be automatically notified by email once one becomes available.',
  },
  {
    icon: fileIcon,
    text: 'Keep your original documents on hand. You may be asked to present them on-site for verification once you are placed into a batch.',
  },
];

// => Shown when the student picked a real, open batch, but the server's
// => capacity recheck at submit time found it had filled up in the
// => meantime (the graceful fallback in insertTesdaEnrollment/
// => insertShsEnrollment) - wording here specifically acknowledges the
// => batch they picked, unlike the explicit-Reserve case above.
const RESERVED_DOWNGRADED_STEPS = [
  {
    icon: mailIcon,
    text: 'Check your email inbox (and spam folder) for a confirmation message containing your Student Dashboard login credentials in which requires you to setup up a password. If you\'re unable to set up the password within 10 minutes, please submit a ticket or call our office.',
  },
  {
    icon: clockIcon,
    text: 'The batch you selected filled up just before your enrollment was processed, so your enrollment has been placed on our Reserve list instead. You will be automatically notified by email once a new batch opens up.',
  },
  {
    icon: fileIcon,
    text: 'Keep your original documents on hand. You may be asked to present them on-site for verification once you are placed into a batch.',
  },
];

// => Content sets keyed by variant - 'pending' matches the original
// => hardcoded defaults exactly, so any existing caller that passes no
// => variant/title/message/steps keeps behaving identically to before.
const VARIANT_CONTENT = {
  pending: {
    title: 'Enrollment Submitted',
    message: 'Your enrollment form has been received. Please review the next steps below before closing this window.',
    steps: DEFAULT_STEPS,
  },
  'reserved-explicit': {
    title: 'Enrollment Received - You\'re on the Reserve List',
    message: 'There is currently no open batch/class available for your selection, so your enrollment has been placed on our Reserve list. You will be placed into a batch and notified as soon as one becomes available.',
    steps: RESERVED_EXPLICIT_STEPS,
  },
  'reserved-downgraded': {
    title: 'Enrollment Received - You\'re on the Reserve List',
    message: 'The batch you selected just filled up before your enrollment could be processed, so your enrollment has been placed on our Reserve list instead. You will be placed into a batch and notified as soon as one becomes available.',
    steps: RESERVED_DOWNGRADED_STEPS,
  },
};

const CLOSE_DELAY_SECONDS = 5;

// => Generic post-submission instructions modal. Close controls (both the
// => header X and the footer button) stay disabled until the countdown
// => reaches 0, forcing the user to spend a minimum amount of time on the
// => screen before they can dismiss it.
const InformationModal = ({
  isOpen,
  onClose,
  // => Picks which default content set to show - 'pending' (the original
  // => default) or 'reserved'. Explicit title/message/steps props, if
  // => ever passed, still override the variant's defaults below.
  variant = 'pending',
  title,
  message,
  steps,
  closeDelay = CLOSE_DELAY_SECONDS,
}) => {
  const content = VARIANT_CONTENT[variant] || VARIANT_CONTENT.pending;
  const resolvedTitle = title ?? content.title;
  const resolvedMessage = message ?? content.message;
  const resolvedSteps = steps ?? content.steps;

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
          <h2 className="im-title">{resolvedTitle}</h2>
          <p className="im-message">{resolvedMessage}</p>

          <ul className="im-steps-list">
            {resolvedSteps.map((step, index) => (
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