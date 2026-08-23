import {
  endClassicSessionIfAllCompleted,
  fetchSessionDetails,
  leaveDatabaseSession,
  markClassicParticipantLeft,
  updateDatabaseSessionStatus,
} from '../services/sessionService.js';
import { upsertById } from '../utils/appHelpers.js';

export function useStudentSessionLeaveActions({
  activeModule,
  activeSession,
  clearJoinSessionState,
  currentUser,
  go,
  modules,
  setActiveSessionId,
  setFeedback,
  setPage,
  setSessions,
  setStudent,
  setStudentSessionLeavePromptOpen,
  student,
  studentSession,
}) {
  function getCurrentStudentParticipant(session) {
    if (!session || currentUser?.role !== 'student') {
      return null;
    }

    return (session.participants || []).find(
      (participant) =>
        participant.studentId === currentUser.id ||
        participant.id === currentUser.id ||
        participant.studentId === student?.id,
    );
  }

  async function leaveWaitingRoom() {
    if (!studentSession || currentUser?.role !== 'student') {
      go('student-dashboard');
      return;
    }

    try {
      await leaveDatabaseSession({
        sessionId: studentSession.id,
        studentId: currentUser.id,
      });
      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === studentSession.id
            ? {
                ...session,
                participants: session.participants.filter(
                  (participant) => participant.studentId !== currentUser.id,
                ),
              }
            : session,
        ),
      );
      setStudent((currentStudent) => ({
        ...currentStudent,
        sessionId: null,
      }));
      setActiveSessionId(null);
      clearJoinSessionState();
      setFeedback('You left the waiting room.');
      setPage('student-dashboard');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function leaveActiveStudentGameSession() {
    const currentSession = activeSession || studentSession;

    if (!currentSession || currentUser?.role !== 'student') {
      go('student-dashboard');
      return;
    }

    const currentModule =
      activeModule ||
      modules.find((module) => module.id === Number(currentSession.moduleId));
    const currentParticipant = getCurrentStudentParticipant(currentSession);

    try {
      setStudentSessionLeavePromptOpen(false);

      if (currentSession.gameType === 'qr_pair_match') {
        await updateDatabaseSessionStatus(
          currentSession.id,
          'ended',
          currentSession.currentQuestionIndex || 0,
        );

        const updatedSession = currentModule
          ? await fetchSessionDetails(currentSession.id, currentModule)
          : { ...currentSession, status: 'ended' };

        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
        setActiveSessionId(currentSession.id);
        setStudent((currentStudent) => ({
          ...currentStudent,
          sessionId: currentSession.id,
        }));
        setFeedback('QR Pair Match ended because you left the game.');
        go('session-results');
        return;
      }

      await markClassicParticipantLeft({
        participant: currentParticipant,
        session: currentSession,
      });

      if (currentModule) {
        const latestSession = await fetchSessionDetails(currentSession.id, currentModule);
        const endedSession = await endClassicSessionIfAllCompleted(latestSession);
        const refreshedSession = endedSession
          ? await fetchSessionDetails(currentSession.id, currentModule)
          : latestSession;

        setSessions((currentSessions) => upsertById(currentSessions, refreshedSession));
      }

      setStudent((currentStudent) => ({
        ...currentStudent,
        sessionId: null,
      }));
      setActiveSessionId(null);
      clearJoinSessionState();
      setFeedback('You left the game session.');
      go('student-dashboard');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return {
    leaveActiveStudentGameSession,
    leaveWaitingRoom,
  };
}
