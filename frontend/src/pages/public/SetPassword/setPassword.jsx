import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosStudent from '../../../utils/axiosStudent.js';
import './setPassword.css';

import EyeIcon from '../../../assets/icons/eye.png';
import EyeOffIcon from '../../../assets/icons/eye-off.png';
import SuccessIcon from '../../../assets/icons/success.png';
import WarningIcon from '../../../assets/icons/warning.png';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDone, setIsDone] = useState(false);

  // => No token in the URL at all - nothing to submit, show the error
  // => state immediately without ever calling the backend
  const missingToken = !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // => Mirrors the 8-character minimum enforced server-side in setPassword
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await axiosStudent.post('/student-auth/set-password', { token, password });
      setIsDone(true);
    } catch (err) {
      // => Backend returns 'invalid or expired' here if the 10-minute
      // => window already passed or the link was already used
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
            <span className="setpass-hint">At least 8 characters.</span>
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

          {error && <p className="setpass-error">{error}</p>}

          <button type="submit" className="setpass-submit" disabled={isLoading}>
            {isLoading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>
    </main>
  );
}