import React, { useEffect } from 'react';
import { LoadingScreen } from '../components/LoadingScreen.jsx';

export function SessionSummaryLoadingPage({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <LoadingScreen
      eyebrow="Session Ended"
      message="Please wait while the final ranking and participation summary are prepared."
      status="Building Result"
      title="Summarising the result"
      variant="summary"
    />
  );
}
