import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosStudent from '../../../utils/axiosStudent.js';
import './setPassword.css';

import EyeIcon from '../../../assets/icons/eye.png';
import EyeOffIcon from '../../../assets/icons/eye-off.png';
import SuccessIcon from '../../../assets/icons/success.png';
import WarningIcon from '../../../assets/icons/warning.png';
import CheckIcon from '../../../assets/icons/checkmark.png';
import CircleIcon from '../../../assets/icons/circle.png';

// => Same 4 rules enforced server-side in passwordTokenService.js -
// => keep both lists in sync if the rule set ever changes
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const allRulesMet = PASSWORD_RULES.every(rule => rule.test(password));
  const passwordsMatch = password && password === confirmPassword;

  // => No token in the URL at all - nothing to submit, show the error
  // => state immediately without ever calling the backend
  const missingToken = !token;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // => Mirrors the full rule set enforced server-side in
    // => passwordTokenService.js validatePasswordStrength
    if (!allRulesMet) {
      toast.error('Password does not meet the requirements below.');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await axiosStudent.post('/student-auth/set-password', { token, password });
      setIsDone(true);
    } catch (err) {
      // => Backend returns 'invalid or expired' here if the 10-minute
      // => window already passed or the link was already used
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // => Success state - password was set, point the student to Login
  if (isDone) {
    return (
      <main className="setpass">
        <div className="setpass-card">
          <img src={SuccessIcon} alt="Success" className="setpass-icon" />
          <h1>Password Set</h1>
          <p>Your password has been set successfully. You may now log in to your dashboard.</p>
          <Link to="/login" className="setpass-btn">Go to Login</Link>
        </div>
      </main>
    );
  }

  // => No token present in the URL - separate from a backend-rejected
  // => token, since this case never even reaches the API
  if (missingToken) {
    return (
      <main className="setpass">
        <div className="setpass-card">
          <img src={WarningIcon} alt="Warning" className="setpass-icon" />
          <h1>Invalid Link</h1>
          <p>This password setup link is missing or malformed. Please check the link in your email, or submit a support ticket if you need a new one sent.</p>
          <Link to="/login" className="setpass-btn setpass-btn--secondary">Back to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="setpass">
      <div className="setpass-card">
        <div className="setpass-header">
          <span className="setpass-tag">Account Setup</span>
          <h1>Set Your Password</h1>
          <p>Choose a password to finish setting up your student dashboard access.</p>
        </div>

        <form className="setpass-form" onSubmit={handleSubmit}>
          <div className="setpass-field-group">
            <label>New Password</label>
            <div className="setpass-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="setpass-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                <img
                  src={showPassword ? EyeOffIcon : EyeIcon}
                  alt={showPassword ? 'Hide password' : 'Show password'}
                  className="setpass-password-icon"
                />
              </button>
            </div>
            {/* => Live checklist, ticks off each rule in real time as the student types */}
            <ul className="setpass-password-rules">
              {PASSWORD_RULES.map(rule => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className={met ? 'setpass-rule-met' : ''}>
                    <img
                      src={met ? CheckIcon : CircleIcon}
                      alt=""
                      className="setpass-rule-icon"
                    />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="setpass-field-group">
            <label>Confirm Password</label>
            <div className="setpass-password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="setpass-password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                tabIndex={-1}
              >
                <img
                  src={showConfirmPassword ? EyeOffIcon : EyeIcon}
                  alt={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="setpass-password-icon"
                />
              </button>
            </div>
          </div>

          <button type="submit" className="setpass-submit" disabled={isLoading}>
            {isLoading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </main>
  );
}