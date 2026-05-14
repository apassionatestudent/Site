import React, { useState } from 'react';

const Account = () => {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '',
  });

  const [password, setPassword] = useState({
    current: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPassword((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    console.log('Profile updated:', profile);
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    console.log('Password change requested:', password);
  };

  return (
    <main className="account-page">
      <header className="account-header">
        <h1>Account Settings</h1>
        <p>Update your personal information and change your password.</p>
      </header>

      <section className="account-section">
        <h2>Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="account-form">
          <label>
            First Name
            <input
              type="text"
              name="firstName"
              value={profile.firstName}
              onChange={handleProfileChange}
              required
            />
          </label>

          <label>
            Last Name
            <input
              type="text"
              name="lastName"
              value={profile.lastName}
              onChange={handleProfileChange}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
              required
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleProfileChange}
            />
          </label>

          <button type="submit">Save Profile</button>
        </form>
      </section>

      <section className="account-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="account-form">
          <label>
            Current Password
            <input
              type="password"
              name="current"
              value={password.current}
              onChange={handlePasswordChange}
              required
            />
          </label>

          <label>
            New Password
            <input
              type="password"
              name="newPassword"
              value={password.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>

          <label>
            Confirm New Password
            <input
              type="password"
              name="confirmPassword"
              value={password.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>

          <button type="submit">Change Password</button>
        </form>
      </section>
    </main>
  );
};

export default Account;
