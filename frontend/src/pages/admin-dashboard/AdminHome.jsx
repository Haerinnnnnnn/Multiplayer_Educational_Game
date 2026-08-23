import React from 'react';
import { GameSession } from '../../domain/sessions/GameSession.js';

export function AdminHome({ modules, sessions, users }) {
  const lockedModules = modules.filter((module) => module.isLocked).length;
  const deletedModules = modules.filter((module) => module.isDeleted).length;
  const activeRoomList = sessions.filter((session) => GameSession.from(session).isOngoing());
  const createdRoomList = sessions.filter((session) => GameSession.from(session).isLobby());
  const liveRoomList = sessions.filter((session) => GameSession.from(session).isLive());
  const ongoingSessions = activeRoomList.length;
  const createdSessions = createdRoomList.length;
  const liveSessions = liveRoomList.length;
  const students = users.filter((user) => user.role?.toLowerCase() === 'student').length;
  const teachers = users.filter((user) => user.role?.toLowerCase() === 'teacher').length;
  const onlineUserList = users.filter((user) => user.presenceStatus === 'online');
  const onlineUsers = onlineUserList.length;
  const latestSession = activeRoomList[0] || sessions[0];
  const overviewStats = [
    { label: 'Users', value: users.length, note: `${students} students / ${teachers} teachers` },
    { label: 'Modules', value: modules.length, note: `${lockedModules} locked / ${deletedModules} deleted` },
    { label: 'Ongoing Sessions', value: ongoingSessions, note: `${createdSessions} created / ${liveSessions} live` },
    { label: 'Online Now', value: onlineUsers, note: 'Live account status' },
  ];

  return (
    <div className="admin-home-layout admin-dashboard-panel-in">
      <section className="admin-hero-panel">
        <div className="admin-hero-copy">
          <p className="eyebrow">Admin Home</p>
          <h1>System Overview</h1>
          <p>
            Monitor users, learning modules, live rooms, and review activity from one O bitz
            control space.
          </p>

          <div className="admin-hero-tags" aria-label="Admin focus areas">
            <span>User Status</span>
            <span>Module Control</span>
            <span>Session Review</span>
          </div>
        </div>

        <div className="admin-live-card" aria-label="Admin live status">
          <div className="admin-live-card-header">
            <span>Live Monitor</span>
            <strong>{ongoingSessions} ongoing</strong>
          </div>

          <div className="admin-live-status-grid">
            <div>
              <span>Online Users</span>
              <strong>{onlineUsers}</strong>
            </div>
            <div>
              <span>Ongoing Sessions</span>
              <strong>{ongoingSessions}</strong>
            </div>
          </div>

          <div className="admin-live-radar">
            <span />
            <span />
            <span />
          </div>
          <dl>
            <div>
              <dt>{ongoingSessions ? 'Current Room' : 'Latest Session'}</dt>
              <dd>{latestSession?.code || 'No session yet'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{latestSession?.status || 'Connected'}</dd>
            </div>
          </dl>

          <div className="admin-active-room-list">
            <p>Ongoing Room Codes</p>
            {activeRoomList.length ? (
              activeRoomList.slice(0, 3).map((session) => (
                <span key={session.id}>
                  <i aria-hidden="true" />
                  <strong>{session.code}</strong>
                  <em>{session.status}</em>
                </span>
              ))
            ) : (
              <span className="admin-active-room-empty">No ongoing sessions</span>
            )}
          </div>
        </div>
      </section>

      <div className="admin-overview-grid" aria-label="Admin overview statistics">
        {overviewStats.map((item, index) => (
          <section className="admin-overview-card" key={item.label} style={{ '--delay': `${index * 0.06}s` }}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </section>
        ))}
      </div>

      <section className="admin-home-summary">
        <div>
          <p className="eyebrow">Quick Health</p>
          <h2>Everything important is one click away.</h2>
        </div>
        <div className="admin-summary-metrics">
          <span>{lockedModules} locked modules</span>
          <span>{deletedModules} deleted modules kept for audit</span>
          <span>{ongoingSessions} ongoing sessions</span>
          <span>{onlineUsers} users online</span>
        </div>
      </section>
    </div>
  );
}
