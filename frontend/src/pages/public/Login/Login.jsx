import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // => clear previous errors on each attempt

    try {
      // => username in the backend maps to email in the frontend form
      await axios.post(
        'http://localhost:5000/api/student-auth/login',
        { username: form.email, password: form.password },
        { withCredentials: true } // => required so the cookie is saved in the browser
      );

      // => redirect to dashboard on successful login
      localStorage.setItem('isLoggedIn', 'true');

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
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="login-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

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