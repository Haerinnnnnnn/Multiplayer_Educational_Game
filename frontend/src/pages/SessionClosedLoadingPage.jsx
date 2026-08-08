import React, { useEffect } from 'react';
import { LoadingScreen } from '../components/LoadingScreen.jsx';

export function SessionClosedLoadingPage({ eyebrow = 'Room Closed', message, onDone, title }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <LoadingScreen
      eyebrow={eyebrow}
      message={message}
      status="Redirecting"
      title={title}
      variant="session"
    />
  );
}
