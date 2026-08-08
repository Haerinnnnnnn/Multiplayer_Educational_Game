import React, { useEffect, useState } from 'react';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { AppFrame } from '../components/Layout.jsx';
import { settleSessionExperience } from '../services/experienceService.js';

export function SessionResultsPage({ activeSession, currentUser, onBack, onExperienceSettled }) {
  const [experienceLogs, setExperienceLogs] = useState([]);
  const [experienceError, setExperienceError] = useState('');
  const [settlingExperience, setSettlingExperience] = useState(false);

  useEffect(() => {
    let active = true;

    async function settleExperience() {
      if (!activeSession?.id || activeSession.status !== 'ended') {
        return;
      }

      setSettlingExperience(true);
      setExperienceError('');

      try {
        const logs = await settleSessionExperience(activeSession.id);

        if (!active) {
          return;
        }

        setExperienceLogs(logs);
        onExperienceSettled?.(logs);
      } catch (error) {
        if (active) {
          setExperienceError(error.message);
        }
      } finally {
        if (active) {
          setSettlingExperience(false);
        }
      }
    }

    settleExperience();

    return () => {
      active = false;
    };
  }, [activeSession?.id, activeSession?.status, onExperienceSettled]);

  return (
    <AppFrame title="Result" onHome={onBack}>
      <ResultsPanel
        currentUser={currentUser}
        experienceError={experienceError}
        experienceLogs={experienceLogs}
        settlingExperience={settlingExperience}
        session={activeSession}
      />
    </AppFrame>
  );
}
