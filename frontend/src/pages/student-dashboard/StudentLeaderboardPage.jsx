import React from 'react';

function StudentExpLeaderboard({ currentStudentId, error, leaderboard, loading }) {
  return (
    <section className="student-exp-leaderboard">
      <div className="student-exp-leaderboard-header">
        <div><p className="eyebrow">Leaderboard</p><h2>Top EXP Players</h2></div>
        <span>{leaderboard.length}</span>
      </div>
      {loading && <p className="muted">Loading leaderboard...</p>}
      {!loading && error && <p className="leaderboard-error">{error}</p>}
      {!loading && !error && !leaderboard.length && <p className="muted">No EXP ranking yet.</p>}
      {!loading && !error && leaderboard.length > 0 && (
        <ol className="student-exp-leaderboard-list">
          {leaderboard.map((player) => (
            <li className={player.id === currentStudentId ? 'current-student' : ''} key={player.id || player.rank}>
              <strong>#{player.rank}</strong><span>{player.name}</span><b>{player.totalExp} EXP</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function StudentLeaderboardPage({ currentStudentId, error, leaderboard, loading }) {
  return (
    <section className="student-leaderboard-page student-dashboard-panel-in">
      <div className="student-leaderboard-hero">
        <div><p className="eyebrow">EXP Ranking</p><h1>Student Leaderboard</h1><p>See who has earned the most experience points across the game.</p></div>
        <span>{leaderboard.length} players</span>
      </div>
      <StudentExpLeaderboard currentStudentId={currentStudentId} error={error} leaderboard={leaderboard} loading={loading} />
    </section>
  );
}
