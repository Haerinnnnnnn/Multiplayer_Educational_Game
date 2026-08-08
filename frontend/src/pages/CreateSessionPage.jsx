import React, { useEffect } from 'react';
import { EmptyState, Feedback } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';
import classicMcqImage from '../assets/ClassicMCQ.png';
import qrPairMatchImage from '../assets/QRPairMatch.png';

export function CreateSessionPage({
  feedback,
  modules,
  onBack,
  onCreateSession,
  onLogout,
  ongoingSession,
  onSessionFormChange,
  sessionForm,
}) {
  useEffect(() => {
    if (sessionForm.gameType) {
      onSessionFormChange({
        ...sessionForm,
        gameType: '',
        selectedQuestionIds: [],
      });
    }
  }, []);

  const selectedModule = modules.find((module) => module.id === Number(sessionForm.moduleId));
  const sessionBlocked = Boolean(selectedModule?.isLocked);
  const availableQuestions = selectedModule?.questions || [];
  const availableQuestionCount = availableQuestions.length;
  const isManualMode = sessionForm.questionSelectionMode === 'manual';
  const isClassicMcq = sessionForm.gameType === 'classic_mcq';
  const isQrPairMatch = sessionForm.gameType === 'qr_pair_match';
  const hasSelectedGameType = Boolean(sessionForm.gameType);
  const selectedQuestionIds = sessionForm.selectedQuestionIds || [];
  const effectiveQuestionCount = isManualMode
    ? selectedQuestionIds.length
    : Number(sessionForm.questionCount) || 0;
  const generateDisabled = !hasSelectedGameType ||
    sessionBlocked || availableQuestionCount === 0 ||
    Boolean(ongoingSession) ||
    (isManualMode && selectedQuestionIds.length === 0) ||
    (isQrPairMatch && effectiveQuestionCount < 2);

  function updateSelectedModule(moduleId) {
    const nextModule = modules.find((module) => module.id === Number(moduleId));
    const nextQuestionCount = Math.min(
      Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
      Math.max(nextModule?.questions?.length || 1, 1),
    );

    onSessionFormChange({
      ...sessionForm,
      moduleId: Number(moduleId),
      questionCount: nextQuestionCount,
      selectedQuestionIds: [],
    });
  }

  function updateQuestionCount(value) {
    const minimumQuestionCount = isQrPairMatch ? 2 : 1;
    const nextValue = Math.min(
      Math.max(Number(value) || minimumQuestionCount, minimumQuestionCount),
      Math.max(availableQuestionCount, 1),
    );

    onSessionFormChange({ ...sessionForm, questionCount: nextValue });
  }

  function updateGameType(gameType) {
    const minimumQuestionCount = gameType === 'qr_pair_match' ? 2 : 1;

    onSessionFormChange({
      ...sessionForm,
      gameType,
      questionCount: Math.max(Number(sessionForm.questionCount) || minimumQuestionCount, minimumQuestionCount),
    });
  }

  function updateQrPairSetting(key, value) {
    onSessionFormChange({
      ...sessionForm,
      [key]: Math.max(Number(value) || 1, 1),
    });
  }

  function updateTimerEnabled(timerEnabled) {
    onSessionFormChange({
      ...sessionForm,
      timerEnabled,
    });
  }

  function updateQuestionSelectionMode(questionSelectionMode) {
    onSessionFormChange({
      ...sessionForm,
      questionSelectionMode,
      selectedQuestionIds: questionSelectionMode === 'manual' ? selectedQuestionIds : [],
    });
  }

  function toggleQuestion(questionId) {
    const isSelected = selectedQuestionIds.includes(questionId);
    const nextSelectedQuestionIds = isSelected
      ? selectedQuestionIds.filter((selectedId) => selectedId !== questionId)
      : [...selectedQuestionIds, questionId];

    onSessionFormChange({
      ...sessionForm,
      questionCount: Math.max(nextSelectedQuestionIds.length, 1),
      selectedQuestionIds: nextSelectedQuestionIds,
    });
  }

  return (
    <AppFrame title="Create Session" onHome={onBack} onLogout={onLogout}>
      <section className="create-session-flow">
        <div className="session-game-selector">
        <fieldset className="session-mode-field">
          <legend>Game Type</legend>
          <div className="session-mode-grid session-game-grid">
            <label className={isClassicMcq ? 'session-mode-card session-game-card active' : 'session-mode-card session-game-card'}>
              <input
                checked={isClassicMcq}
                name="gameType"
                type="radio"
                value="classic_mcq"
                onChange={() => updateGameType('classic_mcq')}
              />
              <img alt="Classic MCQ mode preview" src={classicMcqImage} />
            </label>
            <label className={isQrPairMatch ? 'session-mode-card session-game-card active' : 'session-mode-card session-game-card'}>
              <input
                checked={isQrPairMatch}
                name="gameType"
                type="radio"
                value="qr_pair_match"
                onChange={() => updateGameType('qr_pair_match')}
              />
              <img alt="QR Pair Match mode preview" src={qrPairMatchImage} />
            </label>
          </div>
        </fieldset>
        </div>

        {hasSelectedGameType && (
          <form className="panel form-grid session-options-reveal" onSubmit={onCreateSession}>
            <label>
              Module
              <select
                value={sessionForm.moduleId}
                onChange={(event) => updateSelectedModule(event.target.value)}
              >
                {modules.map((module) => (
                  <option disabled={module.isLocked} key={module.id} value={module.id}>
                    {module.title}{module.isLocked ? ' (Locked)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {sessionBlocked && (
              <p className="lock-warning">
                This module is locked by admin and cannot be used to create a game session.
              </p>
            )}
            <p className="muted session-question-count">
              This module has <strong>{availableQuestionCount}</strong> questions available.
              {isQrPairMatch ? ' QR Pair Match needs at least 2 questions.' : ''}
            </p>

            <fieldset className="session-mode-field">
              <legend>Question Selection</legend>
              <div className="session-mode-grid">
                <label className={isManualMode ? 'session-mode-card' : 'session-mode-card active'}>
                  <input
                    checked={!isManualMode}
                    name="questionSelectionMode"
                    type="radio"
                    value="random"
                    onChange={() => updateQuestionSelectionMode('random')}
                  />
                  <span>
                    <strong>Random Questions</strong>
                    <small>System randomly chooses questions from this module.</small>
                  </span>
                </label>
                <label className={isManualMode ? 'session-mode-card active' : 'session-mode-card'}>
                  <input
                    checked={isManualMode}
                    name="questionSelectionMode"
                    type="radio"
                    value="manual"
                    onChange={() => updateQuestionSelectionMode('manual')}
                  />
                  <span>
                    <strong>Manual Select Questions</strong>
                    <small>Teacher chooses exactly which questions appear in the game.</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {!isQrPairMatch && (
              <fieldset className="session-mode-field">
                <legend>Classic MCQ Timer</legend>
                <div className="session-mode-grid">
                  <label className={sessionForm.timerEnabled ? 'session-mode-card active' : 'session-mode-card'}>
                    <input
                      checked={Boolean(sessionForm.timerEnabled)}
                      name="timerEnabled"
                      type="radio"
                      onChange={() => updateTimerEnabled(true)}
                    />
                    <span>
                      <strong>Timer On</strong>
                      <small>Students get higher marks when they answer faster.</small>
                    </span>
                  </label>
                  <label className={!sessionForm.timerEnabled ? 'session-mode-card active' : 'session-mode-card'}>
                    <input
                      checked={!sessionForm.timerEnabled}
                      name="timerEnabled"
                      type="radio"
                      onChange={() => updateTimerEnabled(false)}
                    />
                    <span>
                      <strong>No Timer</strong>
                      <small>Correct answers get fixed marks without time pressure.</small>
                    </span>
                  </label>
                </div>
                {sessionForm.timerEnabled && (
                  <label>
                    Seconds Per Question
                    <input
                      min="10"
                      type="number"
                      value={sessionForm.roundSeconds}
                      onChange={(event) => updateQrPairSetting('roundSeconds', event.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            )}

            {isQrPairMatch && (
              <div className="mcq-option-grid">
                <label>
                  Round Seconds
                  <input
                    min="10"
                    type="number"
                    value={sessionForm.roundSeconds}
                    onChange={(event) => updateQrPairSetting('roundSeconds', event.target.value)}
                  />
                </label>
                <label>
                  Wrong Scan Penalty Seconds
                  <input
                    min="1"
                    type="number"
                    value={sessionForm.wrongScanPenaltySeconds}
                    onChange={(event) =>
                      updateQrPairSetting('wrongScanPenaltySeconds', event.target.value)
                    }
                  />
                </label>
              </div>
            )}

            {!isManualMode && (
              <label>
                Number of Questions
                <input
                  max={Math.max(availableQuestionCount, 1)}
                  min={isQrPairMatch ? 2 : 1}
                  type="number"
                  value={sessionForm.questionCount}
                  onChange={(event) => updateQuestionCount(event.target.value)}
                />
              </label>
            )}

            {isManualMode && (
              <div className="manual-question-picker">
                <div className="manual-question-header">
                  <h3>Choose Questions</h3>
                  <span>{selectedQuestionIds.length} selected</span>
                </div>
                <div className="manual-question-list">
                  {availableQuestions.map((question) => (
                    <label className="manual-question-item" key={question.id}>
                      <input
                        checked={selectedQuestionIds.includes(question.id)}
                        type="checkbox"
                        onChange={() => toggleQuestion(question.id)}
                      />
                      <span>
                        <strong>{question.questionCode || `Q${question.id}`}</strong>
                        {question.question}
                      </span>
                    </label>
                  ))}
                  {availableQuestionCount === 0 && <EmptyState text="No questions in this module yet." />}
                </div>
              </div>
            )}

            <button className="primary-button" disabled={generateDisabled} type="submit">
              Generate Session
            </button>
          </form>
        )}
      </section>
      {ongoingSession && (
        <p className="feedback ongoing-room-warning">
          You have an ongoing room ({ongoingSession.code}). Please return to that room or close it before creating a new session.
        </p>
      )}
      <Feedback text={feedback} />
    </AppFrame>
  );
}
