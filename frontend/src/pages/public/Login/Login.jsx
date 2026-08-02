import React, { useState } from "react";
import axiosStudent from "../../../utils/axiosStudent.js";
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

import WarningIcon from '../../../assets/icons/warning.png';
import EyeIcon from '../../../assets/icons/eye.png';
import EyeOffIcon from '../../../assets/icons/eye-off.png';

export default function Login() {
  const navigate = useNavigate();

  // => Login form state
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  // => Tracks loading state to disable button while request is in flight
  const [isLoading, setIsLoading] = useState(false);

  // => Holds error message returned from the backend
  const [error, setError] = useState(null);

  // => Remember Me: if true, persist login across browser sessions via localStorage
  // => if false, login only lasts until the tab is closed via sessionStorage
  const [rememberMe, setRememberMe] = useState(false);

  // => Controls visibility of the Remember Me warning modal
  const [showRememberModal, setShowRememberModal] = useState(false);

  // => Toggles whether the password field shows plain text or dots
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // => clear previous errors on each attempt

    try {
      // => username in the backend maps to email in the frontend form
      const { data } = await axiosStudent.post(
        '/student-auth/login',
        { username: form.email, password: form.password, rememberMe }
      );

      // => if rememberMe is checked, persist the flag AND the CSRF token
      // => across browser sessions; if not, sessionStorage clears both
      // => when the tab is closed - keeps the two in sync so a mutation
      // => never fails while the student still appears logged in
      if (rememberMe) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('csrfToken', data.csrfToken);
      } else {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('csrfToken', data.csrfToken);
      }

      // => redirect to dashboard on successful login
      navigate('/dashboard');

    } catch (err) {
      // => show the error message returned from the backend
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-header">
          <span className="login-tag">Portal</span>
          <h1>Welcome Back</h1>
          <p>Sign in to your student account</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="juan@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            {/* => wrapper needed so the eye icon can sit inside the input visually */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                // => prevents this button from submitting the form
                tabIndex={-1}
              >
                <img
                  src={showPassword ? EyeOffIcon : EyeIcon}
                  alt={showPassword ? "Hide password" : "Show password"}
                  className="password-toggle-icon"
                />
              </button>
            </div>
          </div>

          <div className="login-forgot">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  // => if the user is checking it (not unchecking), show the warning modal first
                  // => if unchecking, just uncheck directly without showing the modal
                  if (e.target.checked) {
                    setShowRememberModal(true);
                  } else {
                    setRememberMe(false);
                  }
                }}
              />
              Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {/* => Remember Me warning modal */}
          {showRememberModal && (
            <div className="remember-modal-overlay">
              <div className="remember-modal">
                <div className="remember-modal-icon">
                  <img src={WarningIcon} alt="Warning" className="remember-modal-icon-img" />
                </div>
                <h3>Are you on a private device?</h3>
                <p>
                  Enabling <strong>'Remember Me'</strong> keeps you logged in even after closing the browser.
                  This is convenient on your personal phone or computer, but <strong>poses a serious risk
                  on shared or public devices</strong> which means anyone who uses this device after you could
                  access your account without a password.
                </p>
                <p className="remember-modal-advice">
                  Only enable this if you personally own or exclusively use this device.
                </p>
                <div className="remember-modal-actions">
                  <button
                    className="remember-modal-btn remember-modal-btn--confirm"
                    onClick={() => {
                      // => user confirmed they're on a private device, enable remember me
                      setRememberMe(true);
                      setShowRememberModal(false);
                    }}
                  >
                    Yes, this is my private device
                  </button>
                  <button
                    className="remember-modal-btn remember-modal-btn--cancel"
                    onClick={() => {
                      // => user cancelled, keep remember me unchecked
                      setRememberMe(false);
                      setShowRememberModal(false);
                    }}
                  >
                    No, keep me safe
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* => shows backend error messages such as invalid credentials or deactivated account */}
          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/enroll">Enroll now</Link>
        </p>
      </div>
    </main>
  );
}