import React from 'react';
import { EmptyState, Feedback, Stat } from './Common.jsx';

function getRankLabel(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function getDisplayName(participant, currentUser) {
  return participant.studentId === currentUser?.id || participant.id === currentUser?.id
    ? 'You'
    : participant.name;
}

function PodiumSpot({ currentUser, participant, rank }) {
  if (!participant) {
    return <div className={`podium-spot rank-${rank} empty`} />;
  }

  return (
    <article className={`podium-spot rank-${rank}`}>
      <div className="podium-name-tag">{getDisplayName(participant, currentUser)}</div>
      <div className="podium-avatar" aria-hidden="true">
        {getDisplayName(participant, currentUser).charAt(0).toUpperCase()}
      </div>
      <div className="podium-block">
        <span className="podium-medal">{rank}</span>
        <strong>{participant.score}</strong>
        <small>pts</small>
      </div>
    </article>
  );
}

function getExperienceLogForParticipant(experienceLogs, participant) {
  return experienceLogs.find(
    (log) =>
      log.participantId === participant.participantId ||
      log.studentId === participant.studentId ||
      log.studentId === participant.id,
  );
}

export function ResultsPanel({
  currentUser,
  experienceError = '',
  experienceLogs = [],
  settlingExperience = false,
  session,
}) {
  if (!session) {
    return <EmptyState text="No result selected." />;
  }

  const leaderboard = [...(session.participants || [])].sort((a, b) => b.score - a.score);
  const topThree = leaderboard.slice(0, 3);
  const otherPlayers = leaderboard.slice(3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];
  const correctCount = session.responses.filter((response) => response.correct).length;
  const currentUserRank = leaderboard.findIndex(
    (participant) => participant.studentId === currentUser?.id || participant.id === currentUser?.id,
  ) + 1;
  const currentParticipant = leaderboard.find(
    (participant) => participant.studentId === currentUser?.id || participant.id === currentUser?.id,
  );
  const currentUserExpLog = currentParticipant
    ? getExperienceLogForParticipant(experienceLogs, currentParticipant)
    : null;

  return (
    <div className="results-podium-shell">
      <section className="panel podium-panel">
        <div className="podium-header">
          <div>
            <p className="eyebrow">Session Result</p>
            <h2>Podium</h2>
            <p className="muted">Session Code: {session.code}</p>
          </div>
          {currentUserRank > 0 && (
            <span className="podium-rank-pill">Your Rank: {getRankLabel(currentUserRank)}</span>
          )}
        </div>

        {settlingExperience && <div className="exp-settle-note">Calculating EXP rewards...</div>}
        {experienceError && <Feedback text={experienceError} />}
        {currentUserExpLog && (
          <div className="result-exp-banner">
            <div>
              <span>EXP Earned</span>
              <strong>+{currentUserExpLog.expGained} EXP</strong>
            </div>
            <div>
              <span>Current Level</span>
              <strong>Level {currentUserExpLog.newLevel}</strong>
            </div>
            {currentUserExpLog.newLevel > currentUserExpLog.oldLevel && (
              <div className="level-up-pill">Level Up!</div>
            )}
          </div>
        )}

        <div className="podium-stage">
          <PodiumSpot currentUser={currentUser} participant={podiumOrder[0]} rank={2} />
          <PodiumSpot currentUser={currentUser} participant={podiumOrder[1]} rank={1} />
          <PodiumSpot currentUser={currentUser} participant={podiumOrder[2]} rank={3} />
        </div>

        {topThree.some(
          (participant) => participant?.studentId === currentUser?.id || participant?.id === currentUser?.id,
        ) && (
          <div className="podium-message">You're on the podium!</div>
        )}
      </section>

      <section className="panel results-summary-panel">
        <h2>Participation Summary</h2>
        <div className="stats-grid results-stats-grid">
          <Stat label="Students" value={session.participants.length} />
          <Stat label="Submissions" value={session.responses.length} />
          <Stat label="Correct" value={correctCount} />
          <Stat label="Wrong" value={session.responses.length - correctCount} />
        </div>
      </section>

      <section className="panel results-leaderboard-panel">
        <h2>Full Leaderboard</h2>
        <div className="results-leaderboard-list">
          {leaderboard.map((participant, index) => (
            <article
              className={
                index < 3
                  ? 'results-leaderboard-row top-player'
                  : 'results-leaderboard-row'
              }
              key={participant.participantId || participant.id}
            >
              <span className="result-rank-number">#{index + 1}</span>
              <div>
                <strong>{getDisplayName(participant, currentUser)}</strong>
                <p className="muted">
                  {index < 3 ? 'Top podium player' : 'Leaderboard player'}
                  {getExperienceLogForParticipant(experienceLogs, participant) && (
                    <>
                      {' '}-
                      {' '}+{getExperienceLogForParticipant(experienceLogs, participant).expGained} EXP
                      {' '}-
                      {' '}Level {getExperienceLogForParticipant(experienceLogs, participant).newLevel}
                    </>
                  )}
                </p>
              </div>
              <strong>{participant.score} pts</strong>
            </article>
          ))}
        </div>
        {otherPlayers.length > 0 && (
          <p className="muted results-extra-note">
            {otherPlayers.length} more student{otherPlayers.length === 1 ? '' : 's'} shown under the podium.
          </p>
        )}
      </section>
    </div>
  );
}
