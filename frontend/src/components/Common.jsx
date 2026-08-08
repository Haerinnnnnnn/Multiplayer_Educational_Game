import React from 'react';

export function Stat({ label, value }) {
  return (
    <section className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </section>
  );
}

export function ActionCard({ title, action, onClick }) {
  return (
    <section className="panel action-card">
      <h3>{title}</h3>
      <button className="primary-button" type="button" onClick={onClick}>
        {action}
      </button>
    </section>
  );
}

export function Feedback({ text }) {
  if (!text) {
    return null;
  }

  return <p className="feedback">{text}</p>;
}

export function EmptyState({ text }) {
  return <section className="panel empty-state">{text}</section>;
}

export function SessionGuard({ session, children }) {
  if (!session) {
    return <EmptyState text="No active session selected." />;
  }

  return children;
}

export function ParticipantList({ kickingParticipantId = null, onKickParticipant, session }) {
  if (!session?.participants.length) {
    return <p className="muted">No students joined yet.</p>;
  }

  return (
    <ul className="participant-list">
      {session.participants.map((participant) => (
        <li key={participant.id}>
          <span>{participant.name}</span>
          <div className="participant-actions">
            <strong>{participant.score} pts</strong>
            {onKickParticipant && (
              <button
                className="link-button danger-link"
                disabled={kickingParticipantId === participant.id}
                type="button"
                onClick={() => onKickParticipant(participant)}
              >
                {kickingParticipantId === participant.id ? 'Kicking...' : 'Kick'}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
