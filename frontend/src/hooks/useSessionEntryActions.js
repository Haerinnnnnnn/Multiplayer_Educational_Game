import { joinPublicModule, requestPrivateModule } from '../services/moduleAccessService.js';
import {
  checkSessionJoinAccess,
  createDatabaseSession,
  joinDatabaseSession,
} from '../services/sessionService.js';
import {
  clearJoinCodeFromUrl,
  getActiveChapters,
  upsertById,
} from '../utils/appHelpers.js';

export function useSessionEntryActions({
  clearJoinSessionState,
  currentUser,
  go,
  joinAccessPrompt,
  joinForm,
  modules,
  resetCreateSessionForm,
  sessionForm,
  sessions,
  setActiveSessionId,
  setFeedback,
  setJoinAccessPrompt,
  setJoinForm,
  setModules,
  setPage,
  setSessions,
  setStudent,
}) {
  async function createSession(event) {
    event.preventDefault();
    const module = modules.find((item) => item.id === Number(sessionForm.moduleId));
    const openTeacherSession = sessions.find(
      (session) =>
        ['lobby', 'live', 'active'].includes(String(session.status || '').toLowerCase()) &&
        (!session.teacherId || session.teacherId === currentUser?.id),
    );

    if (openTeacherSession) {
      setFeedback(
        `You have an ongoing room (${openTeacherSession.code}). Please return to that room or close it before creating a new session.`,
      );
      return;
    }

    if (!module) {
      setFeedback('Please choose a module first.');
      return;
    }

    if (!sessionForm.gameType) {
      setFeedback('Please choose a game type first.');
      return;
    }

    if (module.isLocked || module.isDeleted) {
      setFeedback('This module is locked by admin and cannot be used to create a session.');
      return;
    }

    const activeChapters = getActiveChapters(module);

    if (!activeChapters.length) {
      setFeedback('This module has no topics yet. Please create a topic before creating a session.');
      return;
    }

    const selectedChapter = activeChapters.find(
      (chapter) => chapter.id === Number(sessionForm.chapterId),
    );

    if (!selectedChapter) {
      setFeedback('Please choose a topic for this session.');
      return;
    }

    const topicQuestions = (module.questions || []).filter(
      (question) =>
        !question.chapterIsDeleted && Number(question.chapterId) === Number(selectedChapter.id),
    );

    if (topicQuestions.length === 0) {
      setFeedback('This topic has no questions yet. Please add questions to the selected topic first.');
      return;
    }

    const moduleForSession = {
      ...module,
      questions: topicQuestions,
    };
    const availableQuestionIds = topicQuestions.map((question) => question.id);
    const requestedQuestionCount = Number(sessionForm.questionCount);
    let selectedSessionQuestionIds = sessionForm.selectedQuestionIds;
    const effectiveQuestionCount =
      sessionForm.questionSelectionMode === 'manual'
        ? selectedSessionQuestionIds.length
        : requestedQuestionCount;

    if (sessionForm.gameType === 'qr_pair_match' && effectiveQuestionCount < 2) {
      setFeedback('QR Pair Match requires at least 2 questions.');
      return;
    }

    if (sessionForm.questionSelectionMode === 'manual') {
      const validSelectedQuestionIds = sessionForm.selectedQuestionIds.filter((questionId) =>
        availableQuestionIds.includes(Number(questionId)),
      );

      if (validSelectedQuestionIds.length === 0) {
        setFeedback('Please manually select at least one question for this session.');
        return;
      }

      if (validSelectedQuestionIds.length > topicQuestions.length) {
        setFeedback('Selected questions cannot be more than the questions inside this topic.');
        return;
      }

      selectedSessionQuestionIds = validSelectedQuestionIds;
    } else if (
      Number.isNaN(requestedQuestionCount) ||
      requestedQuestionCount < 1 ||
      requestedQuestionCount > topicQuestions.length
    ) {
      setFeedback(`Please choose between 1 and ${topicQuestions.length} questions for this topic.`);
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can create sessions.');
      return;
    }

    try {
      const session = await createDatabaseSession({
        gameType: sessionForm.gameType,
        module: moduleForSession,
        questionCount: sessionForm.questionCount,
        questionSelectionMode: sessionForm.questionSelectionMode,
        roundSeconds: sessionForm.roundSeconds,
        selectedQuestionIds: selectedSessionQuestionIds,
        teacherId: currentUser.id,
        timerEnabled: sessionForm.timerEnabled,
        wrongScanPenaltySeconds: sessionForm.wrongScanPenaltySeconds,
      });

      setSessions((currentSessions) => upsertById(currentSessions, session));
      setActiveSessionId(session.id);
      resetCreateSessionForm();
      setFeedback('');
      go('live-lobby');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function completeJoinSession(override = {}) {
    const sessionCode = (override.code ?? joinForm.code).trim().toUpperCase();
    const studentName = (override.studentName ?? joinForm.name).trim() || currentUser.name;

    try {
      const { module, session } = await joinDatabaseSession({
        code: sessionCode,
        student: currentUser,
        studentName,
      });

      clearJoinCodeFromUrl();
      setJoinForm((currentForm) => ({
        ...currentForm,
        code: '',
      }));
      setModules((currentModules) => upsertById(currentModules, module));
      setSessions((currentSessions) => upsertById(currentSessions, session));
      setStudent({
        ...currentUser,
        systemId: currentUser.userCode,
        sessionId: session.id,
      });
      setActiveSessionId(session.id);
      setJoinAccessPrompt(null);
      setFeedback('');
      setPage(['live', 'paused'].includes(session.status) ? 'student-game' : 'student-waiting');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function joinSession(event, override = {}) {
    event?.preventDefault?.();
    const sessionCode = (override.code ?? joinForm.code).trim().toUpperCase();

    if (currentUser?.role !== 'student') {
      setFeedback('Please login as a student before joining a session.');
      return;
    }

    if (!sessionCode) {
      setFeedback('Please enter a session code.');
      return;
    }

    try {
      const accessCheck = await checkSessionJoinAccess({
        code: sessionCode,
        student: currentUser,
      });

      setModules((currentModules) => upsertById(currentModules, accessCheck.module));

      if (accessCheck.access === 'public_not_joined') {
        setJoinAccessPrompt({
          type: 'public',
          module: accessCheck.module,
          session: accessCheck.session,
        });
        return;
      }

      if (accessCheck.access === 'private_not_joined') {
        setJoinAccessPrompt({
          type: 'private',
          module: accessCheck.module,
          request: accessCheck.request,
          session: accessCheck.session,
          waiting: false,
        });
        return;
      }

      await completeJoinSession({ code: sessionCode });
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function confirmJoinPublicModule() {
    if (!joinAccessPrompt?.module || currentUser?.role !== 'student') {
      return;
    }

    try {
      await joinPublicModule({
        moduleId: joinAccessPrompt.module.id,
        studentId: currentUser.id,
      });
      await completeJoinSession();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function requestPrivateModuleAccess() {
    if (!joinAccessPrompt?.module || currentUser?.role !== 'student') {
      return;
    }

    try {
      await requestPrivateModule({
        moduleId: joinAccessPrompt.module.id,
        studentId: currentUser.id,
        message: `I want to join session ${joinAccessPrompt.session?.code || joinForm.code}.`,
      });
      setJoinAccessPrompt((currentPrompt) => ({
        ...currentPrompt,
        waiting: true,
      }));
      setFeedback('');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function cancelJoinAccessPrompt() {
    setJoinAccessPrompt(null);
    clearJoinSessionState();
    setPage('student-dashboard');
  }

  return {
    cancelJoinAccessPrompt,
    completeJoinSession,
    confirmJoinPublicModule,
    createSession,
    joinSession,
    requestPrivateModuleAccess,
  };
}
