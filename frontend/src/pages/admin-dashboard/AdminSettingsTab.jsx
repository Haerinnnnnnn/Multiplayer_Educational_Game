import React from 'react';
import { getInitial } from './adminDashboardHelpers.js';

export function AdminSettingsTab({ currentUser }) {
  return (
    <section className="admin-settings-layout admin-dashboard-panel-in">
      <div className="admin-settings-hero">
        <div className="admin-settings-avatar" aria-hidden="true">
          {getInitial(currentUser?.name)}
        </div>
        <div>
          <p className="eyebrow">Admin Settings</p>
          <h2>{currentUser?.name || 'System Admin'}</h2>
          <p>Manage your O bitz admin profile and review your access level.</p>
        </div>
        <span className="admin-settings-role-pill">Administrator</span>
      </div>

      <div className="admin-settings-grid">
        <section className="admin-profile-panel">
          <h3>Profile Details</h3>
          <dl className="profile-list">
            <div>
              <dt>Name</dt>
              <dd>{currentUser?.name || '-'}</dd>
            </div>
            <div>
              <dt>Admin ID</dt>
              <dd>{currentUser?.userCode || '-'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{currentUser?.email || '-'}</dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{currentUser?.schoolName || '-'}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-profile-panel admin-access-panel">
          <h3>Access Summary</h3>
          <div className="admin-access-list">
            <div>
              <span>User Control</span>
              <strong>Enabled</strong>
            </div>
            <div>
              <span>Module Review</span>
              <strong>Enabled</strong>
            </div>
            <div>
              <span>Session Monitor</span>
              <strong>Enabled</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
