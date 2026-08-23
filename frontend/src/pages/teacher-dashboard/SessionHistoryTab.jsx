import { useState } from 'react';
import { EmptyState } from '../../components/Common.jsx';
import {
  getGameTypeLabel,
  getSessionModuleTitle,
  getSessionTopicTitle,
  isSessionInHistoryDateRange,
} from './teacherDashboardHelpers.js';

export function SessionHistoryTab({ modules, onOpenResults, onReviewSession, sessions }) {
  const [historyFilters, setHistoryFilters] = useState({
    gameType: 'all',
    moduleId: 'all',
    dateRange: 'all',
  });

  const filteredSessions = sessions.filter((session) => {
    const sessionGameType = session.gameType || 'classic_mcq';
    const matchesGameType = historyFilters.gameType === 'all' || sessionGameType === historyFilters.gameType;
    const matchesModule = historyFilters.moduleId === 'all' || String(session.moduleId) === String(historyFilters.moduleId);
    const matchesDate = isSessionInHistoryDateRange(session, historyFilters.dateRange);

    return matchesGameType && matchesModule && matchesDate;
  });

  const activeFilterCount = Object.values(historyFilters).filter((value) => value !== 'all').length;

  function updateHistoryFilter(name, value) {
    setHistoryFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function resetHistoryFilters() {
    setHistoryFilters({
      gameType: 'all',
      moduleId: 'all',
      dateRange: 'all',
    });
  }

  return (
    <section className="teacher-dashboard-panel-in">
      <section className="panel teacher-history-filter-panel">
        <div>
          <p className="eyebrow">History Filters</p>
          <h2>Filter Sessions</h2>
          <p className="muted">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </p>
        </div>
        <div className="teacher-history-filter-grid">
          <label>
            Game Type
            <select
              value={historyFilters.gameType}
              onChange={(event) => updateHistoryFilter('gameType', event.target.value)}
            >
              <option value="all">All game types</option>
              <option value="classic_mcq">Classic MCQ</option>
              <option value="qr_pair_match">QR Pair Match</option>
            </select>
          </label>
          <label>
            Module
            <select
              value={historyFilters.moduleId}
              onChange={(event) => updateHistoryFilter('moduleId', event.target.value)}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <select
              value={historyFilters.dateRange}
              onChange={(event) => updateHistoryFilter('dateRange', event.target.value)}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={resetHistoryFilters}
            disabled={activeFilterCount === 0}
          >
            Reset Filters
          </button>
        </div>
      </section>
      <div className="teacher-history-list">
        {filteredSessions.map((session) => (
          <section className="panel teacher-history-card" key={session.id}>
            <div className="history-card-header">
              <div>
                <p className="eyebrow">{session.status}</p>
                <h3>{session.code}</h3>
                <span
                  className={
                    session.gameType === 'qr_pair_match'
                      ? 'history-game-badge qr-pair'
                      : 'history-game-badge classic'
                  }
                >
                  {getGameTypeLabel(session.gameType)}
                </span>
                <p>
                  <strong>Module:</strong> {getSessionModuleTitle(modules, session)}
                </p>
                <p className="muted">
                  Topic: {getSessionTopicTitle(session)}
                  {session.topicCode ? ` (${session.topicCode})` : ''}
                </p>
                <p className="muted">Questions: {session.questionIds?.length || session.questionCount || 0}</p>
                <p className="muted">{session.createdAt}</p>
              </div>
              <div className="history-card-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onReviewSession(session.id)}
                >
                  View Analysis
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => onOpenResults(session.id)}
                >
                  Open Result
                </button>
              </div>
            </div>
          </section>
        ))}
        {sessions.length === 0 && <EmptyState text="No sessions created yet." />}
        {sessions.length > 0 && filteredSessions.length === 0 && (
          <EmptyState text="No sessions match the selected filters." />
        )}
      </div>
    </section>
  );
}
