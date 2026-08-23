import React, { useCallback, useMemo, useState } from 'react';
import { initialModules, initialUsers } from './data/seedData.js';
import { AppPageRouter } from './routes/AppPageRouter.jsx';
import { fetchStudentExperience } from './services/experienceService.js';
import { useAppNavigation } from './hooks/useAppNavigation.js';
import { useAdminUserActions } from './hooks/useAdminUserActions.js';
import { useAuthActions } from './hooks/useAuthActions.js';
import { useAuthRestore } from './hooks/useAuthRestore.js';
import { useBackPromptActions } from './hooks/useBackPromptActions.js';
import { useBrowserBackGuards } from './hooks/useBrowserBackGuards.js';
import { useLiveSessionSync } from './hooks/useLiveSessionSync.js';
import { useLiveSessionActions } from './hooks/useLiveSessionActions.js';
import { useModuleActions } from './hooks/useModuleActions.js';
import { usePrivateJoinApproval } from './hooks/usePrivateJoinApproval.js';
import { useQuestionActions } from './hooks/useQuestionActions.js';
import { useSessionEntryActions } from './hooks/useSessionEntryActions.js';
import { useSessionNavigationActions } from './hooks/useSessionNavigationActions.js';
import { useSessionRecovery } from './hooks/useSessionRecovery.js';
import { useSessionTransitions } from './hooks/useSessionTransitions.js';
import { useStudentGameActions } from './hooks/useStudentGameActions.js';
import { useStudentSessionLeaveActions } from './hooks/useStudentSessionLeaveActions.js';
import { useTeacherModuleSync } from './hooks/useTeacherModuleSync.js';
import { useTeacherModuleLoader } from './hooks/useTeacherModuleLoader.js';
import { useUserPresence } from './hooks/useUserPresence.js';
import {
  getDefaultSessionForm,
  getInitialFeedback,
  getInitialJoinCode,
} from './utils/appHelpers.js';

export default function App() {
  const [modules, setModules] = useState(initialModules);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [student, setStudent] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(initialModules[0].id);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [questionForm, setQuestionForm] = useState({
    question: '',
    chapterId: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
  });
  const [sessionForm, setSessionForm] = useState(() => getDefaultSessionForm(initialModules));
  const [joinForm, setJoinForm] = useState({ name: '', code: getInitialJoinCode() });
  const [feedback, setFeedback] = useState(getInitialFeedback);
  const [moduleBusyMessage, setModuleBusyMessage] = useState('');
  const [moduleDeleteConfirm, setModuleDeleteConfirm] = useState(null);
  const [moduleDeleteBusy, setModuleDeleteBusy] = useState(false);
  const [questionDeleteConfirm, setQuestionDeleteConfirm] = useState(null);
  const [questionDeleteBusy, setQuestionDeleteBusy] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [teacherDashboardInitialTab, setTeacherDashboardInitialTab] = useState('home');
  const [teacherResultBackTarget, setTeacherResultBackTarget] = useState('home');
  const [joinAccessPrompt, setJoinAccessPrompt] = useState(null);
  const [closedSessionNotice, setClosedSessionNotice] = useState({
    audience: 'student',
    eyebrow: 'Room Closed',
    message: '',
    returnPage: 'student-dashboard',
    title: '',
  });
  const [backLogoutPromptOpen, setBackLogoutPromptOpen] = useState(false);
  const [studentSessionLeavePromptOpen, setStudentSessionLeavePromptOpen] = useState(false);
  const { go, page, setPage } = useAppNavigation({
    setBackLogoutPromptOpen,
    setFeedback,
    setStudentSessionLeavePromptOpen,
  });
  const { addUser, deleteUser, setUserForm, userForm } = useAdminUserActions({
    setFeedback,
    setUsers,
  });
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const activeModule = modules.find((module) => module.id === activeSession?.moduleId);
  const selectedModule = modules.find((module) => module.id === Number(selectedModuleId));
  const studentSession = sessions.find((session) => session.id === student?.sessionId);

  const { loadTeacherModules, loadingModules } = useTeacherModuleLoader({
    activeSessionId,
    setFeedback,
    setModules,
    setSelectedModuleId,
    setSessionForm,
    setSessions,
  });

  const {
    clearJoinSessionState,
    handleMissingLiveSession,
    handleStudentKickedFromSession,
    refreshActiveSession,
    resetCreateSessionForm,
    restoreStudentOpenSession,
    updateSession,
  } = useSessionRecovery({
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
  });

  const {
    login,
    logout,
    markSignedInUserOnline,
    registerStudentAccount,
    registerTeacherAccount,
    updateCurrentProfile,
  } = useAuthActions({
    clearJoinSessionState,
    currentUser,
    goByUserRole,
    joinCode: joinForm.code,
    loadTeacherModules,
    setActiveSessionId,
    setBackLogoutPromptOpen,
    setCurrentUser,
    setFeedback,
    setJoinForm,
    setModules,
    setPage,
    setStudent,
    setUsers,
  });

  const {
    addModule,
    confirmDeleteModule,
    deleteModule,
    editModuleDetails,
    requestModuleReview,
    toggleModuleVisibility,
  } = useModuleActions({
    currentUser,
    moduleDeleteConfirm,
    moduleForm,
    modules,
    setFeedback,
    setModuleBusyMessage,
    setModuleDeleteBusy,
    setModuleDeleteConfirm,
    setModuleForm,
    setModules,
    setSelectedModuleId,
    setSessionForm,
  });

  const {
    addQuestion,
    confirmDeleteQuestion,
    deleteQuestion,
    editQuestion,
    importQuestions,
    resetQuestionForm,
  } = useQuestionActions({
    currentUser,
    editingQuestionId,
    loadTeacherModules,
    questionDeleteConfirm,
    questionForm,
    selectedModule,
    selectedModuleId,
    setEditingQuestionId,
    setFeedback,
    setModules,
    setQuestionDeleteBusy,
    setQuestionDeleteConfirm,
    setQuestionForm,
  });

  const {
    cancelJoinAccessPrompt,
    completeJoinSession,
    confirmJoinPublicModule,
    createSession,
    joinSession,
    requestPrivateModuleAccess,
  } = useSessionEntryActions({
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
  });

  const {
    closeLobbySession,
    endSession,
    kickLobbyStudent,
    pauseSession,
    resumeSession,
    startGame,
  } = useLiveSessionActions({
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
  });

  const {
    completeClassicMcqProgress,
    readyForNextQrPairTurn,
    submitAnswer,
    submitQrPairAnswerToken,
    timeoutQrPairAssignment,
  } = useStudentGameActions({
    activeModule,
    activeSession,
    go,
    setActiveSessionId,
    setFeedback,
    setSessions,
    student,
  });

  const {
    leaveActiveStudentGameSession,
    leaveWaitingRoom,
  } = useStudentSessionLeaveActions({
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
  });

  const {
    backFromSessionResults,
    backToTeacherHistory,
    openSessionResults,
    openStudentActivityResult,
    openStudentJoin,
    openTeacherActiveSession,
    openTeacherSessionReview,
  } = useSessionNavigationActions({
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
  });

  const {
    cancelBackLogoutPrompt,
    cancelStudentSessionLeavePrompt,
    confirmBackLogoutPrompt,
    holdDashboardAndAskToLogout,
    holdStudentSessionAndAskLeave,
  } = useBackPromptActions({
    currentUser,
    logout,
    page,
    setBackLogoutPromptOpen,
    setFeedback,
    setPage,
    setStudentSessionLeavePromptOpen,
  });

  useAuthRestore({
    goByUserRole,
    joinCode: joinForm.code,
    loadTeacherModules,
    markSignedInUserOnline,
    restoreStudentOpenSession,
    setAuthChecked,
    setCurrentUser,
    setFeedback,
    setJoinForm,
    setPage,
    setStudent,
  });

  useUserPresence(currentUser);

  useLiveSessionSync({
    activeSession,
    activeSessionId,
    currentUser,
    onMissingSession: handleMissingLiveSession,
    onStudentKicked: handleStudentKickedFromSession,
    page,
    setModules,
    setSessions,
    student,
    studentSession,
  });

  useSessionTransitions({
    activeSession,
    activeSessionId,
    currentUser,
    go,
    page,
    setActiveSessionId,
    setTeacherResultBackTarget,
    studentSession,
  });

  useBrowserBackGuards({
    authChecked,
    backLogoutPromptOpen,
    currentUser,
    onDashboardBack: holdDashboardAndAskToLogout,
    onStudentSessionBack: holdStudentSessionAndAskLeave,
    page,
    setFeedback,
    setPage,
    studentSessionId: studentSession?.id,
    studentSessionLeavePromptOpen,
  });

  useTeacherModuleSync({
    authChecked,
    currentUser,
    page,
    refreshTeacherModules: loadTeacherModules,
  });

  usePrivateJoinApproval({
    clearJoinSessionState,
    completeJoinSession,
    currentUser,
    joinAccessPrompt,
    joinCode: joinForm.code,
    setFeedback,
    setJoinAccessPrompt,
    setPage,
  });

  const stats = useMemo(() => {
    const questionCount = modules.reduce(
      (total, module) => total + (module.questions?.length || 0),
      0,
    );
    return {
      modules: modules.length,
      questions: questionCount,
      active: sessions.filter((session) => session.status !== 'ended').length,
      past: sessions.filter((session) => session.status === 'ended').length,
    };
  }, [modules, sessions]);

  function goByUserRole(user) {
    if (user.role === 'teacher') {
      setPage('teacher-dashboard');
      return;
    }

    if (user.role === 'student') {
      setPage('student-dashboard');
      return;
    }

    setPage('admin-dashboard');
  }

  function selectModule(moduleId) {
    setSelectedModuleId(moduleId);
    resetQuestionForm();
  }
  const updateCurrentStudentExperience = useCallback(async () => {
    if (currentUser?.role !== 'student' || !currentUser?.id) {
      return;
    }

    try {
      const experience = await fetchStudentExperience(currentUser.id);
      setCurrentUser((user) =>
        user?.id === currentUser.id
          ? { ...user, level: experience.level, totalExp: experience.totalExp }
          : user,
      );
      setStudent((currentStudent) =>
        currentStudent?.id === currentUser.id
          ? { ...currentStudent, level: experience.level, totalExp: experience.totalExp }
          : currentStudent,
      );
    } catch (error) {
      setFeedback(error.message);
    }
  }, [currentUser?.id, currentUser?.role]);

  return (
    <AppPageRouter
      app={{
        activeModule,
        activeSession,
        addModule,
        addQuestion,
        addUser,
        authChecked,
        backFromSessionResults,
        backLogoutPromptOpen,
        backToTeacherHistory,
        cancelBackLogoutPrompt,
        cancelJoinAccessPrompt,
        closeLobbySession,
        closedSessionNotice,
        completeClassicMcqProgress,
        confirmBackLogoutPrompt,
        confirmDeleteModule,
        confirmDeleteQuestion,
        confirmJoinPublicModule,
        createSession,
        currentUser,
        deleteModule,
        deleteQuestion,
        deleteUser,
        editingQuestionId,
        editModuleDetails,
        editQuestion,
        endSession,
        feedback,
        go,
        importQuestions,
        joinAccessPrompt,
        joinForm,
        joinSession,
        kickLobbyStudent,
        leaveActiveStudentGameSession,
        leaveWaitingRoom,
        loadTeacherModules,
        loadingModules,
        login,
        logout,
        moduleBusyMessage,
        moduleDeleteBusy,
        moduleDeleteConfirm,
        moduleForm,
        modules,
        openSessionResults,
        openStudentActivityResult,
        openStudentJoin,
        openTeacherActiveSession,
        openTeacherSessionReview,
        page,
        pauseSession,
        questionDeleteBusy,
        questionDeleteConfirm,
        questionForm,
        readyForNextQrPairTurn,
        refreshActiveSession,
        registerStudentAccount,
        registerTeacherAccount,
        requestModuleReview,
        requestPrivateModuleAccess,
        resetQuestionForm,
        resumeSession,
        selectedModule,
        selectedModuleId,
        selectModule,
        sessionForm,
        sessions,
        setJoinForm,
        setModuleDeleteConfirm,
        setModuleForm,
        setQuestionDeleteConfirm,
        setQuestionForm,
        setSessionForm,
        setStudentSessionLeavePromptOpen,
        setUserForm,
        startGame,
        stats,
        student,
        studentSession,
        studentSessionLeavePromptOpen,
        submitAnswer,
        submitQrPairAnswerToken,
        teacherDashboardInitialTab,
        timeoutQrPairAssignment,
        toggleModuleVisibility,
        updateCurrentProfile,
        updateCurrentStudentExperience,
        userForm,
        users,
      }}
    />
  );
}
