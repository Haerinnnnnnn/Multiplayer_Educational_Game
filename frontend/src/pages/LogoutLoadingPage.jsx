import React from 'react';
import { LoadingScreen } from '../components/LoadingScreen.jsx';

export function LogoutLoadingPage() {
  return (
    <LoadingScreen
      eyebrow="Signing Out"
      message="Please wait while we finish signing you out."
      status="Returning to Start"
      title="Bringing you back to the start page"
      variant="logout"
    />
  );
}
