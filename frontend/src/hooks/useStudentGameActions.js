import {
  endClassicSessionIfAllCompleted,
  fetchSessionDetails,
  markQrPairReady,
  markQrPairTimeout,
  submitClassicMcqAnswer,
  submitQrPairScan,
} from '../services/sessionService.js';
import { upsertById } from '../utils/appHelpers.js';

export function useStudentGameActions({
  activeModule,
  activeSession,
  go,
  setActiveSessionId,
  setFeedback,
  setSessions,
  student,
}) {
  async function submitAnswer({ answer, elapsedSeconds = 0, isTimeout = false, questionId }) {
    if (!activeSession || !activeModule || !student) {
      return null;
    }

    if (activeSession.status === 'paused') {
      setFeedback('Session is paused. Waiting for teacher to resume.');
      return null;
    }

    const currentParticipant = activeSession.participants.find(
      (participant) => participant.id === student.id,
    );
    const currentQuestion = activeModule.questions.find(
      (question) => question.id === Number(questionId),
    );

    if (!currentParticipant || !currentQuestion) {
      setFeedback('Unable to submit this answer.');
      return null;
    }

    try {
      const result = await submitClassicMcqAnswer({
        answer,
        elapsedSeconds,
        isTimeout,
        participant: currentParticipant,
        question: currentQuestion,
        session: activeSession,
      });
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback(
        result.response?.responseStatus === 'timeout'
          ? 'Time is up. 0 points.'
          : result.response?.correct
            ? `Correct. +${result.response.scoreAwarded || 0} points.`
            : 'Wrong answer. 0 points.',
      );
      return result;
    } catch (error) {
      setFeedback(error.message);
      return null;
    }
  }

  async function completeClassicMcqProgress() {
    if (!activeSession || activeSession.gameType !== 'classic_mcq') {
      return;
    }

    try {
      const latestSession = await fetchSessionDetails(activeSession.id, activeModule);
      const endedSession = await endClassicSessionIfAllCompleted(latestSession);

      if (endedSession) {
        const refreshedSession = await fetchSessionDetails(activeSession.id, activeModule);
        setSessions((currentSessions) => upsertById(currentSessions, refreshedSession));
        setActiveSessionId(refreshedSession.id);
        go('session-results', { replace: true });
        return;
      }

      setSessions((currentSessions) => upsertById(currentSessions, latestSession));
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function submitQrPairAnswerToken(token) {
    if (!activeSession || !activeModule || !student) {
      return undefined;
    }

    if (activeSession.status === 'paused') {
      setFeedback('Session is paused. Waiting for teacher to resume.');
      return { correct: false };
    }

    const currentParticipant = activeSession.participants.find(
      (participant) => participant.id === student.id,
    );

    if (!currentParticipant?.participantId) {
      setFeedback('Unable to identify your session participant.');
      return undefined;
    }

    try {
      const result = await submitQrPairScan({
        sessionId: activeSession.id,
        questionHolderParticipantId: currentParticipant.participantId,
        token,
      });
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback(
        result.correct
          ? `Correct scan. +${result.scoreAwarded} points.`
          : 'Wrong QR. Timer shortened.',
      );
      return result;
    } catch (error) {
      setFeedback(error.message);
      return { correct: false };
    }
  }

  async function timeoutQrPairAssignment(assignmentId) {
    if (!activeSession || !activeModule || activeSession.status === 'paused') {
      return;
    }

    try {
      await markQrPairTimeout({ assignmentId });
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback('Time is up. Move to explanation.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function readyForNextQrPairTurn() {
    if (!activeSession || !activeModule || !student) {
      return;
    }

    const currentParticipant = activeSession.participants.find(
      (participant) => participant.id === student.id,
    );

    if (!currentParticipant?.participantId) {
      setFeedback('Unable to identify your session participant.');
      return;
    }

    try {
      await markQrPairReady({
        session: activeSession,
        participantId: currentParticipant.participantId,
      });
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));

      if (updatedSession.status === 'ended') {
        setFeedback('');
        setActiveSessionId(updatedSession.id);
        go('session-results', { replace: true });
        return;
      }

      setFeedback('Ready for next turn.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return {
    completeClassicMcqProgress,
    readyForNextQrPairTurn,
    submitAnswer,
    submitQrPairAnswerToken,
    timeoutQrPairAssignment,
  };
}
