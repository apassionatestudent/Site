import { useState } from 'react';
import './Enroll.css';

const courseOptions = [
  'Food & Beverage Service',
  'Housekeeping Operations',
  'Front Office Management',
  'Culinary Arts',
  'Hotel Management',
  'Events Management',
];

export default function Enroll() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', course: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect to backend API
    setSubmitted(true);
  };

  return (
    <main className="enroll">
      <section className="enroll-hero">
        <span className="enroll-tag">Enrollment</span>
        <h1>Start Your Journey</h1>
        <p>Fill out the form below and our team will get back to you within 24 hours.</p>
      </section>

      <section className="enroll-body">
        {submitted ? (
          <div className="enroll-success">
            <div className="success-icon">✅</div>
            <h2>Application Received!</h2>
            <p>Thank you for your interest. We'll contact you shortly.</p>
            <button onClick={() => setSubmitted(false)} className="btn-primary">Submit Another</button>
          </div>
        ) : (
          <form className="enroll-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="juan@email.com" required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+63 9XX XXX XXXX" required />
            </div>
            <div className="form-group">
              <label>Course of Interest</label>
              <select name="course" value={form.course} onChange={handleChange} required>
                <option value="">Select a course...</option>
                {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Message (Optional)</label>
              <textarea name="message" value={form.message} onChange={handleChange} placeholder="Any questions or additional info..." rows={4} />
            </div>
            <button type="submit" className="btn-primary enroll-submit">Submit Application</button>
          </form>
        )}
      </section>
    </main>
  );
}
