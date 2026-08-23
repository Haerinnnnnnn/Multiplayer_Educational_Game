import React from 'react';
import { EmptyState, Feedback } from '../../components/Common.jsx';
import { formatDateTime, formatGameType } from './adminDashboardHelpers.js';

export function AdminSessionsTab({ error, loading, onRefresh, sessions }) {
  return (
    <section className="admin-dashboard-panel-in admin-glass-section">
      <div className="button-row admin-user-actions">
        <div>
          <h2>All Sessions</h2>
          <p className="muted admin-refresh-note">Sessions created by every teacher in the database.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Sessions
        </button>
      </div>

      <Feedback text={error} />
      {loading && <section className="panel">Loading sessions...</section>}

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>Session Code</th>
              <th>Module</th>
              <th>Topic</th>
              <th>Teacher</th>
              <th>Game Type</th>
              <th>Status</th>
              <th>Questions</th>
              <th>Students</th>
              <th>Rounds</th>
              <th>Created</th>
              <th>Ended</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <strong>{session.code}</strong>
                </td>
                <td>
                  {session.moduleTitle}
                  <p className="muted table-subtext">{session.moduleCode}</p>
                </td>
                <td>
                  {session.topicTitle || '-'}
                  {session.topicCode && <p className="muted table-subtext">{session.topicCode}</p>}
                </td>
                <td>
                  {session.teacherName}
                  <p className="muted table-subtext">{session.teacherCode}</p>
                </td>
                <td>{formatGameType(session.gameType)}</td>
                <td>
                  <span className={`review-badge ${session.status}`}>{session.status}</span>
                </td>
                <td>{session.questionCount}</td>
                <td>{session.participantCount}</td>
                <td>{session.roundCount}</td>
                <td>{formatDateTime(session.createdAt)}</td>
                <td>{formatDateTime(session.endedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sessions.length === 0 && <EmptyState text="No sessions created yet." />}
      </div>
    </section>
  );
}
