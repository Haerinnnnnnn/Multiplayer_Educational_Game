import React, { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { Feedback } from '../components/Common.jsx';
import { CenteredScreen } from '../components/Layout.jsx';
import { getLatestBirthdayForAge, validateMinimumAge } from '../utils/ageValidation.js';

export function TeacherRegisterPage({ feedback, onBack, onRegister }) {
  const [ageError, setAgeError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birthday: '',
    schoolName: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = validateMinimumAge(form.birthday, 18, 'Teacher');
    setAgeError(validationError);

    if (!validationError) {
      onRegister(event, form);
    }
  };

  return (
    <CenteredScreen withBackground>
      <section className="login-panel wide-auth-panel">
        <BrandLogo className="auth-brand-logo" subtitle="Teacher Account" />
        <h1>Teacher Register</h1>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Enter teacher name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="teacher@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Create password"
            />
          </label>
          <label>
            Birthday
            <input
              type="date"
              max={getLatestBirthdayForAge(18)}
              value={form.birthday}
              onChange={(event) => {
                setAgeError('');
                setForm({ ...form, birthday: event.target.value });
              }}
            />
          </label>
          <label>
            School
            <input
              value={form.schoolName}
              onChange={(event) => setForm({ ...form, schoolName: event.target.value })}
              placeholder="What school does the teacher work at?"
            />
          </label>
          <button className="primary-button" type="submit">
            Create Teacher Account
          </button>
        </form>
        <Feedback text={ageError || feedback} />
        <button className="link-button auth-back-link" type="button" onClick={onBack}>
          Back to Login
        </button>
      </section>
    </CenteredScreen>
  );
}
