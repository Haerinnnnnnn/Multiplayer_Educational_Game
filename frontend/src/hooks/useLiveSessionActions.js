import {
  deleteDatabaseSession,
  fetchSessionDetails,
  leaveDatabaseSession,
  pauseDatabaseSession,
  resumeDatabaseSession,
  startQrPairSession,
  updateDatabaseSessionStatus,
} from '../services/sessionService.js';
import { upsertById } from '../utils/appHelpers.js';
import { GameSession } from '../domain/sessions/GameSession.js';

export function useLiveSessionActions({
  activeModule,
  activeSession,
  clearJoinSessionState,
  currentUser,
  go,
  setActiveSessionId,
  setClosedSessionNotice,
  setFeedback,
  setPage,
  setSessions,
  setTeacherDashboardInitialTab,
  setTeacherResultBackTarget,
  updateSession,
}) {
  async function startGame() {
    if (!activeSession) {
      return;
    }

    const gameSession = GameSession.from(activeSession);

    if (!gameSession.isLobby()) {
      setFeedback('This session has already started or ended.');
      return;
    }

    if (!gameSession.hasParticipants()) {
      setFeedback('At least 1 student must join before starting the game.');
      return;
    }

    try {
      if (activeSession.gameType === 'qr_pair_match') {
        await startQrPairSession(activeSession);
      } else {
        await updateDatabaseSessionStatus(activeSession.id, gameSession.start().status, 0);
      }

      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback('');
      go('teacher-control', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function endSession() {
    if (!activeSession) {
      return;
    }

    try {
      const endedSession = GameSession.from(activeSession).end();

      await updateDatabaseSessionStatus(
        activeSession.id,
        endedSession.status,
        activeSession.currentQuestionIndex,
      );
      updateSession(activeSession.id, () => endedSession);
      clearJoinSessionState();

      if (currentUser?.role === 'teacher') {
        setTeacherResultBackTarget('home');
      }

      go(
        currentUser?.role === 'teacher' ? 'session-summary-loading' : 'session-results',
        { replace: true },
      );
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function pauseSession() {
    if (!activeSession || !GameSession.from(activeSession).isLive()) {
      return;
    }

    try {
      await pauseDatabaseSession(activeSession.id, activeSession.currentQuestionIndex);
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback('Session paused. Students are waiting for you to resume.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function resumeSession() {
    if (!activeSession || !GameSession.from(activeSession).isPaused()) {
      return;
    }

    try {
      await resumeDatabaseSession(activeSession.id, activeSession.currentQuestionIndex);
      const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      setFeedback('Session resumed.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function closeLobbySession() {
    if (!activeSession) {
      return;
    }

    try {
      await deleteDatabaseSession(activeSession.id);
      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== activeSession.id),
      );
      setActiveSessionId(null);
      clearJoinSessionState();
      setTeacherDashboardInitialTab('home');
      setClosedSessionNotice({
        audience: 'teacher',
        eyebrow: 'Room Closed',
        title: 'Closing session room',
        message: 'Please wait while this lobby room is removed.',
        returnPage: 'teacher-dashboard',
      });
      setPage('session-closed-loading');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function kickLobbyStudent(participant) {
    if (!activeSession || currentUser?.role !== 'teacher' || !participant?.studentId) {
      return;
    }

    try {
      await leaveDatabaseSession({
        sessionId: activeSession.id,
        studentId: participant.studentId,
      });
      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                participants: session.participants.filter(
                  (joinedParticipant) => joinedParticipant.studentId !== participant.studentId,
                ),
              }
            : session,
        ),
      );
      setFeedback(`${participant.name} was kicked from this session.`);
    } catch (error) {
      setFeedback(error.message);
      throw error;
    }
  }

  return {
    closeLobbySession,
    endSession,
    kickLobbyStudent,
    pauseSession,
    resumeSession,
    startGame,
  };
}
