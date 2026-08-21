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

  const selectableModules = modules.filter((module) => !module.isLocked && !module.isDeleted);
  const blockedModuleCount = modules.length - selectableModules.length;
  const selectedModule = selectableModules.find((module) => module.id === Number(sessionForm.moduleId));
  const sessionBlocked = Boolean(selectedModule?.isLocked);
  const moduleChapters = (selectedModule?.chapters || []).filter((chapter) => !chapter.isDeleted);
  const selectedChapter = moduleChapters.find((chapter) => chapter.id === Number(sessionForm.chapterId));
  const moduleHasTopics = moduleChapters.length > 0;
  const availableQuestions = selectedChapter
    ? (selectedModule?.questions || []).filter(
        (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(selectedChapter.id),
      )
    : [];
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
    selectableModules.length === 0 || sessionBlocked || !moduleHasTopics || !selectedChapter || availableQuestionCount === 0 ||
    Boolean(ongoingSession) ||
    (isManualMode && selectedQuestionIds.length === 0) ||
    (isQrPairMatch && effectiveQuestionCount < 2);

  function updateSelectedModule(moduleId) {
    const nextModule = selectableModules.find((module) => module.id === Number(moduleId));
    const nextChapterId = (nextModule?.chapters || []).find((chapter) => !chapter.isDeleted)?.id || '';
    const nextTopicQuestionCount = (nextModule?.questions || []).filter(
      (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(nextChapterId),
    ).length;
    const nextQuestionCount = Math.min(
      Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
      Math.max(nextTopicQuestionCount || 1, 1),
    );

    onSessionFormChange({
      ...sessionForm,
      moduleId: nextModule?.id || '',
      chapterId: nextChapterId,
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
              1. Module
              <select
                disabled={selectableModules.length === 0}
                value={selectedModule ? sessionForm.moduleId : ''}
                onChange={(event) => updateSelectedModule(event.target.value)}
              >
                <option value="">
                  {selectableModules.length ? 'Choose a module' : 'No available modules'}
                </option>
                {selectableModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
                  </option>
                ))}
              </select>
            </label>
            {blockedModuleCount > 0 && (
              <p className="lock-warning">
                Locked modules are hidden here because admin locked them. Unlock the module before using it in a session.
              </p>
            )}
            {selectedModule && (
              <label>
                2. Topic / Chapter
                <select
                  disabled={!moduleHasTopics}
                  value={sessionForm.chapterId || ''}
                  onChange={(event) =>
                    onSessionFormChange({
                      ...sessionForm,
                      chapterId: event.target.value,
                      questionCount: Math.min(
                        Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
                        Math.max(
                          (selectedModule.questions || []).filter(
                            (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(event.target.value),
                          ).length,
                          1,
                        ),
                      ),
                      selectedQuestionIds: [],
                    })
                  }
                >
                  <option value="">
                    {moduleHasTopics ? 'Choose a topic' : 'No topics available'}
                  </option>
                  {moduleChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.chapterCode ? `${chapter.chapterCode} - ${chapter.title}` : chapter.title}
                      {` (${chapter.questionCount || 0} questions)`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedModule && !moduleHasTopics && (
              <p className="lock-warning">
                This module has no topics yet. Please open Manage Module and create at least one topic first.
              </p>
            )}
            <p className="muted session-question-count">
              {selectedChapter ? (
                <>
                  Topic <strong>{selectedChapter.title}</strong> has <strong>{availableQuestionCount}</strong> questions available.
                </>
              ) : (
                <>Choose a topic to see available questions.</>
              )}
              {isQrPairMatch ? ' QR Pair Match needs at least 2 questions.' : ''}
            </p>

            <fieldset className="session-mode-field">
              <legend>3. Question Selection</legend>
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
                    <small>System randomly chooses questions from the selected topic.</small>
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
                  {availableQuestionCount === 0 && <EmptyState text="No questions in this topic yet." />}
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
