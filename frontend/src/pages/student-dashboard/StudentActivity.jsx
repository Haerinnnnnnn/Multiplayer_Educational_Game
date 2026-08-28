import React, { useMemo, useState } from 'react';
import { Feedback } from '../../components/Common.jsx';
import { formatDate, getGameTypeClass, getGameTypeLabel } from './studentDashboardHelpers.js';

const TIME_FILTERS = {
  all: { label: 'All time', days: null, today: false },
  today: { label: 'Today', days: null, today: true },
  week: { label: 'Within 7 days', days: 7, today: false },
  month: { label: 'Within 30 days', days: 30, today: false },
};

function getActivityTime(item) {
  const time = new Date(item.joinedAt).getTime();
  return Number.isNaN(time) ? null : time;
}

function getTimeFilterMatch(item, timeFilter) {
  const filter = TIME_FILTERS[timeFilter] || TIME_FILTERS.all;

  if (!filter.days && !filter.today) {
    return true;
  }

  const activityTime = getActivityTime(item);

  if (!activityTime) {
    return false;
  }

  if (filter.today) {
    const activityDate = new Date(activityTime);
    const today = new Date();
    return activityDate.toDateString() === today.toDateString();
  }

  const earliestTime = Date.now() - filter.days * 24 * 60 * 60 * 1000;
  return activityTime >= earliestTime;
}

function getGameFilterMatch(item, gameFilter) {
  if (gameFilter === 'classic_mcq') return item.gameType !== 'qr_pair_match';
  if (gameFilter === 'qr_pair_match') return item.gameType === 'qr_pair_match';
  return true;
}

function getStatusFilterMatch(item, statusFilter) {
  if (statusFilter === 'ended') return item.sessionStatus === 'ended';
  if (statusFilter === 'active') return ['waiting', 'live', 'paused'].includes(item.sessionStatus);
  if (statusFilter === 'closed') return item.sessionStatus === 'closed';
  return true;
}

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
  const [filters, setFilters] = useState({
    gameType: 'all',
    search: '',
    status: 'all',
    time: 'all',
  });

  const filteredActivity = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    return activity.filter((item) => {
      const searchMatch = !searchText || [item.moduleTitle, item.sessionCode, getGameTypeLabel(item.gameType)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText));

      return (
        searchMatch &&
        getGameFilterMatch(item, filters.gameType) &&
        getTimeFilterMatch(item, filters.time) &&
        getStatusFilterMatch(item, filters.status)
      );
    });
  }, [activity, filters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ gameType: 'all', search: '', status: 'all', time: 'all' });
  }

  if (loading) return <section className="panel student-dashboard-panel-in">Loading activity...</section>;
  if (error) return <Feedback text={error} />;
  if (!activity.length) return <section className="panel empty-state student-dashboard-panel-in">No activity yet.</section>;

  return (
    <section className="activity-list student-dashboard-panel-in">
      <div className="activity-filter-panel">
        <div>
          <p className="eyebrow">Activity Filter</p>
          <h2>Find Activity</h2>
          <p className="muted">Showing {filteredActivity.length} of {activity.length} records.</p>
        </div>
        <div className="activity-filter-grid">
          <label>
            Search
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Module, session code, game"
            />
          </label>
          <label>
            Game
            <select value={filters.gameType} onChange={(event) => updateFilter('gameType', event.target.value)}>
              <option value="all">All games</option>
              <option value="classic_mcq">Classic MCQ</option>
              <option value="qr_pair_match">QR Pair Match</option>
            </select>
          </label>
          <label>
            Time
            <select value={filters.time} onChange={(event) => updateFilter('time', event.target.value)}>
              {Object.entries(TIME_FILTERS).map(([value, filter]) => (
                <option key={value} value={value}>{filter.label}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="all">All status</option>
              <option value="ended">Ended</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <button className="secondary-button" type="button" onClick={resetFilters}>Clear Filter</button>
      </div>

      {filteredActivity.map((item) => <ActivityCard item={item} key={item.id} onViewResult={onViewResult} />)}
      {filteredActivity.length === 0 && <section className="panel empty-state">No activity matches these filters.</section>}
    </section>
  );
}
