import React, { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { Feedback } from '../components/Common.jsx';
import { CenteredScreen } from '../components/Layout.jsx';

export function TeacherRegisterPage({ feedback, onBack, onRegister }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birthday: '',
    schoolName: '',
  });

  return (
    <CenteredScreen withBackground>
      <section className="login-panel wide-auth-panel">
        <BrandLogo className="auth-brand-logo" subtitle="Teacher Account" />
        <h1>Teacher Register</h1>
        <form className="form-grid" onSubmit={(event) => onRegister(event, form)}>
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
              value={form.birthday}
              onChange={(event) => setForm({ ...form, birthday: event.target.value })}
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
        <Feedback text={feedback} />
        <button className="link-button auth-back-link" type="button" onClick={onBack}>
          Back to Login
        </button>
      </section>
    </CenteredScreen>
  );
}
