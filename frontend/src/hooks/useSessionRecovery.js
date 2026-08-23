import {
  fetchModuleWithQuestions,
  fetchOpenStudentSession,
  fetchSessionDetails,
} from '../services/sessionService.js';
import {
  clearJoinCodeFromUrl,
  getDefaultSessionForm,
  upsertById,
} from '../utils/appHelpers.js';
import { GameSession } from '../domain/sessions/GameSession.js';

export function useSessionRecovery({
  activeModule,
  activeSession,
  activeSessionId,
  currentUser,
  modules,
  page,
  setActiveSessionId,
  setClosedSessionNotice,
  setFeedback,
  setJoinForm,
  setModules,
  setPage,
  setSessionForm,
  setSessions,
  setStudent,
}) {
  function clearJoinSessionState() {
    clearJoinCodeFromUrl();
    setJoinForm((currentForm) => ({
      ...currentForm,
      code: '',
    }));
  }

  function resetCreateSessionForm(moduleList = modules) {
    setSessionForm(getDefaultSessionForm(moduleList));
  }

  function handleMissingLiveSession(error) {
    const message = error?.message || '';
    const normalizedMessage = message.toLowerCase();
    const errorCode = String(error?.code || '').toLowerCase();
    const errorStatus = String(error?.status || '');
    const isMissingSession =
      errorCode === 'pgrst116' ||
      errorStatus === '406' ||
      normalizedMessage.includes('json object requested') ||
      normalizedMessage.includes('0 rows') ||
      normalizedMessage.includes('no rows') ||
      normalizedMessage.includes('not found') ||
      normalizedMessage.includes('not acceptable') ||
      normalizedMessage.includes('pgrst116');

    if (!isMissingSession) {
      setFeedback(message);
      return;
    }

    if (currentUser?.role === 'student' && ['student-waiting', 'student-game'].includes(page)) {
      setClosedSessionNotice({
        audience: 'student',
        eyebrow: 'Room Closed',
        title: 'The teacher has closed this room',
        message: 'This session room was closed by the teacher. Bringing you back to your dashboard.',
        returnPage: 'student-dashboard',
      });
      setStudent((currentStudent) => ({
        ...currentStudent,
        sessionId: null,
      }));
      setActiveSessionId(null);
      clearJoinSessionState();
      setPage('session-closed-loading');
      return;
    }

    setFeedback(message);
  }

  function handleStudentKickedFromSession() {
    setClosedSessionNotice({
      audience: 'student',
      eyebrow: 'Removed From Session',
      title: 'You were kicked from this session',
      message: 'The teacher removed you from the lobby. Bringing you back to your dashboard.',
      returnPage: 'student-dashboard',
    });
    setStudent((currentStudent) => ({
      ...currentStudent,
      sessionId: null,
    }));
    setActiveSessionId(null);
    clearJoinSessionState();
    setPage('session-closed-loading');
  }

  async function restoreStudentOpenSession(user) {
    if (user.role !== 'student') {
      return false;
    }

    const openSessionState = await fetchOpenStudentSession(user.id);

    if (!openSessionState) {
      return false;
    }

    const { module, session } = openSessionState;
    const restoredSession = GameSession.from(session);
    const returnPage = restoredSession.getStudentPage();

    setModules((currentModules) => upsertById(currentModules, module));
    setSessions((currentSessions) => upsertById(currentSessions, session));
    setStudent({
      ...user,
      systemId: user.userCode,
      sessionId: session.id,
    });
    setActiveSessionId(session.id);
    clearJoinSessionState();
    setClosedSessionNotice({
      audience: 'student',
      eyebrow: restoredSession.isPlayable() ? 'Session Restored' : 'Waiting Room',
      title:
        restoredSession.isPlayable()
          ? 'You are still inside this session'
          : 'You were in the waiting room',
      message:
        restoredSession.isPlayable()
          ? restoredSession.isPaused()
            ? 'The game is paused. Bringing you back to the paused game.'
            : 'The game is already live. Bringing you back to the game.'
          : 'This room is still open. Bringing you back to the waiting room.',
      returnPage,
    });
    setPage('session-closed-loading');

    return true;
  }

  function updateSession(sessionId, updater) {
    setSessions((currentSessions) =>
      currentSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        return updater(session);
      }),
    );
  }

  async function refreshActiveSession() {
    if (!activeSessionId) {
      return;
    }

    try {
      let refreshedModule = activeModule;

      if (activeSession?.moduleId) {
        refreshedModule = await fetchModuleWithQuestions(activeSession.moduleId);
        setModules((currentModules) => upsertById(currentModules, refreshedModule));
      }

      const updatedSession = await fetchSessionDetails(activeSessionId, refreshedModule);
      setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
    } catch (error) {
      handleMissingLiveSession(error);
    }
  }

  return {
    clearJoinSessionState,
    handleMissingLiveSession,
    handleStudentKickedFromSession,
    refreshActiveSession,
    resetCreateSessionForm,
    restoreStudentOpenSession,
    updateSession,
  };
}
