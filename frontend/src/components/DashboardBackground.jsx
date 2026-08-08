import React from 'react';
import { AnimatedGradient } from './ui/AnimatedGradient.jsx';

const dashboardGradientConfig = {
  preset: 'custom',
  color1: '#020617',
  color2: '#11104a',
  color3: '#4c1d95',
  distortion: 24,
  proportion: 58,
  rotation: -32,
  scale: 0.56,
  shape: 'Edge',
  shapeSize: 48,
  speed: 10,
  swirl: 68,
};

const dashboardNoiseConfig = { opacity: 0.28, scale: 0.8 };

export const DashboardBackground = React.memo(function DashboardBackground() {
  return (
    <div className="dashboard-background" aria-hidden="true">
      <AnimatedGradient
        className="dashboard-gradient-layer"
        config={dashboardGradientConfig}
        noise={dashboardNoiseConfig}
      />
      <div className="dashboard-pattern-layer" />
    </div>
  );
});
