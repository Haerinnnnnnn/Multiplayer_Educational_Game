import React, { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { Feedback } from '../components/Common.jsx';
import { CenteredScreen } from '../components/Layout.jsx';

export function StudentRegisterPage({ feedback, onBack, onRegister }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birthday: '',
    schoolName: '',
    grade: '',
    course: '',
  });

  return (
    <CenteredScreen withBackground>
      <section className="login-panel wide-auth-panel">
        <BrandLogo className="auth-brand-logo" subtitle="Student Account" />
        <h1>Student Register</h1>
        <form className="form-grid" onSubmit={(event) => onRegister(event, form)}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Enter student name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="student@example.com"
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
              placeholder="What school does the student study at?"
            />
          </label>
          <label>
            Grade
            <input
              value={form.grade}
              onChange={(event) => setForm({ ...form, grade: event.target.value })}
              placeholder="Example: Year 2"
            />
          </label>
          <label>
            Course
            <input
              value={form.course}
              onChange={(event) => setForm({ ...form, course: event.target.value })}
              placeholder="Example: Software Engineering"
            />
          </label>
          <button className="primary-button" type="submit">
            Create Student Account
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
