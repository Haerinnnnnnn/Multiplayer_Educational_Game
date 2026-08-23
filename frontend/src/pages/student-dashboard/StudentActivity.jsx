import React, { useState } from 'react';
import { Feedback } from '../../components/Common.jsx';
import { formatDate, getGameTypeClass, getGameTypeLabel } from './studentDashboardHelpers.js';

function ActivityCard({ item, onViewResult }) {
  const [expanded, setExpanded] = useState(false);
  const canViewResult = item.sessionId && item.sessionStatus === 'ended' && onViewResult;
  return (
    <article className="activity-card">
      <button className="activity-card-main" type="button" onClick={() => setExpanded(!expanded)}>
        <span className="activity-card-info">
          <strong>{item.moduleTitle}</strong>
          <span className={`history-game-badge activity-game-badge ${getGameTypeClass(item.gameType)}`}>{getGameTypeLabel(item.gameType)}</span>
          <small>Session {item.sessionCode} - {formatDate(item.joinedAt)}</small>
        </span>
        <span className="activity-score">{item.score} pts{item.expGained > 0 && <small>+{item.expGained} EXP</small>}</span>
      </button>
      <div className="activity-metrics">
        <span>{item.totalAnswers} answers</span><span>{item.correctCount} correct</span><span>{item.wrongCount} wrong</span><span>{item.sessionStatus}</span>{item.levelAfter && <span>Level {item.levelAfter}</span>}
      </div>
      <div className="activity-card-actions">
        <button className="secondary-button" disabled={!canViewResult} type="button" onClick={() => onViewResult(item.sessionId)}>{canViewResult ? 'View Result' : 'Result Available After Session Ends'}</button>
      </div>
      {expanded && (
        <div className="answer-history">
          {item.answers.length || item.qrAttempts?.length ? <>
            {item.answers.map((answer) => (
              <div className="answer-history-row" key={answer.id}>
                <div><strong>{answer.questionText}</strong><p>Your answer: {answer.submittedAnswer}</p><p>Correct answer: {answer.correctAnswer}</p><p>Score earned: {answer.scoreAwarded || 0} pts</p>{answer.explanation && <p>Explanation: {answer.explanation}</p>}</div>
                <span className={answer.isCorrect ? 'answer-badge correct' : 'answer-badge wrong'}>{answer.isCorrect ? 'Correct' : 'Wrong'}</span>
              </div>
            ))}
            {(item.qrAttempts || []).map((attempt) => (
              <div className="answer-history-row" key={`qr-${attempt.id}`}>
                <div><strong>{attempt.questionText}</strong><p>Correct answer: {attempt.correctAnswer}</p><p>Time used: {Number.isFinite(attempt.answeredSeconds) ? `${attempt.answeredSeconds}s` : 'timeout'}</p><p>Wrong scans: {attempt.wrongScanCount}</p><p>Score earned: {attempt.scoreAwarded || 0} pts</p>{attempt.explanation && <p>Explanation: {attempt.explanation}</p>}</div>
                <span className={attempt.isCorrect ? 'answer-badge correct' : 'answer-badge wrong'}>{attempt.isCorrect ? 'Correct Scan' : 'Timeout'}</span>
              </div>
            ))}
          </> : <p className="muted">No answer details recorded for this session.</p>}
        </div>
      )}
    </article>
  );
}

export function StudentActivity({ activity, error, loading, onViewResult }) {
  if (loading) return <section className="panel student-dashboard-panel-in">Loading activity...</section>;
  if (error) return <Feedback text={error} />;
  if (!activity.length) return <section className="panel empty-state student-dashboard-panel-in">No activity yet.</section>;
  return <section className="activity-list student-dashboard-panel-in">{activity.map((item) => <ActivityCard item={item} key={item.id} onViewResult={onViewResult} />)}</section>;
}
