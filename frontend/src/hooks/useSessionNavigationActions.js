import { fetchModuleWithQuestions } from '../services/sessionService.js';
import { fetchSessionDetails } from '../services/sessionService.js';
import { getDashboardPageForUser } from '../utils/appHelpers.js';
import { GameSession } from '../domain/sessions/GameSession.js';

export function useSessionNavigationActions({
  currentUser,
  go,
  modules,
  sessions,
  setActiveSessionId,
  setFeedback,
  setJoinForm,
  setSessions,
  setTeacherDashboardInitialTab,
  setTeacherResultBackTarget,
  teacherResultBackTarget,
}) {
  function openSessionResults(sessionId) {
    setActiveSessionId(sessionId);
    if (currentUser?.role === 'teacher') {
      setTeacherResultBackTarget('history');
    }
    go('session-results');
  }

  async function openStudentActivityResult(sessionId) {
    if (!sessionId) {
      setFeedback('Session result not found.');
      return;
    }

    try {
      const cachedSession = sessions.find((session) => session.id === sessionId);
      const sessionModule = cachedSession?.moduleId
        ? modules.find((module) => module.id === cachedSession.moduleId) ||
          await fetchModuleWithQuestions(cachedSession.moduleId)
        : null;
      const selectedSession = await fetchSessionDetails(sessionId, sessionModule);

      setSessions((currentSessions) => {
        const exists = currentSessions.some((session) => session.id === selectedSession.id);

        if (exists) {
          return currentSessions.map((session) =>
            session.id === selectedSession.id ? selectedSession : session,
          );
        }

        return [selectedSession, ...currentSessions];
      });

      setActiveSessionId(selectedSession.id);
      setFeedback('');
      go('session-results');
    } catch (error) {
      setFeedback(error.message || 'Unable to open this session result.');
    }
  }

  function openTeacherSessionReview(sessionId) {
    setActiveSessionId(sessionId);
    go('teacher-session-review');
  }

  function openTeacherActiveSession(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      setFeedback('Session not found. Please refresh sessions.');
      return;
    }

    setActiveSessionId(session.id);
    go(GameSession.from(session).getTeacherPage());
  }

  function backToTeacherHistory() {
    setTeacherDashboardInitialTab('history');
    go('teacher-dashboard');
  }

  function openStudentJoin(sessionCode = '') {
    const cleanSessionCode =
      typeof sessionCode === 'string' ? sessionCode.trim().toUpperCase() : '';

    setJoinForm((currentForm) => ({
      ...currentForm,
      code: cleanSessionCode,
      name: currentUser?.role === 'student' ? currentUser.name : currentForm.name,
    }));
    go('student-join');
  }

  function backFromSessionResults() {
    if (currentUser?.role === 'teacher') {
      setTeacherDashboardInitialTab(teacherResultBackTarget === 'history' ? 'history' : 'home');
      go('teacher-dashboard');
      return;
    }

    go(getDashboardPageForUser(currentUser));
  }

  return {
    backFromSessionResults,
    backToTeacherHistory,
    openSessionResults,
    openStudentActivityResult,
    openStudentJoin,
    openTeacherActiveSession,
    openTeacherSessionReview,
  };
}
