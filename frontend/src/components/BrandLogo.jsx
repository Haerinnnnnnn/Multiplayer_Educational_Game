import React from 'react';
import obitzLogo from '../assets/obitz-logo.png';

export function BrandLogo({ className = '', showName = true, subtitle = '' }) {
  return (
    <div className={`brand-logo ${className}`}>
      <img alt="O bitz logo" src={obitzLogo} />
      {showName && (
        <div>
          <strong>O bitz</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
