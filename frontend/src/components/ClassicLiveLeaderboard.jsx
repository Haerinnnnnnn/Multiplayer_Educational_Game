import React, { useEffect, useMemo, useRef } from 'react';

function getParticipantKey(participant) {
  return participant.participantId || participant.id;
}

function getQuestionTotal(session) {
  return session?.questionIds?.length || session?.questionCount || 0;
}

function getParticipantStats(session, participant) {
  const totalQuestions = getQuestionTotal(session);
  const responses = (session?.responses || []).filter(
    (response) => response.participantId === participant.participantId,
  );
  const answeredQuestionIds = new Set(responses.map((response) => response.questionId));
  const answeredCount = answeredQuestionIds.size;
  const correctCount = responses.filter((response) => response.correct).length;
  const wrongCount = Math.max(responses.length - correctCount, 0);
  const remainingCount = Math.max(totalQuestions - answeredCount, 0);
  const accuracy = responses.length ? Math.round((correctCount / responses.length) * 100) : 0;

  return {
    accuracy,
    answeredCount,
    correctCount,
    remainingCount,
    responses,
    totalQuestions,
    wrongCount,
  };
}

function getSessionStats(session) {
  const responses = session?.responses || [];
  const correctCount = responses.filter((response) => response.correct).length;
  const wrongCount = Math.max(responses.length - correctCount, 0);
  const accuracy = responses.length ? Math.round((correctCount / responses.length) * 100) : 0;

  return {
    accuracy,
    correctCount,
    submittedCount: responses.length,
    wrongCount,
  };
}

function AccuracyStack({ correctCount, wrongCount, remainingCount = 0, total }) {
  const safeTotal = Math.max(total, correctCount + wrongCount + remainingCount, 1);
  const correctWidth = (correctCount / safeTotal) * 100;
  const wrongWidth = (wrongCount / safeTotal) * 100;
  const remainingWidth = Math.max(100 - correctWidth - wrongWidth, 0);

  return (
    <div className="classic-accuracy-stack" aria-label="Accuracy progress">
      <span className="correct" style={{ width: `${correctWidth}%` }} />
      <span className="wrong" style={{ width: `${wrongWidth}%` }} />
      {remainingWidth > 0 && <span className="remaining" style={{ width: `${remainingWidth}%` }} />}
    </div>
  );
}

export function ClassicLiveLeaderboard({ hideHeader = false, session, title = 'Live Ranking' }) {
  const previousRanksRef = useRef(new Map());
  const totalQuestions = getQuestionTotal(session);
  const sessionStats = getSessionStats(session);
  const totalExpectedAnswers = Math.max((session?.participants?.length || 0) * totalQuestions, 1);

  const rows = useMemo(() => {
    const previousRanks = previousRanksRef.current;

    return [...(session?.participants || [])]
      .sort((left, right) => {
        if ((right.score || 0) !== (left.score || 0)) {
          return (right.score || 0) - (left.score || 0);
        }

        return String(left.name || '').localeCompare(String(right.name || ''));
      })
      .map((participant, index) => {
        const participantKey = getParticipantKey(participant);
        const previousRank = previousRanks.get(participantKey);
        const currentRank = index + 1;
        const movement = previousRank
          ? previousRank > currentRank
            ? 'rank-up'
            : previousRank < currentRank
              ? 'rank-down'
              : ''
          : 'rank-new';

        return {
          movement,
          participant,
          participantKey,
          rank: currentRank,
          stats: getParticipantStats(session, participant),
        };
      });
  }, [session]);

  useEffect(() => {
    previousRanksRef.current = new Map(rows.map((row) => [row.participantKey, row.rank]));
  }, [rows]);

  return (
    <div className="classic-live-ranking-board">
      {!hideHeader && (
        <div className="classic-live-ranking-header">
          <div>
            <p className="eyebrow">{title}</p>
            <h2>{session?.code || 'Leaderboard'}</h2>
          </div>
          <div className="classic-session-accuracy-badge">
            <strong>{sessionStats.accuracy}%</strong>
            <span>Session Accuracy</span>
          </div>
        </div>
      )}

      <div className="classic-session-accuracy-card">
        <div>
          <span>Correct</span>
          <strong>{sessionStats.correctCount}</strong>
        </div>
        <AccuracyStack
          correctCount={sessionStats.correctCount}
          wrongCount={sessionStats.wrongCount}
          remainingCount={Math.max(totalExpectedAnswers - sessionStats.submittedCount, 0)}
          total={totalExpectedAnswers}
        />
        <div>
          <span>Wrong</span>
          <strong>{sessionStats.wrongCount}</strong>
        </div>
      </div>

      <div className="classic-live-ranking-list">
        {rows.map((row) => (
          <article
            className={`classic-live-ranking-row ${row.movement}`}
            key={row.participantKey}
            style={{ '--rank-delay': `${Math.min(row.rank * 45, 300)}ms` }}
          >
            <strong className="classic-live-rank">#{row.rank}</strong>
            <div className="classic-live-player">
              <span>{row.participant.name}</span>
              <small>
                {row.stats.remainingCount} question{row.stats.remainingCount === 1 ? '' : 's'} left
              </small>
            </div>
            <strong className="classic-live-score">{row.participant.score || 0} pts</strong>
            <div className="classic-live-accuracy">
              <div className="classic-live-accuracy-meta">
                <span>{row.stats.accuracy}% accuracy</span>
                <span>
                  {row.stats.answeredCount}/{row.stats.totalQuestions} answered
                </span>
              </div>
              <AccuracyStack
                correctCount={row.stats.correctCount}
                wrongCount={row.stats.wrongCount}
                remainingCount={row.stats.remainingCount}
                total={row.stats.totalQuestions}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
