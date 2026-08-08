import React from 'react';
import { EmptyState } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

export function ResultHistoryPage({ modules, onBack, onLogout, onOpenResults, sessions }) {
  return (
    <AppFrame title="Analysis History" onHome={onBack} onLogout={onLogout}>
      <div className="list-grid">
        {sessions.map((session) => (
          <section className="panel" key={session.id}>
            <p className="eyebrow">{session.status}</p>
            <h3>{session.code}</h3>
            <p>{modules.find((module) => module.id === session.moduleId)?.title}</p>
            <p className="muted">{session.createdAt}</p>
            <button className="secondary-button" type="button" onClick={() => onOpenResults(session.id)}>
              Open Result
            </button>
          </section>
        ))}
        {sessions.length === 0 && <EmptyState text="No sessions created yet." />}
      </div>
    </AppFrame>
  );
}
