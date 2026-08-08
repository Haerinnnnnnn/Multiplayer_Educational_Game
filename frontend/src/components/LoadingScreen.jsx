import React from 'react';
import { BrandLogo } from './BrandLogo.jsx';
import { CenteredScreen } from './Layout.jsx';

export function LoadingScreen({
  eyebrow = 'Loading',
  title,
  message,
  status = 'Working',
  variant = 'default',
}) {
  return (
    <CenteredScreen withBackground>
      <section className={`loading-screen-panel loading-screen-panel-${variant}`}>
        <div className="loading-brand-row">
          <BrandLogo className="loading-brand-logo" subtitle="Learning System" />
        </div>

        <div className="loading-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {message && <p className="intro-text">{message}</p>}

        <div className="loading-progress-track" aria-hidden="true">
          <div className="loading-progress-fill" />
        </div>
        <p className="loading-status">{status}</p>
      </section>
    </CenteredScreen>
  );
}
