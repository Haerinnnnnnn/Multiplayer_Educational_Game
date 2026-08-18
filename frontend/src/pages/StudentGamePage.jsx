import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { GamePanel } from '../components/GamePanel.jsx';
import { AppFrame } from '../components/Layout.jsx';
import { GlassButton } from '../components/ui/GlassButton.jsx';

export function StudentGamePage({
  activeModule,
  activeSession,
  feedback,
  leaveConfirmOpen: controlledLeaveConfirmOpen,
  onBack,
  onClassicCompleted,
  onLeaveConfirmChange,
  onLeaveSession,
  onQrPairReady,
  onQrPairScan,
  onQrPairTimeout,
  onResults,
  onSubmitAnswer,
  student,
}) {
  const [localLeaveConfirmOpen, setLocalLeaveConfirmOpen] = useState(false);
  const leaveConfirmOpen = controlledLeaveConfirmOpen ?? localLeaveConfirmOpen;
  const setLeaveConfirmOpen = onLeaveConfirmChange || setLocalLeaveConfirmOpen;
  const isQrPairMatch = activeSession?.gameType === 'qr_pair_match';

  return (
    <AppFrame homeLabel="Leave Session" title="Student Game" onHome={() => {
      setLeaveConfirmOpen(true);
      onBack?.();
    }}>
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
      {leaveConfirmOpen &&
        createPortal(
          <div
            className="modal-backdrop waiting-leave-backdrop"
            role="presentation"
            onClick={() => setLeaveConfirmOpen(false)}
          >
            <section
              aria-modal="true"
              className="review-message-modal waiting-leave-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Leave Session</p>
              <div className="waiting-leave-icon" aria-hidden="true">!</div>
              <h2>{isQrPairMatch ? 'Leave QR Pair Match?' : 'Leave Game Session?'}</h2>
              <p>
                {isQrPairMatch
                  ? 'If you leave now, this QR Pair Match session will end for everyone and move to results.'
                  : 'Your unanswered questions will be recorded as 0 points and you will return to the student dashboard.'}
              </p>
              <div className="button-row">
                <GlassButton
                  className="waiting-leave-glass-button danger"
                  type="button"
                  onClick={() => {
                    setLeaveConfirmOpen(false);
                    onLeaveSession?.();
                  }}
                >
                  Yes, Leave
                </GlassButton>
                <GlassButton
                  className="waiting-leave-glass-button neutral"
                  type="button"
                  onClick={() => setLeaveConfirmOpen(false)}
                >
                  Stay
                </GlassButton>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </AppFrame>
  );
}
