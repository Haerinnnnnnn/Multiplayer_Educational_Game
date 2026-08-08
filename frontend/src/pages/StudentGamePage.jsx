import React from 'react';
import { GamePanel } from '../components/GamePanel.jsx';
import { AppFrame } from '../components/Layout.jsx';

export function StudentGamePage({
  activeModule,
  activeSession,
  feedback,
  onBack,
  onLogout,
  onClassicCompleted,
  onQrPairReady,
  onQrPairScan,
  onQrPairTimeout,
  onResults,
  onSubmitAnswer,
  student,
}) {
  return (
    <AppFrame title="Student Game" onHome={onBack} onLogout={onLogout}>
      <GamePanel
        session={activeSession}
        module={activeModule}
        student={student}
        feedback={feedback}
        onClassicCompleted={onClassicCompleted}
        onSubmit={onSubmitAnswer}
        onQrPairReady={onQrPairReady}
        onQrPairScan={onQrPairScan}
        onQrPairTimeout={onQrPairTimeout}
        onResults={onResults}
      />
    </AppFrame>
  );
}
