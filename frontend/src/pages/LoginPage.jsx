import React from 'react';
import { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { Feedback } from '../components/Common.jsx';
import { CenteredScreen } from '../components/Layout.jsx';

export function LoginPage({ feedback, onLogin, onStudentRegister, onTeacherRegister }) {
  const [form, setForm] = useState({ email: '', password: '' });

  return (
    <CenteredScreen withBackground>
      <section className="login-panel">
        <BrandLogo className="auth-brand-logo" subtitle="Learning System" />
        <h1>Login</h1>
        <form className="form-grid" onSubmit={(event) => onLogin(event, form)}>
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
              placeholder="Enter password"
            />
          </label>
          <button className="primary-button" type="submit">
            Login
          </button>
        </form>
        <Feedback text={feedback} />
        <div className="auth-links">
          <button className="link-button" type="button" onClick={onStudentRegister}>
            Register as Student
          </button>
          <button className="link-button" type="button" onClick={onTeacherRegister}>
            Register as Teacher
          </button>
        </div>
      </section>
    </CenteredScreen>
  );
}
