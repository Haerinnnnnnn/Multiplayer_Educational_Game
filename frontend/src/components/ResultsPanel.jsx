import React, { useState } from 'react';
import { EmptyState, Feedback, Stat } from './Common.jsx';
import { leaderboardRanker } from '../domain/leaderboard/LeaderboardRanker.js';

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

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function getSessionQuestions(session) {
  const questionIds = (session?.questionIds || []).map((questionId) => Number(questionId));
  const questionIdSet = new Set(questionIds);
  const sourceQuestions = session?.sessionQuestions?.length
    ? session.sessionQuestions
    : session?.module?.questions || [];

  if (!questionIds.length) {
    return sourceQuestions;
  }

  return questionIds
    .map((questionId) => sourceQuestions.find((question) => Number(question.id) === Number(questionId)))
    .filter(Boolean)
    .concat(
      sourceQuestions.filter((question) => !questionIdSet.has(Number(question.id))),
    )
    .filter((question, index, collection) =>
      collection.findIndex((item) => Number(item.id) === Number(question.id)) === index,
    )
    .filter((question) => questionIdSet.has(Number(question.id)));
}

function getQuestionTopicLabel(question, session) {
  if (question.chapterTitle) {
    return question.chapterCode
      ? `${question.chapterCode} - ${question.chapterTitle}`
      : question.chapterTitle;
  }

  return session?.topicTitle && session.topicTitle !== '-'
    ? session.topicTitle
    : 'Unassigned';
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

  const leaderboard = leaderboardRanker.rankByScore(session.participants || []);
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
  const sessionQuestions = getSessionQuestions(session);
  const [showSessionQuestions, setShowSessionQuestions] = useState(false);

  return (
    <div className="results-podium-shell">
      <section className="panel podium-panel">
        <div className="podium-header">
          <div>
            <p className="eyebrow">Session Result</p>
            <h2>Podium</h2>
            <p className="muted">Session Code: {session.code}</p>
            <div className="result-session-meta">
              <span>Module: {session.moduleTitle || '-'}</span>
              <span>Topic: {session.topicTitle || 'Unassigned'}</span>
              <span>{getGameTypeLabel(session.gameType)}</span>
            </div>
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

      <section className="panel results-question-panel">
        <div className="results-question-header">
          <div>
            <p className="eyebrow">Session Questions</p>
            <h2>Questions And Explanations</h2>
            <p className="muted">
              {showSessionQuestions
                ? 'Showing only the questions selected for this session.'
                : `${sessionQuestions.length} selected question${sessionQuestions.length === 1 ? '' : 's'} hidden.`}
            </p>
          </div>
          <div className="results-question-actions">
            <div className="result-session-meta compact">
              <span>Module: {session.moduleTitle || '-'}</span>
              <span>Topic: {session.topicTitle || 'Unassigned'}</span>
            </div>
            <button
              className="results-question-toggle"
              type="button"
              onClick={() => setShowSessionQuestions((current) => !current)}
            >
              {showSessionQuestions ? 'Hide Questions' : 'Show Questions'}
            </button>
          </div>
        </div>

        {!showSessionQuestions && (
          <div className="results-question-collapsed">
            Press Show Questions to review the selected questions, answers, and explanations.
          </div>
        )}

        {showSessionQuestions && sessionQuestions.length > 0 ? (
          <div className="results-question-list">
            {sessionQuestions.map((question, index) => (
              <article className="results-question-card" key={question.id}>
                <div className="results-question-topline">
                  <span className="result-rank-number">{index + 1}</span>
                  <div>
                    <strong>{question.questionCode || `Q${index + 1}`}</strong>
                    <p>{getQuestionTopicLabel(question, session)}</p>
                  </div>
                </div>
                <div className="results-question-body">
                  <div>
                    <span>Question</span>
                    <p>{question.question || '-'}</p>
                  </div>
                  <div>
                    <span>Correct Answer</span>
                    <p>
                      {question.correctOption ? `${question.correctOption}. ` : ''}
                      {question.correctAnswer || question.answer || '-'}
                    </p>
                  </div>
                  <div className="results-question-explanation">
                    <span>Explanation</span>
                    <p>{question.explanation || 'No explanation provided for this question.'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : showSessionQuestions ? (
          <EmptyState text="No question details found for this session." />
        ) : null}
      </section>
    </div>
  );
}
