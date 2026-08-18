import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameRulesHowItWorks } from '../components/GameRulesHowItWorks.jsx';
import { AppFrame } from '../components/Layout.jsx';
import { GlassButton } from '../components/ui/GlassButton.jsx';

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

export function StudentWaitingPage({
  currentSession,
  leaveConfirmOpen: controlledLeaveConfirmOpen,
  onLeaveConfirmChange,
  onLeaveSession,
  student,
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [localLeaveConfirmOpen, setLocalLeaveConfirmOpen] = useState(false);
  const leaveConfirmOpen = controlledLeaveConfirmOpen ?? localLeaveConfirmOpen;
  const setLeaveConfirmOpen = onLeaveConfirmChange || setLocalLeaveConfirmOpen;
  const gameTypeLabel = getGameTypeLabel(currentSession?.gameType);
  const gameType = useMemo(
    () => currentSession?.gameType || 'classic_mcq',
    [currentSession?.gameType]
  );

  return (
    <AppFrame homeLabel="Leave Session" title="Waiting Room" onHome={() => setLeaveConfirmOpen(true)}>
      <section className="panel waiting-panel">
        <p className="eyebrow">Joined</p>
        <h2>{student?.name}</h2>
        <span className={currentSession?.gameType === 'qr_pair_match' ? 'waiting-game-badge qr-pair' : 'waiting-game-badge classic'}>
          {gameTypeLabel}
        </span>
        <p>Waiting for teacher to start session {currentSession?.code}.</p>
        <div className="button-row waiting-room-actions">
          <button className="secondary-button" type="button" onClick={() => setRulesOpen(true)}>
            Show Rules
          </button>
        </div>
      </section>

      {rulesOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="waiting-rules-title"
            aria-modal="true"
            className="review-message-modal waiting-rules-modal"
            role="dialog"
          >
            <div className="review-message-header">
              <div>
                <p className="eyebrow">{gameTypeLabel}</p>
                <h2 id="waiting-rules-title">Game Rules</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setRulesOpen(false)}>
                Close
              </button>
            </div>
            <GameRulesHowItWorks gameType={gameType} />
          </section>
        </div>
      )}

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
              <h2>Leave This Waiting Room?</h2>
              <p>
                You will be removed from session {currentSession?.code || ''} and returned to the
                student dashboard.
              </p>
              <div className="button-row">
                <GlassButton
                  className="waiting-leave-glass-button danger"
                  type="button"
                  onClick={() => {
                    setLeaveConfirmOpen(false);
                    onLeaveSession();
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
