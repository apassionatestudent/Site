import React, { useState, useEffect } from "react";
import axiosStudent from "../../../utils/axiosStudent.js";
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Login.css';

import WarningIcon from '../../../assets/icons/warning.png';
import EyeIcon from '../../../assets/icons/eye.png';
import EyeOffIcon from '../../../assets/icons/eye-off.png';
// => same warning icon reused for the lockout banner, keeps the visual
// => language consistent with the Remember Me modal above
import LockIcon from '../../../assets/icons/lock.png';

export default function Login() {
  const navigate = useNavigate();

  // => Login form state
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  // => Tracks loading state to disable button while request is in flight
  const [isLoading, setIsLoading] = useState(false);

  // => error state removed - backend error messages now show as toasts
  // => instead of stretching the card with inline text, lockout still
  // => uses its own persistent banner below since it needs a live countdown

  // => Remember Me: if true, persist login across browser sessions via localStorage
  // => if false, login only lasts until the tab is closed via sessionStorage
  const [rememberMe, setRememberMe] = useState(false);

  // => Controls visibility of the Remember Me warning modal
  const [showRememberModal, setShowRememberModal] = useState(false);

  // => Toggles whether the password field shows plain text or dots
  const [showPassword, setShowPassword] = useState(false);

  // => Holds the lockout expiry timestamp returned by the backend, null
  // => means the account is not currently locked
  const [lockedUntil, setLockedUntil] = useState(null);

  // => Formatted mm:ss string shown to the student, recalculated every
  // => second while lockedUntil is set
  const [countdownText, setCountdownText] = useState('');

  // => Ticks the countdown display every second and clears the lockout
  // => once time runs out, re-enabling the form automatically. This is
  // => purely cosmetic, the actual enforcement always happens server-side
  // => on the next real login attempt regardless of this timer
  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => {
      const msLeft = new Date(lockedUntil) - new Date();

      if (msLeft <= 0) {
        setLockedUntil(null);
        setCountdownText('');
        return;
      }

      const totalSeconds = Math.ceil(msLeft / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setCountdownText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [lockedUntil]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

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
      const backendMessage = err.response?.data?.message || 'Something went wrong. Please try again.';

      // => if the backend flagged a lockout, capture the expiry so the
      // => countdown banner takes over instead of a toast, since the
      // => countdown needs to stay visible for the full duration
      if (err.response?.data?.lockedUntil) {
        setLockedUntil(err.response.data.lockedUntil);
      } else {
        // => everything else (invalid credentials, rate limit, deactivated
        // => account) shows as a toast instead of stretching the card
        toast.error(backendMessage);
      }
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

          {/* => lockout banner only, all other errors now show as toasts */}
          {/* => title kept generic on purpose, does not say "account
                 locked" so this stays indistinguishable from plain rate
                 limiting to anyone poking at the form */}
          {lockedUntil && (
            <div className="login-lockout-banner">
              <img src={LockIcon} alt="" className="login-lockout-icon" />
              <div>
                <p className="login-lockout-title">Too many requests</p>
                <p className="login-lockout-timer">Please wait {countdownText} before trying again</p>
              </div>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={isLoading || !!lockedUntil}>
            {lockedUntil ? 'Account Locked' : isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/enroll">Enroll now</Link>
        </p>
      </div>
    </main>
  );
}