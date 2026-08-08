import React from 'react';
import { BrandLogo } from './BrandLogo.jsx';
import { DashboardBackground } from './DashboardBackground.jsx';

export function CenteredScreen({ children, withBackground = false }) {
  return (
    <main className={withBackground ? 'centered-screen auth-screen' : 'centered-screen'}>
      {withBackground && <DashboardBackground />}
      <div className="centered-screen-content">{children}</div>
    </main>
  );
}

export function AppFrame({ actions, homeLabel = 'Back', title, onHome, onLogout, children }) {
  return (
    <main className="app-frame">
      <DashboardBackground />
      <header className="topbar">
        <div>
          <BrandLogo className="topbar-brand-logo" subtitle="Learning System" />
          <h1>{title}</h1>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" type="button" onClick={onHome}>
            {homeLabel}
          </button>
          {actions}
          {onLogout && (
            <button className="secondary-button" type="button" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </header>
      <section className="content-stack">{children}</section>
    </main>
  );
}
