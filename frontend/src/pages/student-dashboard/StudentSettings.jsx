import React from 'react';
import { ChangePasswordForm } from '../../components/ChangePasswordForm.jsx';
import { ProfileDetailsForm } from '../../components/ProfileDetailsForm.jsx';

export function StudentSettings({ onUpdateProfile, student }) {
  return (
    <section className="student-settings-grid student-dashboard-panel-in">
      <div className="student-profile-card">
        <h2>Settings</h2>
        <dl className="profile-list">
          <div><dt>Name</dt><dd>{student?.name || '-'}</dd></div>
          <div><dt>Student ID</dt><dd>{student?.userCode || student?.systemId || '-'}</dd></div>
          <div><dt>Email</dt><dd>{student?.email || '-'}</dd></div>
          <div><dt>School</dt><dd>{student?.schoolName || '-'}</dd></div>
        </dl>
      </div>
      <div className="student-profile-card"><ProfileDetailsForm user={student} onUpdateProfile={onUpdateProfile} /></div>
      <div className="student-profile-card"><ChangePasswordForm /></div>
    </section>
  );
}
