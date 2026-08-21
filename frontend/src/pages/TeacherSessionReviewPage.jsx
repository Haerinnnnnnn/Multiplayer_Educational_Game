import React, { useState } from 'react';
import { EmptyState, Stat } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

function getSessionQuestions(module, session) {
  return (session?.questionIds || [])
    .map((questionId) => module?.questions.find((question) => question.id === questionId))
    .filter(Boolean);
}

function getStudentQuestionAttempts(session, participantId) {
  return (session?.qrPair?.turns || [])
    .flatMap((turn) =>
      (turn.assignments || []).map((assignment) => ({
        ...assignment,
        turnNumber: turn.turnNumber,
      })),
    )
    .filter(
      (assignment) =>
        assignment.questionHolderParticipantId === participantId &&
        assignment.assignmentType === 'pair' &&
        assignment.status !== 'pending',
    );
}

function getQrPairAttempts(session) {
  return (session?.qrPair?.turns || [])
    .flatMap((turn) =>
      (turn.assignments || []).map((assignment) => ({
        ...assignment,
        turnNumber: turn.turnNumber,
      })),
    )
    .filter((assignment) => assignment.assignmentType === 'pair' && assignment.status !== 'pending');
}

function getStudentClassicResponses(session, participantId) {
  return (session?.responses || [])
    .filter((response) => response.participantId === participantId)
    .sort((left, right) => {
      const leftIndex = session.questionIds?.indexOf(left.questionId) ?? 0;
      const rightIndex = session.questionIds?.indexOf(right.questionId) ?? 0;
      return leftIndex - rightIndex;
    });
}

function getClassicStudentStats(session, responses) {
  const totalQuestions = session.questionIds?.length || 0;
  const answeredCount = responses.length;
  const correctCount = responses.filter((response) => response.correct).length;
  const timedResponses = responses.filter((response) => Number.isFinite(response.answeredSeconds));
  const totalSeconds = timedResponses.reduce((total, response) => total + response.answeredSeconds, 0);
  const averageSeconds = timedResponses.length ? totalSeconds / timedResponses.length : null;
  const fastestSeconds = timedResponses.length
    ? Math.min(...timedResponses.map((response) => response.answeredSeconds))
    : null;
  const slowestSeconds = timedResponses.length
    ? Math.max(...timedResponses.map((response) => response.answeredSeconds))
    : null;

  return {
    answeredCount,
    averageSeconds,
    correctCount,
    correctPercentage: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
    fastestSeconds,
    slowestSeconds,
    totalQuestions,
  };
}

function getClassicSessionStats(session) {
  const participantCount = session.participants?.length || 0;
  const totalQuestions = session.questionIds?.length || 0;
  const expectedResponses = participantCount * totalQuestions;
  const responses = session.responses || [];
  const correctResponses = responses.filter((response) => response.correct);
  const timedResponses = responses.filter((response) => Number.isFinite(response.answeredSeconds));
  const correctTimedResponses = correctResponses.filter((response) => Number.isFinite(response.answeredSeconds));
  const averageSeconds = correctTimedResponses.length
    ? correctTimedResponses.reduce((total, response) => total + response.answeredSeconds, 0) / correctTimedResponses.length
    : null;
  const fastestSeconds = timedResponses.length
    ? Math.min(...timedResponses.map((response) => response.answeredSeconds))
    : null;
  const slowestSeconds = timedResponses.length
    ? Math.max(...timedResponses.map((response) => response.answeredSeconds))
    : null;

  return {
    averageSeconds,
    correctCount: correctResponses.length,
    correctPercentage: expectedResponses ? Math.round((correctResponses.length / expectedResponses) * 100) : 0,
    fastestSeconds,
    slowestSeconds,
    totalQuestions: expectedResponses,
  };
}

function getQrPairStats(session, attempts, expectedTotal) {
  const totalQuestions = expectedTotal ?? attempts.length;
  const correctCount = attempts.filter((attempt) => attempt.status === 'correct').length;
  const timedAttempts = attempts.filter((attempt) => Number.isFinite(attempt.answeredSeconds));
  const totalSeconds = timedAttempts.reduce((total, attempt) => total + attempt.answeredSeconds, 0);
  const averageSeconds = timedAttempts.length ? totalSeconds / timedAttempts.length : null;
  const fastestSeconds = timedAttempts.length
    ? Math.min(...timedAttempts.map((attempt) => attempt.answeredSeconds))
    : null;
  const slowestSeconds = timedAttempts.length
    ? Math.max(...timedAttempts.map((attempt) => attempt.answeredSeconds))
    : null;
  const wrongScanTotal = attempts.reduce((total, attempt) => total + (attempt.wrongScanCount || 0), 0);
  const scoreTotal = attempts.reduce((total, attempt) => total + (attempt.scoreAwarded || 0), 0);

  return {
    averageSeconds,
    correctCount,
    correctPercentage: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
    fastestSeconds,
    scoreTotal,
    slowestSeconds,
    timeoutCount: attempts.filter((attempt) => attempt.status === 'timeout').length,
    totalQuestions,
    wrongScanTotal,
  };
}

function getQrPairSessionStats(session, attempts) {
  const expectedAttempts = (session.participants?.length || 0) * (session.questionIds?.length || 0);
  return getQrPairStats(session, attempts, expectedAttempts || attempts.length);
}

function formatSeconds(value) {
  return Number.isFinite(value) ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}s` : '-';
}

function CorrectAverageDonut({ itemLabel = 'questions', stats, title = 'Correct Average' }) {
  const percentage = Math.max(0, Math.min(stats.correctPercentage || 0, 100));
  const incorrectCount = Math.max((stats.totalQuestions || 0) - (stats.correctCount || 0), 0);

  return (
    <section className="classic-correct-donut-card">
      <div
        aria-label={`Correct average ${percentage}%`}
        className="classic-correct-donut"
        role="img"
        style={{ '--correct-percent': `${percentage}%` }}
      >
        <div className="classic-correct-donut-inner">
          <strong>{percentage}%</strong>
          <span>Correct</span>
        </div>
      </div>
      <div className="classic-correct-breakdown">
        <h4>{title}</h4>
        <p>{stats.correctCount} correct out of {stats.totalQuestions} {itemLabel}.</p>
        <div className="classic-correct-legend">
          <span><i className="correct-dot" /> Correct {stats.correctCount}</span>
          <span><i className="wrong-dot" /> Wrong/Timeout {incorrectCount}</span>
        </div>
      </div>
    </section>
  );
}

function AnswerTimeGraph({ attempts, module, roundSeconds }) {
  if (!attempts.length) {
    return <EmptyState text="No answer time data available." />;
  }

  const maxSeconds = Math.max(roundSeconds || 0, ...attempts.map((attempt) => attempt.answeredSeconds || 0), 1);

  return (
    <section className="answer-time-graph">
      <h3>Question Answer Time Graph</h3>
      <div className="answer-time-bars">
        {attempts.map((attempt, index) => {
          const question = module?.questions.find((item) => item.id === attempt.questionId);
          const seconds = attempt.answeredSeconds ?? roundSeconds ?? 0;
          const width = `${Math.max((seconds / maxSeconds) * 100, 4)}%`;

          return (
            <div className="answer-time-bar-row" key={attempt.id}>
              <span className="answer-time-label">{question?.questionCode || `Q${attempt.questionId}`}</span>
              <div className="answer-time-track">
                <div
                  className="answer-time-fill"
                  style={{
                    '--bar-width': width,
                    animationDelay: `${index * 90}ms`,
                  }}
                />
              </div>
              <strong className="answer-time-value">
                {Number.isFinite(attempt.answeredSeconds) ? formatSeconds(attempt.answeredSeconds) : 'timeout'}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClassicResponseTimeGraph({ module, responses, roundSeconds }) {
  if (!responses.length) {
    return <EmptyState text="No answer time data available." />;
  }

  const maxSeconds = Math.max(roundSeconds || 0, ...responses.map((response) => response.answeredSeconds || 0), 1);

  return (
    <section className="answer-time-graph">
      <h3>Classic MCQ Answer Time Graph</h3>
      <div className="answer-time-bars">
        {responses.map((response, index) => {
          const question = module?.questions.find((item) => item.id === response.questionId);
          const isTimeout = response.responseStatus === 'timeout';
          const seconds = response.answeredSeconds ?? roundSeconds ?? 0;
          const width = `${Math.max((seconds / maxSeconds) * 100, 4)}%`;

          return (
            <div className="answer-time-bar-row classic-response-row" key={response.id}>
              <span className="answer-time-label">{question?.questionCode || `Q${response.questionId}`}</span>
              <div className="answer-time-track">
                <div
                  className={
                    response.correct
                      ? 'answer-time-fill correct'
                      : 'answer-time-fill wrong'
                  }
                  style={{
                    '--bar-width': width,
                    animationDelay: `${index * 90}ms`,
                  }}
                />
              </div>
              <strong className="answer-time-value">
                {isTimeout ? 'timeout' : formatSeconds(response.answeredSeconds)}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QrAttemptTable({ attempts, module }) {
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Turn</th>
            <th>Question</th>
            <th>Status</th>
            <th>Seconds Used</th>
            <th>Wrong Scans</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const question = module?.questions.find((item) => item.id === attempt.questionId);

            return (
              <tr key={attempt.id || `${attempt.turnNumber}-${attempt.questionHolderParticipantId}-${attempt.questionId}`}>
                <td>{attempt.turnNumber}</td>
                <td>{question?.questionCode || question?.question || '-'}</td>
                <td>{attempt.status}</td>
                <td>{formatSeconds(attempt.answeredSeconds)}</td>
                <td>{attempt.wrongScanCount}</td>
                <td>{attempt.scoreAwarded}</td>
              </tr>
            );
          })}
          {attempts.length === 0 && (
            <tr>
              <td colSpan="6">No QR Pair Match attempts found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherSessionReviewPage({ module, onBack, session }) {
  const [openParticipantId, setOpenParticipantId] = useState(null);

  if (!session) {
    return (
      <AppFrame title="Session Review" onHome={onBack}>
        <EmptyState text="No session selected." />
      </AppFrame>
    );
  }

  const leaderboard = [...(session.participants || [])].sort((left, right) => right.score - left.score);
  const selectedParticipant = leaderboard.find((participant) => participant.participantId === openParticipantId);
  const selectedAttempts = selectedParticipant
    ? getStudentQuestionAttempts(session, selectedParticipant.participantId)
    : [];
  const qrPairAttempts = getQrPairAttempts(session);
  const selectedQrStats = getQrPairStats(session, selectedAttempts, session.questionIds?.length || selectedAttempts.length);
  const sessionQrStats = getQrPairSessionStats(session, qrPairAttempts);
  const selectedClassicResponses = selectedParticipant
    ? getStudentClassicResponses(session, selectedParticipant.participantId)
    : [];
  const selectedClassicStats = getClassicStudentStats(session, selectedClassicResponses);
  const sessionClassicStats = getClassicSessionStats(session);
  const sessionQuestions = getSessionQuestions(module, session);
  const isClassicMcq = session.gameType !== 'qr_pair_match';
  const gameTypeLabel = isClassicMcq ? 'Classic MCQ' : 'QR Pair Match';
  const participantCount = session.participants?.length || 0;
  const questionCount = session.questionIds?.length || sessionQuestions.length || 0;
  const answerCount = isClassicMcq ? sessionClassicStats.totalQuestions : sessionQrStats.totalQuestions;
  const correctCount = isClassicMcq ? sessionClassicStats.correctCount : sessionQrStats.correctCount;
  const topicLabel = session.topicTitle || 'Unassigned';
  const topicCodeLabel = session.topicCode ? `Topic Code ${session.topicCode}` : 'No topic code';

  return (
    <AppFrame title="Session Review" onHome={onBack}>
      <section className="teacher-history-detail review-detail-shell">
        <section className="panel review-section-card review-overview-card session-review-overview">
          <div className="session-review-hero">
            <div>
              <p className="eyebrow">{(session.status || 'ended').toUpperCase()}</p>
              <h2>{session.code}</h2>
              <p className="session-review-module">{session.moduleTitle || module?.title || '-'}</p>
            </div>
            <div className="session-review-badges" aria-label="Session labels">
              <span className="session-review-badge">{gameTypeLabel}</span>
              <span className="session-review-badge subtle">{session.status || 'ended'}</span>
            </div>
          </div>

          <div className="session-review-meta-grid">
            <div>
              <span>Module</span>
              <strong>{session.moduleTitle || module?.title || '-'}</strong>
            </div>
            <div>
              <span>Topic</span>
              <strong>{topicLabel}</strong>
              <small>{topicCodeLabel}</small>
            </div>
            <div>
              <span>Created</span>
              <strong>{session.createdAt || '-'}</strong>
            </div>
          </div>

          <div className="stats-grid session-review-stats-grid">
            <Stat label="Students Joined" value={participantCount} />
            <Stat label="Questions" value={questionCount} />
            <Stat label={isClassicMcq ? 'Answers' : 'Attempts'} value={answerCount} />
            <Stat label="Correct" value={correctCount} />
          </div>
        </section>

        {isClassicMcq && (
          <section className="panel review-section-card history-session-analytics">
            <div className="session-analytics-title-row">
              <div>
              <p className="eyebrow">Whole Session Analytics</p>
                <h3>{selectedParticipant ? `${selectedParticipant.name} Analytics` : 'Session Analytics'}</h3>
              </div>
              {selectedParticipant && (
                <button
                  className="secondary-button quit-viewing-button"
                  type="button"
                  onClick={() => setOpenParticipantId(null)}
                >
                  Quit Viewing
                </button>
              )}
            </div>

            <div className="session-analytics-groups">
              {selectedParticipant && (
                <section className="session-analytics-group">
                  <div className="session-analytics-heading">
                    <h4>Selected Student</h4>
                  </div>
                  <div className="classic-review-analytics">
                    <CorrectAverageDonut stats={selectedClassicStats} />
                    <div className="stats-grid classic-review-stats">
                      <Stat
                        label="Correct Questions"
                        value={`${selectedClassicStats.correctCount}/${selectedClassicStats.totalQuestions}`}
                      />
                      <Stat
                        label="Average Time"
                        value={formatSeconds(selectedClassicStats.averageSeconds)}
                      />
                      <Stat
                        label="Fastest Time"
                        value={formatSeconds(selectedClassicStats.fastestSeconds)}
                      />
                      <Stat
                        label="Slowest Time"
                        value={formatSeconds(selectedClassicStats.slowestSeconds)}
                      />
                    </div>
                  </div>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Status</th>
                          <th>Seconds Used</th>
                          <th>Answer</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClassicResponses.map((response) => {
                          const question = module?.questions.find((item) => item.id === response.questionId);

                          return (
                            <tr key={response.id}>
                              <td>{question?.questionCode || question?.question || '-'}</td>
                              <td>{response.responseStatus}</td>
                              <td>{formatSeconds(response.answeredSeconds)}</td>
                              <td>{response.answer}</td>
                              <td>{response.scoreAwarded}</td>
                            </tr>
                          );
                        })}
                        {selectedClassicResponses.length === 0 && (
                          <tr>
                            <td colSpan="5">No Classic MCQ responses found for this student.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <ClassicResponseTimeGraph
                    key={selectedParticipant.participantId}
                    module={module}
                    responses={selectedClassicResponses}
                    roundSeconds={session.roundSeconds}
                  />
                </section>
              )}

              {!selectedParticipant && (
                <section className="session-analytics-group">
                  <div className="session-analytics-heading">
                    <h4>All Students</h4>
                  </div>
                  <div className="classic-review-analytics">
                    <CorrectAverageDonut
                      itemLabel="answers"
                      stats={sessionClassicStats}
                      title="Session Correct Average"
                    />
                    <div className="stats-grid classic-review-stats">
                      <Stat
                        label="Correct Answers"
                        value={`${sessionClassicStats.correctCount}/${sessionClassicStats.totalQuestions}`}
                      />
                      <Stat
                        label="Correct Avg Time"
                        value={formatSeconds(sessionClassicStats.averageSeconds)}
                      />
                      <Stat
                        label="Fastest Time"
                        value={formatSeconds(sessionClassicStats.fastestSeconds)}
                      />
                      <Stat
                        label="Slowest Time"
                        value={formatSeconds(sessionClassicStats.slowestSeconds)}
                      />
                    </div>
                  </div>
                  <div className="session-analytics-empty">
                    Select a student below to switch this analytics panel to their individual answer timing.
                  </div>
                </section>
              )}
            </div>
          </section>
        )}

        {!isClassicMcq && (
          <section className="panel review-section-card history-session-analytics qr-session-analytics">
            <div className="session-analytics-title-row">
              <div>
                <p className="eyebrow">QR Pair Match Analytics</p>
                <h3>{selectedParticipant ? `${selectedParticipant.name} QR Analytics` : 'Session Analytics'}</h3>
              </div>
              {selectedParticipant && (
                <button
                  className="secondary-button quit-viewing-button"
                  type="button"
                  onClick={() => setOpenParticipantId(null)}
                >
                  Quit Viewing
                </button>
              )}
            </div>

            <div className="session-analytics-groups">
              {selectedParticipant && (
                <section className="session-analytics-group">
                  <div className="session-analytics-heading">
                    <h4>Selected Student</h4>
                  </div>
                  <div className="classic-review-analytics qr-review-analytics">
                    <CorrectAverageDonut
                      stats={selectedQrStats}
                      title="QR Match Success Rate"
                    />
                    <div className="stats-grid classic-review-stats qr-review-stats">
                      <Stat
                        label="Correct Matches"
                        value={`${selectedQrStats.correctCount}/${selectedQrStats.totalQuestions}`}
                      />
                      <Stat
                        label="Avg Solve Time"
                        value={formatSeconds(selectedQrStats.averageSeconds)}
                      />
                      <Stat
                        label="Fastest Time"
                        value={formatSeconds(selectedQrStats.fastestSeconds)}
                      />
                      <Stat
                        label="Slowest Time"
                        value={formatSeconds(selectedQrStats.slowestSeconds)}
                      />
                      <Stat label="Wrong Scans" value={selectedQrStats.wrongScanTotal} />
                      <Stat label="Total Score" value={selectedQrStats.scoreTotal} />
                    </div>
                  </div>
                  <QrAttemptTable attempts={selectedAttempts} module={module} />
                  <AnswerTimeGraph
                    key={selectedParticipant.participantId}
                    attempts={selectedAttempts}
                    module={module}
                    roundSeconds={session.roundSeconds}
                  />
                </section>
              )}

              {!selectedParticipant && (
                <section className="session-analytics-group">
                  <div className="session-analytics-heading">
                    <h4>All Students</h4>
                  </div>
                  <div className="classic-review-analytics qr-review-analytics">
                    <CorrectAverageDonut
                      itemLabel="attempts"
                      stats={sessionQrStats}
                      title="Session QR Success Rate"
                    />
                    <div className="stats-grid classic-review-stats qr-review-stats">
                      <Stat
                        label="Correct Matches"
                        value={`${sessionQrStats.correctCount}/${sessionQrStats.totalQuestions}`}
                      />
                      <Stat
                        label="Avg Solve Time"
                        value={formatSeconds(sessionQrStats.averageSeconds)}
                      />
                      <Stat
                        label="Fastest Time"
                        value={formatSeconds(sessionQrStats.fastestSeconds)}
                      />
                      <Stat
                        label="Slowest Time"
                        value={formatSeconds(sessionQrStats.slowestSeconds)}
                      />
                      <Stat label="Wrong Scans" value={sessionQrStats.wrongScanTotal} />
                      <Stat label="Total Score" value={sessionQrStats.scoreTotal} />
                    </div>
                  </div>
                  <div className="session-analytics-empty">
                    Select a student below to switch this analytics panel to their QR Pair Match timing.
                  </div>
                </section>
              )}
            </div>
          </section>
        )}

        <section className="panel review-section-card history-leaderboard-card">
          <h3>Leaderboard</h3>
          <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Points</th>
                <th>Joined At</th>
                <th>Answer Timing</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((participant, index) => (
                <tr key={participant.participantId || participant.id}>
                  <td>{index + 1}</td>
                  <td>{participant.name}</td>
                  <td>{participant.score}</td>
                  <td>{participant.joinedAt ? new Date(participant.joinedAt).toLocaleString() : '-'}</td>
                  <td>
                    <button
                      className={
                        openParticipantId === participant.participantId
                          ? 'link-button selected-review-button'
                          : 'link-button'
                      }
                      type="button"
                      onClick={() =>
                        setOpenParticipantId(participant.participantId)
                      }
                    >
                      {openParticipantId === participant.participantId ? 'Viewing' : 'View Times'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>

        <section className="panel review-section-card history-question-summary">
          <h3>Question Summary</h3>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {sessionQuestions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.questionCode}</td>
                    <td>{question.question}</td>
                    <td>{question.correctAnswer || question.answer}</td>
                    <td>{question.explanation || '-'}</td>
                  </tr>
                ))}
                {sessionQuestions.length === 0 && (
                  <tr>
                    <td colSpan="4">No question details available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppFrame>
  );
}
