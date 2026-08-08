import React from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { CenteredScreen } from '../components/Layout.jsx';

export function RoleSelectionPage({ onTeacher, onStudent, onAdmin, onLogin }) {
  return (
    <CenteredScreen withBackground>
      <section className="role-panel">
        <BrandLogo className="auth-brand-logo" subtitle="Choose role" />
        <h1>Continue As</h1>
        <div className="role-grid">
          <button type="button" onClick={onTeacher}>
            Teacher / Host
          </button>
          <button type="button" onClick={onStudent}>
            Student
          </button>
          <button type="button" onClick={onAdmin}>
            Admin
          </button>
        </div>
        <button className="link-button auth-back-link" type="button" onClick={onLogin}>
          Back to Login
        </button>
      </section>
    </CenteredScreen>
  );
}
