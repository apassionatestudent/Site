import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosStudent from '../../../utils/axiosStudent.js';
import './forgotPassword.css';

import EmailIcon from '../../../assets/icons/email.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      // => Backend always returns the same generic message whether or not
      // => the email exists, so this response is safe to show as-is
      const { data } = await axiosStudent.post('/student-auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="fp">
      <div className="fp-card">
        <div className="fp-header">
          <span className="fp-tag">Account Recovery</span>
          <h1>Forgot Password</h1>
          <p>Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {message ? (
          <div className="fp-success">
            <img src={EmailIcon} alt="Email sent" className="fp-success-icon" />
            <p>{message}</p>
          </div>
        ) : (
          <form className="fp-form" onSubmit={handleSubmit}>
            <div className="fp-field-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@email.com"
                required
              />
            </div>

            {error && <p className="fp-error">{error}</p>}

            <button type="submit" className="fp-submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="fp-footer">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </main>
  );
}