import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ClassicLiveLeaderboard } from './ClassicLiveLeaderboard.jsx';
import { EmptyState, Feedback } from './Common.jsx';
import { getAnswerOptions } from '../utils/sessionHelpers.js';
import { leaderboardRanker } from '../domain/leaderboard/LeaderboardRanker.js';

function getQrPairAssignment(session, student) {
  const participant = session.participants.find((item) => item.id === student.id);

  if (!participant?.participantId || !session.qrPair?.currentTurn) {
    return { assignment: null, participant: null, role: null };
  }

  const assignment = session.qrPair.currentTurn.assignments.find(
    (item) =>
      item.assignmentType === 'pair' && item.questionHolderParticipantId === participant.participantId,
  ) || session.qrPair.currentTurn.assignments.find(
    (item) =>
      item.answerHolderParticipantId === participant.participantId,
  );

  if (!assignment) {
    return { assignment: null, participant, role: null };
  }

  return {
    assignment,
    participant,
    role:
      assignment.assignmentType === 'pair' &&
      assignment.questionHolderParticipantId === participant.participantId
        ? 'question_holder'
        : assignment.assignmentType === 'decoy'
          ? 'decoy_answer_holder'
          : 'answer_holder',
  };
}

function parseAnswerToken(value) {
  const cleanValue = value.trim();

  if (cleanValue.startsWith('fyp-answer:')) {
    return cleanValue.replace('fyp-answer:', '').trim();
  }

  return cleanValue;
}

function isFinalQrPairExplanation(session) {
  const questionIds = session.questionIds || [];
  const participantIds = (session.participants || []).map((participant) => participant.participantId);
  const assignments = (session.qrPair?.turns || []).flatMap((turn) => turn.assignments || []);

  if (!questionIds.length || !participantIds.length || !assignments.length) {
    return false;
  }

  return participantIds.every((participantId) => {
    const completedQuestionIds = new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.questionHolderParticipantId === participantId &&
            assignment.assignmentType === 'pair' &&
            assignment.status !== 'pending',
        )
        .map((assignment) => assignment.questionId),
    );

    return questionIds.every((questionId) => completedQuestionIds.has(questionId));
  });
}

function QrPairScanner({ assignment, onScan, onTimeout, remainingSeconds }) {
  const scannerRef = useRef(null);
  const handledTimeoutRef = useRef(false);
  const scanBusyRef = useRef(false);
  const scanCompletedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [scanError, setScanError] = useState('');
  const [scanInfo, setScanInfo] = useState('Starting camera...');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let active = true;

    async function startScanner() {
      setScanError('');
      setScanInfo(`Secure browser context: ${window.isSecureContext ? 'Yes' : 'No'}`);

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setScanError('Camera requires localhost or trusted HTTPS.');
        return;
      }

      try {
        const scanner = new Html5Qrcode(`answer-qr-scanner-${assignment.id}`);
        scannerRef.current = scanner;
        const cameras = await Html5Qrcode.getCameras();

        if (!active || !cameras.length) {
          return;
        }

        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label || '')) || cameras[0];

        setScanInfo(`Using camera: ${preferredCamera.label || 'Default camera'}`);

        await scanner.start(
          preferredCamera.id,
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
          },
          async (decodedText) => {
            if (active) {
              if (scanBusyRef.current || scanCompletedRef.current) {
                return;
              }

              scanBusyRef.current = true;
              const result = await onScanRef.current(parseAnswerToken(decodedText));

              if (result?.correct) {
                scanCompletedRef.current = true;

                if (scanner.isScanning) {
                  await scanner.stop().catch(() => {});
                }

                return;
              }

              window.setTimeout(() => {
                scanBusyRef.current = false;
              }, 1200);
            }
          },
          () => {},
        );
      } catch (error) {
        setScanError(error.message || 'Camera permission was denied or the camera is already in use.');
      }
    }

    startScanner();

    return () => {
      active = false;

      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [assignment.id]);

  useEffect(() => {
    if (remainingSeconds <= 0 && !handledTimeoutRef.current) {
      handledTimeoutRef.current = true;
      onTimeout(assignment.id);
    }
  }, [assignment.id, onTimeout, remainingSeconds]);

  return (
    <>
      <div className="qr-scanner-frame qr-pair-scanner-frame">
        <div id={`answer-qr-scanner-${assignment.id}`} />
        <span className="qr-scan-corner top-left" />
        <span className="qr-scan-corner top-right" />
        <span className="qr-scan-corner bottom-left" />
        <span className="qr-scan-corner bottom-right" />
      </div>
      <p className="muted qr-scanner-info">{scanInfo}</p>
      {scanError && <Feedback text={scanError} />}
    </>
  );
}

function QrPairGamePanel({
  feedback,
  module,
  onQrPairReady,
  onQrPairScan,
  onQrPairTimeout,
  session,
  student,
}) {
  const [, forceTick] = useState(0);
  const { assignment, participant, role } = getQrPairAssignment(session, student);
  const currentTurn = session.qrPair?.currentTurn;
  const currentQuestion = module.questions.find((question) => question.id === assignment?.questionId);
  const isPaused = session.status === 'paused';
  const { resumeCountdown, resumeCountdownActive, resumeStartedAt } = useResumeCountdown(isPaused);
  const [startCountdown, setStartCountdown] = useState(null);
  const startCountdownActive = startCountdown !== null;

  useEffect(() => {
    if (!currentTurn || !participant || currentTurn.turnNumber !== 1 || isPaused || resumeCountdownActive) {
      return;
    }

    const countdownKey = `qr-pair-start-countdown-${session.id}-${participant.participantId}`;

    if (window.sessionStorage.getItem(countdownKey) === 'done' || startCountdown !== null) {
      return;
    }

    setStartCountdown(3);
  }, [
    currentTurn,
    isPaused,
    participant,
    resumeCountdownActive,
    session.id,
    startCountdown,
  ]);

  useEffect(() => {
    if (startCountdown === null || isPaused || resumeCountdownActive) {
      return undefined;
    }

    if (startCountdown <= 1) {
      const timer = window.setTimeout(() => {
        if (participant?.participantId) {
          window.sessionStorage.setItem(`qr-pair-start-countdown-${session.id}-${participant.participantId}`, 'done');
        }

        setStartCountdown(null);
      }, 850);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setStartCountdown((currentCount) => Math.max((currentCount || 1) - 1, 1));
    }, 850);

    return () => window.clearTimeout(timer);
  }, [isPaused, participant?.participantId, resumeCountdownActive, session.id, startCountdown]);

  useEffect(() => {
    if (isPaused || resumeCountdownActive || startCountdownActive) {
      return undefined;
    }

    const timer = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, resumeCountdownActive, startCountdownActive]);

  const remainingSeconds = useMemo(() => {
    if (!currentTurn?.startedAt || !assignment) {
      return session.roundSeconds;
    }

    const referenceTime = isPaused && session.pausedAt
      ? new Date(session.pausedAt).getTime()
      : resumeCountdownActive && resumeStartedAt
        ? resumeStartedAt
        : Date.now();
    const elapsedSeconds = Math.max(
      Math.floor((referenceTime - new Date(currentTurn.startedAt).getTime()) / 1000),
      0,
    );
    const penaltySeconds = assignment.wrongScanCount * session.wrongScanPenaltySeconds;
    return Math.max(session.roundSeconds - elapsedSeconds - penaltySeconds, 0);
  }, [
    assignment,
    currentTurn?.startedAt,
    isPaused,
    resumeCountdownActive,
    resumeStartedAt,
    session.pausedAt,
    session.roundSeconds,
    session.wrongScanPenaltySeconds,
  ]);

  if (!currentTurn || !assignment || !participant || !currentQuestion) {
    return <EmptyState text="Waiting for QR Pair Match assignment." />;
  }

  if (isPaused) {
    return (
      <>
        <section className="panel game-panel qr-pair-game-panel">
          <p className="eyebrow">QR Pair Match Paused</p>
          <h2>Waiting For Teacher To Resume</h2>
          <p className="muted">
            Your current round is frozen. Stay on this page until the teacher resumes.
          </p>
          <div className="qr-pair-waiting-box">
            <div className="logout-spinner" aria-hidden="true" />
            <strong>Session paused</strong>
          </div>
        </section>
        <SessionPausedOverlay />
      </>
    );
  }

  if (resumeCountdownActive) {
    return <ResumeCountdownOverlay count={resumeCountdown} />;
  }

  if (startCountdownActive) {
    return (
      <section className="panel game-panel classic-countdown-panel qr-pair-countdown-panel">
        <p className="eyebrow">QR Pair Match</p>
        <h2>Get Ready</h2>
        <div className="classic-countdown-number" key={startCountdown}>
          {startCountdown}
        </div>
        <p className="muted">Your role will appear after the countdown.</p>
      </section>
    );
  }

  const pairCompleted = assignment.status !== 'pending';
  const pairAssignments = currentTurn.assignments.filter((item) => item.assignmentType === 'pair');
  const allPairsCompleted = pairAssignments.every((item) => item.status !== 'pending');
  const answerQrValue = `fyp-answer:${assignment.answerQrToken}`;
  const answerQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(answerQrValue)}`;
  const isReady = role === 'question_holder'
    ? assignment.questionHolderReady
    : assignment.answerHolderReady;
  const isFinalExplanation = allPairsCompleted && isFinalQrPairExplanation(session);
  const isAnswerRole = role === 'answer_holder' || role === 'decoy_answer_holder';

  if (isAnswerRole && !allPairsCompleted) {
    return (
      <section className="panel game-panel qr-pair-game-panel">
        <p className="eyebrow">
          {role === 'decoy_answer_holder' ? 'Decoy Answer Holder' : 'Answer Holder'} - Turn {currentTurn.turnNumber}
        </p>
        <h2>Keep showing your answer QR</h2>
        <p>
          Answer: <strong>{currentQuestion.correctAnswer || currentQuestion.answer}</strong>
        </p>
        {role === 'decoy_answer_holder' && (
          <p className="muted">This is a decoy answer for this round.</p>
        )}
        <div className="answer-holder-qr-wrap">
          <img className="qr-code-image answer-holder-qr" src={answerQrUrl} alt="Answer QR code" />
        </div>
        <p className="muted">
          Stay on this screen until all question holders finish or time runs out.
        </p>
        <Feedback text={feedback} />
      </section>
    );
  }

  if (role !== 'decoy_answer_holder' && pairCompleted && !allPairsCompleted) {
    return (
      <section className="panel game-panel qr-pair-game-panel">
        <p className="eyebrow">QR Pair Match Turn {currentTurn.turnNumber}</p>
        <h2>{assignment.status === 'correct' ? 'Answer Submitted' : 'Time Is Up'}</h2>
        <p className="muted">
          Waiting for other question holders to find their answers.
        </p>
        <div className="qr-pair-waiting-box">
          <div className="logout-spinner" aria-hidden="true" />
          <strong>
            {pairAssignments.filter((item) => item.status !== 'pending').length} /{' '}
            {pairAssignments.length} pairs completed
          </strong>
        </div>
        <Feedback text={feedback} />
      </section>
    );
  }

  if ((pairCompleted || role === 'decoy_answer_holder') && allPairsCompleted) {
    return (
      <section className="panel game-panel qr-pair-game-panel">
        <p className="eyebrow">QR Pair Match Turn {currentTurn.turnNumber}</p>
        <h2>{assignment.status === 'correct' ? 'Round Completed' : 'Time Is Up'}</h2>
        <p className="muted">
          Question: <strong>{currentQuestion.question}</strong>
        </p>
        <p>
          Correct Answer: <strong>{currentQuestion.correctAnswer || currentQuestion.answer}</strong>
        </p>
        <div className="explanation-box">
          <h3>Explanation</h3>
          <p>{currentQuestion.explanation || 'No explanation provided for this question.'}</p>
        </div>
        <StudentRoundRankCard participant={participant} session={session} />
        <button className="primary-button" disabled={isReady} type="button" onClick={onQrPairReady}>
          {isReady
            ? isFinalExplanation
              ? 'Preparing Result'
              : 'Waiting For Others'
            : isFinalExplanation
              ? 'View Result'
              : 'Next Question'}
        </button>
        <Feedback text={feedback} />
      </section>
    );
  }

  return (
    <section className="panel game-panel qr-pair-game-panel">
      <p className="eyebrow">Question Holder - Turn {currentTurn.turnNumber}</p>
      <h2>{currentQuestion.question}</h2>
      <div className="qr-pair-status-row">
        <strong>{remainingSeconds}s left</strong>
        <span>{assignment.wrongScanCount} wrong scans</span>
      </div>
      <p className="muted">Find the correct answer holder and scan their QR code.</p>
      <QrPairScanner
        assignment={assignment}
        remainingSeconds={remainingSeconds}
        onScan={onQrPairScan}
        onTimeout={onQrPairTimeout}
      />
      <Feedback text={feedback} />
    </section>
  );
}

function getClassicOptions(module, question) {
  if (question?.options?.length) {
    return question.options.filter((option) => option.text);
  }

  return getAnswerOptions(module, question).map((answer, index) => ({
    key: ['A', 'B', 'C', 'D'][index] || String(index + 1),
    text: answer,
  }));
}

function getStudentResponses(session, participant) {
  return (session.responses || []).filter(
    (response) => response.participantId === participant?.participantId,
  );
}

function formatRankSeconds(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return '-';
  }

  return `${Number(seconds).toFixed(Number(seconds) % 1 === 0 ? 0 : 1)}s`;
}

function getParticipantTimingAttempts(session, participant, latestAttempt = null) {
  const participantId = participant?.participantId;

  if (!participantId) {
    return [];
  }

  const responseAttempts = (session.responses || [])
    .filter((response) => response.participantId === participantId && response.answeredSeconds !== null)
    .map((response) => Number(response.answeredSeconds))
    .filter((seconds) => Number.isFinite(seconds));

  const qrAttempts = (session.qrPair?.turns || [])
    .flatMap((turn) => turn.assignments || [])
    .filter(
      (assignment) =>
        assignment.assignmentType === 'pair' &&
        assignment.questionHolderParticipantId === participantId &&
        assignment.answeredSeconds !== null,
    )
    .map((assignment) => Number(assignment.answeredSeconds))
    .filter((seconds) => Number.isFinite(seconds));

  const attempts = [...responseAttempts, ...qrAttempts];
  const latestAttemptAlreadyStored =
    latestAttempt?.questionId &&
    (session.responses || []).some(
      (response) =>
        response.participantId === participantId &&
        Number(response.questionId) === Number(latestAttempt.questionId),
    );

  if (
    latestAttempt &&
    !latestAttemptAlreadyStored &&
    latestAttempt.answeredSeconds !== null &&
    latestAttempt.answeredSeconds !== undefined &&
    Number.isFinite(Number(latestAttempt.answeredSeconds))
  ) {
    attempts.push(Number(latestAttempt.answeredSeconds));
  }

  return attempts;
}

function getStudentRoundRank(session, participant, latestAttempt = null) {
  if (!session?.participants?.length || !participant?.participantId) {
    return null;
  }

  const rows = (session.participants || []).map((item) => {
    const timingAttempts = getParticipantTimingAttempts(
      session,
      item,
      item.participantId === participant.participantId ? latestAttempt : null,
    );
    const latestAttemptAlreadyStored =
      latestAttempt?.questionId &&
      item.participantId === participant.participantId &&
      (session.responses || []).some(
        (response) =>
          response.participantId === item.participantId &&
          Number(response.questionId) === Number(latestAttempt.questionId),
      );
    const projectedScore =
      (item.score || 0) +
      (item.participantId === participant.participantId && latestAttempt && !latestAttemptAlreadyStored
        ? latestAttempt.scoreAwarded || 0
        : 0);
    const averageSeconds = timingAttempts.length
      ? timingAttempts.reduce((total, seconds) => total + seconds, 0) / timingAttempts.length
      : null;

    return {
      averageSeconds,
      participant: item,
      score: projectedScore,
    };
  });

  const rankedRows = leaderboardRanker.rankByScoreTimeAndName(rows, {
    nameSelector: (row) => row.participant.name,
    timeSelector: (row) => row.averageSeconds,
  });

  const currentIndex = rankedRows.findIndex(
    (row) => row.participant.participantId === participant.participantId,
  );

  if (currentIndex === -1) {
    return null;
  }

  const currentRow = rankedRows[currentIndex];
  const leader = rankedRows[0];

  return {
    averageSeconds: currentRow.averageSeconds,
    leaderName: leader?.participant?.name || '',
    pointsBehindLeader: Math.max((leader?.score || 0) - currentRow.score, 0),
    rank: currentIndex + 1,
    score: currentRow.score,
    totalPlayers: rankedRows.length,
  };
}

function StudentRoundRankCard({ latestAttempt = null, participant, session }) {
  const rankInfo = getStudentRoundRank(session, participant, latestAttempt);

  if (!rankInfo) {
    return null;
  }

  const isLeader = rankInfo.rank === 1;

  return (
    <section className="student-round-rank-card" aria-label="Current session rank">
      <div>
        <p className="eyebrow">Current Rank</p>
        <h3>
          #{rankInfo.rank} <span>/ {rankInfo.totalPlayers}</span>
        </h3>
      </div>
      <div className="student-round-rank-details">
        <strong>{rankInfo.score} pts</strong>
        <span>Avg time: {formatRankSeconds(rankInfo.averageSeconds)}</span>
      </div>
      <p>
        {isLeader
          ? 'You are currently leading this session.'
          : `${rankInfo.pointsBehindLeader} pts behind ${rankInfo.leaderName || 'the leader'}.`}
      </p>
    </section>
  );
}

function getNextClassicQuestionIndex(session, participant) {
  const answeredQuestionIds = new Set(
    getStudentResponses(session, participant).map((response) => response.questionId),
  );

  return (session.questionIds || []).findIndex((questionId) => !answeredQuestionIds.has(questionId));
}

function getCorrectAnswerText(question) {
  return question?.options?.find((option) => option.key === question.correctOption)?.text ||
    question?.correctAnswer ||
    question?.answer ||
    '-';
}

function SessionPausedOverlay() {
  return (
    <div className="session-paused-overlay" role="status">
      <div className="session-paused-card">
        <div className="session-paused-pulse" aria-hidden="true" />
        <p className="eyebrow">Session Paused</p>
        <h2>Waiting For Teacher To Resume</h2>
        <p>The game is temporarily paused. Stay on this page.</p>
      </div>
    </div>
  );
}

function ResumeCountdownOverlay({ count }) {
  return (
    <div className="session-paused-overlay session-resume-overlay" role="status">
      <div className="session-paused-card session-resume-card">
        <p className="eyebrow">Session Resuming</p>
        <h2>Get Ready</h2>
        <div className="classic-countdown-number" key={count}>
          {count}
        </div>
      </div>
    </div>
  );
}

function useResumeCountdown(isPaused) {
  const previousPausedRef = useRef(isPaused);
  const resumeStartedAtRef = useRef(null);
  const [resumeCountdown, setResumeCountdown] = useState(null);
  const resumeCountdownStarting = previousPausedRef.current && !isPaused;

  useEffect(() => {
    if (previousPausedRef.current && !isPaused) {
      resumeStartedAtRef.current = Date.now();
      setResumeCountdown(3);
    }

    previousPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (resumeCountdown === null) {
      return undefined;
    }

    if (resumeCountdown <= 1) {
      const timer = window.setTimeout(() => {
        setResumeCountdown(null);
        resumeStartedAtRef.current = null;
      }, 850);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setResumeCountdown((currentCount) => Math.max((currentCount || 1) - 1, 1));
    }, 850);

    return () => window.clearTimeout(timer);
  }, [resumeCountdown]);

  return {
    resumeCountdown: resumeCountdown ?? (resumeCountdownStarting ? 3 : null),
    resumeCountdownActive: resumeCountdown !== null || resumeCountdownStarting,
    resumeStartedAt: resumeStartedAtRef.current || (resumeCountdownStarting ? Date.now() : null),
  };
}

function ClassicMcqGamePanel({
  feedback,
  module,
  onClassicCompleted,
  onResults,
  onSubmit,
  session,
  student,
}) {
  const participant = session.participants.find((item) => item.id === student.id);
  const leaderboard = leaderboardRanker.rankByScore(session.participants || []);
  const totalQuestions = session.questionIds?.length || 0;
  const answeredCount = getStudentResponses(session, participant).length;
  const initialQuestionIndex = Math.max(getNextClassicQuestionIndex(session, participant), 0);
  const [phase, setPhase] = useState(answeredCount >= totalQuestions ? 'waiting' : 'countdown');
  const [countdown, setCountdown] = useState(answeredCount > 0 ? 0 : 3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [remainingSeconds, setRemainingSeconds] = useState(session.roundSeconds || 60);
  const [lastResult, setLastResult] = useState(null);
  const questionStartedAtRef = useRef(Date.now());
  const pauseStartedAtRef = useRef(null);
  const timerQuestionIdRef = useRef(null);
  const submitBusyRef = useRef(false);
  const revealTimerRef = useRef(null);
  const completionCheckedRef = useRef(false);
  const isPaused = session.status === 'paused';
  const { resumeCountdown, resumeCountdownActive } = useResumeCountdown(isPaused);

  const currentQuestionId = session.questionIds?.[currentQuestionIndex];
  const currentQuestion = module.questions.find((question) => question.id === currentQuestionId);
  const options = getClassicOptions(module, currentQuestion);
  const correctAnswerText = getCorrectAnswerText(currentQuestion);

  function getNextUnansweredQuestionIndex(extraAnsweredQuestionId = null) {
    const answeredQuestionIds = new Set(
      getStudentResponses(session, participant).map((response) => response.questionId),
    );

    if (extraAnsweredQuestionId) {
      answeredQuestionIds.add(extraAnsweredQuestionId);
    }

    return (session.questionIds || []).findIndex((questionId) => !answeredQuestionIds.has(questionId));
  }

  useEffect(() => {
    completionCheckedRef.current = false;
  }, [session.id]);

  useEffect(() => {
    if (phase === 'waiting' || phase === 'feedback' || phase === 'explanation') {
      return;
    }

    const nextIndex = getNextUnansweredQuestionIndex(lastResult?.question?.id);

    if (nextIndex === -1) {
      setPhase('waiting');
      return;
    }

    setCurrentQuestionIndex(nextIndex);
  }, [participant?.participantId, phase, session.responses, session.questionIds]);

  useEffect(() => {
    if (isPaused) {
      pauseStartedAtRef.current = Date.now();
      return;
    }

    if (!resumeCountdownActive && pauseStartedAtRef.current) {
      questionStartedAtRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
  }, [isPaused, resumeCountdownActive]);

  useEffect(() => {
    if (phase !== 'countdown') {
      return undefined;
    }

    if (isPaused || resumeCountdownActive) {
      return undefined;
    }

    if (countdown <= 0) {
      questionStartedAtRef.current = Date.now();
      setPhase('question');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((currentCount) => currentCount - 1);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [countdown, isPaused, phase, resumeCountdownActive]);

  useEffect(() => {
    if (phase !== 'question' || !session.timerEnabled) {
      return undefined;
    }

    if (isPaused || resumeCountdownActive) {
      return undefined;
    }

    if (timerQuestionIdRef.current !== currentQuestion?.id) {
      questionStartedAtRef.current = Date.now();
      timerQuestionIdRef.current = currentQuestion?.id || null;
      setRemainingSeconds(session.roundSeconds || 60);
    }

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - questionStartedAtRef.current) / 1000);
      const nextRemainingSeconds = Math.max((session.roundSeconds || 60) - elapsedSeconds, 0);
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds <= 0) {
        window.clearInterval(timer);
        submitClassicAnswer('', true);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [currentQuestion?.id, isPaused, phase, resumeCountdownActive, session.roundSeconds, session.timerEnabled]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'waiting' && !completionCheckedRef.current) {
      completionCheckedRef.current = true;
      onClassicCompleted?.();
    }
  }, [onClassicCompleted, phase]);

  async function submitClassicAnswer(optionKey, isTimeout = false) {
    if (isPaused || resumeCountdownActive || submitBusyRef.current || !currentQuestion) {
      return;
    }

    submitBusyRef.current = true;
    const elapsedSeconds = session.timerEnabled
      ? Math.min(
          Math.floor((Date.now() - questionStartedAtRef.current) / 1000),
          session.roundSeconds || 60,
        )
      : 0;
    const result = await onSubmit({
      answer: optionKey,
      elapsedSeconds,
      isTimeout,
      questionId: currentQuestion.id,
    });

    submitBusyRef.current = false;

    if (!result?.response) {
      return;
    }

    setLastResult({
      answeredSeconds: result.response.answeredSeconds,
      correct: result.response.correct,
      question: currentQuestion,
      responseStatus: result.response.responseStatus,
      scoreAwarded: result.response.scoreAwarded || 0,
      selectedOption: isTimeout ? '' : optionKey,
    });
    setPhase('feedback');

    revealTimerRef.current = window.setTimeout(() => {
      setPhase('explanation');
    }, 3000);
  }

  function goNextQuestion() {
    if (isPaused || resumeCountdownActive) {
      return;
    }

    const nextIndex = getNextClassicQuestionIndex(session, participant);

    if (nextIndex === -1) {
      setPhase('waiting');
      return;
    }

    const fallbackNextIndex = Math.min(currentQuestionIndex + 1, totalQuestions - 1);

    setLastResult(null);
    setCurrentQuestionIndex(nextIndex >= 0 ? nextIndex : fallbackNextIndex);
    questionStartedAtRef.current = Date.now();
    timerQuestionIdRef.current = null;
    setRemainingSeconds(session.roundSeconds || 60);
    setPhase('question');
  }

  if (!participant) {
    return <EmptyState text="Waiting for your player record." />;
  }

  if (!currentQuestion && phase !== 'waiting') {
    return <EmptyState text="No question is available for this session." />;
  }

  if (phase === 'countdown') {
    return (
      <>
        <section className="panel game-panel classic-mcq-panel classic-countdown-panel">
          <p className="eyebrow">Classic MCQ</p>
          <h2>Get Ready</h2>
          <div className="classic-countdown-number" key={countdown}>
            {countdown || 'Start'}
          </div>
          <p className="muted">The question will appear after the countdown.</p>
        </section>
        {isPaused && <SessionPausedOverlay />}
        {resumeCountdownActive && <ResumeCountdownOverlay count={resumeCountdown} />}
      </>
    );
  }

  if (phase === 'waiting') {
    return (
      <>
        <section className="panel game-panel classic-mcq-panel classic-result-waiting-panel">
          <p className="eyebrow">Classic MCQ Completed</p>
          <h2>Waiting For Results</h2>
          <p className="muted">
            You answered {answeredCount} / {totalQuestions} questions. Watch the live leaderboard while other students finish.
          </p>
          <ClassicLiveLeaderboard
            session={{ ...session, participants: leaderboard }}
            title="Live Leaderboard"
          />
          {session.status === 'ended' && (
            <button className="primary-button" type="button" onClick={onResults}>
              View Result
            </button>
          )}
          <Feedback text={feedback} />
        </section>
        {isPaused && <SessionPausedOverlay />}
        {resumeCountdownActive && <ResumeCountdownOverlay count={resumeCountdown} />}
      </>
    );
  }

  if (phase === 'explanation' && lastResult) {
    const isLastQuestion = getNextUnansweredQuestionIndex(lastResult.question.id) === -1;
    const explanationStatusClass = lastResult.responseStatus === 'timeout'
      ? 'timeout'
      : lastResult.correct
        ? 'correct'
        : 'wrong';

    return (
      <>
        <section className="panel game-panel classic-mcq-panel classic-explanation-panel">
          <div className="classic-explanation-main">
            <p className="eyebrow">Explanation</p>
            <h2 className={`classic-explanation-result ${explanationStatusClass}`}>
              {lastResult.responseStatus === 'timeout' ? 'Time Is Up' : lastResult.correct ? 'Correct' : 'Wrong'}
            </h2>
            <p className={`classic-explanation-answer ${explanationStatusClass}`}>
              Correct Answer: <strong>{getCorrectAnswerText(lastResult.question)}</strong>
            </p>
          </div>
          <StudentRoundRankCard
            latestAttempt={{
              answeredSeconds: lastResult.answeredSeconds,
              questionId: lastResult.question.id,
              scoreAwarded: lastResult.scoreAwarded,
            }}
            participant={participant}
            session={session}
          />
          <div className="explanation-box">
            <h3>Explanation</h3>
            <p>{lastResult.question.explanation || 'No explanation provided for this question.'}</p>
          </div>
          <button className="primary-button classic-next-button" type="button" onClick={goNextQuestion}>
            {isLastQuestion ? 'View Leaderboard' : 'Next Question'}
          </button>
          <Feedback text={feedback} />
        </section>
        {isPaused && <SessionPausedOverlay />}
        {resumeCountdownActive && <ResumeCountdownOverlay count={resumeCountdown} />}
      </>
    );
  }

  const isFeedback = phase === 'feedback' && lastResult;

  return (
    <>
    <section className="panel game-panel classic-mcq-panel">
      <div className="classic-question-header">
        <div>
          <p className="eyebrow">Classic MCQ Question {currentQuestionIndex + 1} / {totalQuestions}</p>
          <h2>{currentQuestion.question}</h2>
        </div>
        {session.timerEnabled && (
          <strong className={remainingSeconds <= 5 ? 'classic-timer urgent' : 'classic-timer'}>
            {remainingSeconds}s
          </strong>
        )}
      </div>
      <p className="muted">Student: {student.name}</p>
      <p className="score-text">Score: {participant.score || 0}</p>
      <div className={isFeedback ? 'answer-grid classic-answer-grid feedback' : 'answer-grid classic-answer-grid'}>
        {options.map((option) => {
          const isSelected = lastResult?.selectedOption === option.key;
          const isCorrect = currentQuestion.correctOption === option.key;
          const shouldShow = !isFeedback || isSelected || isCorrect;
          const buttonClass = isFeedback
            ? isCorrect
              ? 'answer-option correct'
              : isSelected
                ? 'answer-option wrong'
                : 'answer-option hidden'
            : 'answer-option';

          if (!shouldShow) {
            return null;
          }

          return (
            <button
              className={buttonClass}
                disabled={isPaused || resumeCountdownActive || isFeedback || submitBusyRef.current}
              key={option.key}
              type="button"
              onClick={() => submitClassicAnswer(option.key)}
            >
              <span>{option.key}</span>
              <strong>{option.text}</strong>
            </button>
          );
        })}
      </div>
      <Feedback text={feedback} />
    </section>
    {isPaused && <SessionPausedOverlay />}
    {resumeCountdownActive && <ResumeCountdownOverlay count={resumeCountdown} />}
    </>
  );
}

export function GamePanel({
  session,
  module,
  student,
  feedback,
  onClassicCompleted,
  onQrPairReady,
  onQrPairScan,
  onQrPairTimeout,
  onSubmit,
  onResults,
}) {
  if (!session || !module || !student) {
    return <EmptyState text="Join a live session first." />;
  }

  if (session.status === 'ended') {
    return (
      <section className="panel">
        <h2>Game ended</h2>
        <button className="primary-button" type="button" onClick={onResults}>
          View Results
        </button>
      </section>
    );
  }

  if (session.gameType === 'qr_pair_match') {
    return (
      <QrPairGamePanel
        feedback={feedback}
        module={module}
        session={session}
        student={student}
        onQrPairReady={onQrPairReady}
        onQrPairScan={onQrPairScan}
        onQrPairTimeout={onQrPairTimeout}
      />
    );
  }

  return (
    <ClassicMcqGamePanel
      feedback={feedback}
      module={module}
      session={session}
      student={student}
      onClassicCompleted={onClassicCompleted}
      onResults={onResults}
      onSubmit={onSubmit}
    />
  );
}
