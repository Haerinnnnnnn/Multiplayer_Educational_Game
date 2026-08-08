import React from 'react';
import { ClassicLiveLeaderboard } from '../components/ClassicLiveLeaderboard.jsx';
import { ParticipantList, SessionGuard } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

function getParticipantName(session, participantId) {
  return session.participants.find((participant) => participant.participantId === participantId)?.name || '-';
}

function QrPairTeacherControl({ activeModule, activeSession }) {
  const currentTurn = activeSession.qrPair?.currentTurn;
  const pairAssignments = currentTurn?.assignments.filter((assignment) => assignment.assignmentType === 'pair') || [];
  const decoyAssignments = currentTurn?.assignments.filter((assignment) => assignment.assignmentType === 'decoy') || [];
  const leaderboard = [...(activeSession.participants || [])].sort((left, right) => right.score - left.score);
  const completedPairs = pairAssignments.filter((assignment) => assignment.status !== 'pending').length;
  const readyStudents = pairAssignments.reduce((total, assignment) => {
    return total + (assignment.questionHolderReady ? 1 : 0) + (assignment.answerHolderReady ? 1 : 0);
  }, 0) + decoyAssignments.reduce((total, assignment) => {
    return total + (assignment.answerHolderReady ? 1 : 0);
  }, 0);
  const totalStudents = activeSession.participants.length;

  return (
    <div className="split-grid">
      <section className="panel">
        <p className="eyebrow">QR Pair Match</p>
        <h2>Turn {currentTurn?.turnNumber || '-'}</h2>
        <p>
          Pair progress: {completedPairs} / {pairAssignments.length || 0}
        </p>
        {decoyAssignments.length > 0 && (
          <p>Decoy answer holders: {decoyAssignments.length}</p>
        )}
        <p>
          Ready for next: {readyStudents} / {totalStudents}
        </p>
      </section>

      <section className="panel">
        <p className="eyebrow">Live Ranking</p>
        <h2>{activeSession.code}</h2>
        <ParticipantList session={{ ...activeSession, participants: leaderboard }} />
      </section>

      <section className="panel teacher-assignment-panel">
        <h2>Current Pair Assignments</h2>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Question Holder</th>
                <th>Question</th>
                <th>Answer Holder</th>
                <th>Role</th>
                <th>Status</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(currentTurn?.assignments || []).map((assignment) => {
                const question = activeModule?.questions.find((item) => item.id === assignment.questionId);

                return (
                  <tr key={assignment.id}>
                    <td>
                      {assignment.assignmentType === 'decoy'
                        ? '-'
                        : getParticipantName(activeSession, assignment.questionHolderParticipantId)}
                    </td>
                    <td>{question?.questionCode || question?.question || '-'}</td>
                    <td>{getParticipantName(activeSession, assignment.answerHolderParticipantId)}</td>
                    <td>{assignment.assignmentType === 'decoy' ? 'Decoy' : 'Pair'}</td>
                    <td>{assignment.status}</td>
                    <td>{assignment.scoreAwarded || 0}</td>
                    <td>{assignment.answeredSeconds ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function getClassicProgress(activeSession, participant) {
  const answeredQuestionIds = new Set(
    (activeSession.responses || [])
      .filter((response) => response.participantId === participant.participantId)
      .map((response) => response.questionId),
  );

  return answeredQuestionIds.size;
}

function ClassicMcqTeacherControl({ activeSession }) {
  const totalQuestions = activeSession.questionIds?.length || activeSession.questionCount || 0;
  const leaderboard = [...(activeSession.participants || [])].sort((left, right) => right.score - left.score);
  const completedStudents = leaderboard.filter(
    (participant) => getClassicProgress(activeSession, participant) >= totalQuestions,
  ).length;
  const totalSubmissions = activeSession.responses?.length || 0;

  return (
    <div className="teacher-control-live-layout">
      <section className="panel teacher-live-ranking-wide teacher-live-combined-panel">
        <div className="teacher-live-combined-header">
          <div>
            <p className="eyebrow">Classic MCQ Live Ranking</p>
            <h2>{activeSession.code}</h2>
          </div>
          {activeSession.status === 'paused' && <p className="teacher-session-paused-badge">Paused</p>}
        </div>
        <div className="teacher-live-summary-strip">
          <p>Students completed: <strong>{completedStudents} / {activeSession.participants.length}</strong></p>
          <p>Total answers: <strong>{totalSubmissions}</strong></p>
          <p>
            Timer: <strong>{activeSession.timerEnabled ? `${activeSession.roundSeconds}s per question` : 'Off'}</strong>
          </p>
        </div>
        <ClassicLiveLeaderboard hideHeader session={{ ...activeSession, participants: leaderboard }} />
      </section>

      <section className="panel teacher-assignment-panel">
        <h2>Student Progress</h2>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Answered</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((participant, index) => {
                const answeredCount = getClassicProgress(activeSession, participant);
                const completed = answeredCount >= totalQuestions;

                return (
                  <tr key={participant.participantId || participant.id}>
                    <td>#{index + 1}</td>
                    <td>{participant.name}</td>
                    <td>{answeredCount} / {totalQuestions}</td>
                    <td>{completed ? 'Completed' : 'Answering'}</td>
                    <td>{participant.score} pts</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function TeacherControlPage({
  activeModule,
  activeSession,
  onBack,
  onEndSession,
  onPauseSession,
  onResumeSession,
}) {
  const isPaused = activeSession?.status === 'paused';

  return (
    <AppFrame
      actions={(
        <>
          <button
            className="secondary-button"
            disabled={!activeSession || activeSession.status === 'ended'}
            type="button"
            onClick={isPaused ? onResumeSession : onPauseSession}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="secondary-button danger-topbar-button" type="button" onClick={onEndSession}>
            End Session
          </button>
        </>
      )}
      title="Teacher Live Control"
      onHome={onBack}
    >
      <SessionGuard session={activeSession}>
        {activeSession?.gameType === 'qr_pair_match' ? (
          <QrPairTeacherControl
            activeModule={activeModule}
            activeSession={activeSession}
          />
        ) : (
          <ClassicMcqTeacherControl activeSession={activeSession} />
        )}
      </SessionGuard>
    </AppFrame>
  );
}
