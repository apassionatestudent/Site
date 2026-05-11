import { useState } from 'react';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect to backend auth API
    console.log('Login attempted:', form.email);
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
            <a href="#">Forgot password?</a>
          </div>
          <button type="submit" className="login-btn">Sign In</button>
        </form>

        <p className="login-footer">
          Don't have an account? <a href="/enroll">Enroll now</a>
        </p>
      </div>
    </main>
  );
}
