import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { initialModules, initialUsers } from './data/seedData.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { CreateSessionPage } from './pages/CreateSessionPage.jsx';
import { LiveLobbyPage } from './pages/LiveLobbyPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { LogoutLoadingPage } from './pages/LogoutLoadingPage.jsx';
import { ModuleManagementPage } from './pages/ModuleManagementPage.jsx';
import { QuestionBankPage } from './pages/QuestionBankPage.jsx';
import { ResultHistoryPage } from './pages/ResultHistoryPage.jsx';
import { RoleSelectionPage } from './pages/RoleSelectionPage.jsx';
import { SessionResultsPage } from './pages/SessionResultsPage.jsx';
import { SessionClosedLoadingPage } from './pages/SessionClosedLoadingPage.jsx';
import { SessionSummaryLoadingPage } from './pages/SessionSummaryLoadingPage.jsx';
import { StartPage } from './pages/StartPage.jsx';
import { StudentRegisterPage } from './pages/StudentRegisterPage.jsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.jsx';
import { StudentGamePage } from './pages/StudentGamePage.jsx';
import { StudentJoinPage } from './pages/StudentJoinPage.jsx';
import { StudentWaitingPage } from './pages/StudentWaitingPage.jsx';
import { TeacherControlPage } from './pages/TeacherControlPage.jsx';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage.jsx';
import { TeacherRegisterPage } from './pages/TeacherRegisterPage.jsx';
import { TeacherSessionReviewPage } from './pages/TeacherSessionReviewPage.jsx';
import { UserManagementPage } from './pages/UserManagementPage.jsx';
import {
  createTeacherModule,
  deleteTeacherModule,
  fetchTeacherModules,
  updateTeacherModuleDetails,
  updateTeacherModuleVisibility,
} from './services/moduleService.js';
import {
  createModuleQuestion,
  createModuleQuestions,
  deleteModuleQuestion,
  updateModuleQuestion,
} from './services/questionService.js';
import {
  getCurrentAuthUser,
  getCurrentAccessToken,
  loginUser,
  logoutUser,
  registerStudent,
  registerTeacher,
  updateProfileDetails,
  updateUserPresence,
} from './services/authService.js';
import { sendOfflinePresenceBeacon } from './services/presenceService.js';
import { fetchStudentExperience } from './services/experienceService.js';
import { submitModuleReviewRequest } from './services/moduleReviewService.js';
import { joinPublicModule, requestPrivateModule } from './services/moduleAccessService.js';
import { supabase } from './services/supabaseClient.js';
import {
  checkSessionJoinAccess,
  cleanupStaleLobbySessions,
  createDatabaseSession,
  deleteDatabaseSession,
  fetchModuleWithQuestions,
  fetchOpenStudentSession,
  fetchSessionDetails,
  fetchSessionParticipants,
  fetchTeacherSessions,
  joinDatabaseSession,
  leaveDatabaseSession,
  markQrPairReady,
  markQrPairTimeout,
  endClassicSessionIfAllCompleted,
  pauseDatabaseSession,
  resumeDatabaseSession,
  startQrPairSession,
  submitClassicMcqAnswer,
  submitQrPairScan,
  updateDatabaseSessionStatus,
} from './services/sessionService.js';

function getInitialJoinCode() {
  return new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase() || '';
}

function clearJoinCodeFromUrl() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has('join')) {
    return;
  }

  url.searchParams.delete('join');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function getDefaultSessionForm(moduleList) {
  const defaultModule = moduleList.find((module) => !module.isLocked) || moduleList[0];

  return {
    gameType: '',
    moduleId: defaultModule?.id || '',
    questionCount: 2,
    questionSelectionMode: 'random',
    roundSeconds: 60,
    timerEnabled: true,
    wrongScanPenaltySeconds: 10,
    selectedQuestionIds: [],
  };
}

function upsertById(items, nextItem) {
  return items.some((item) => item.id === nextItem.id)
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [nextItem, ...items];
}

export default function App() {
  const [page, setPage] = useState('start');
  const [modules, setModules] = useState(initialModules);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(initialModules[0].id);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [questionForm, setQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
  });
  const [sessionForm, setSessionForm] = useState(() => getDefaultSessionForm(initialModules));
  const [joinForm, setJoinForm] = useState({ name: '', code: getInitialJoinCode() });
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'Teacher',
  });
  const [feedback, setFeedback] = useState('');
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleBusyMessage, setModuleBusyMessage] = useState('');
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

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const activeModule = modules.find((module) => module.id === activeSession?.moduleId);
  const selectedModule = modules.find((module) => module.id === Number(selectedModuleId));
  const studentSession = sessions.find((session) => session.id === student?.sessionId);

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

  async function loadTeacherModules(teacherId) {
    setLoadingModules(true);

    try {
      const data = await fetchTeacherModules(teacherId);
      setModules(data);
      const deletedStaleSessionIds = await cleanupStaleLobbySessions(teacherId, activeSessionId);
      const teacherSessions = await fetchTeacherSessions(teacherId, data);
      setSessions(
        teacherSessions.filter((session) => !deletedStaleSessionIds.includes(session.id)),
      );

      if (data.length > 0) {
        setSelectedModuleId((currentId) =>
          data.some((module) => module.id === Number(currentId)) ? currentId : data[0].id,
        );
        setSessionForm((currentForm) => ({
          ...currentForm,
          moduleId: data.some((module) => module.id === Number(currentForm.moduleId))
            ? currentForm.moduleId
            : data[0].id,
          selectedQuestionIds: data.some((module) => module.id === Number(currentForm.moduleId))
            ? currentForm.selectedQuestionIds
            : [],
        }));
      } else {
        setSelectedModuleId('');
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoadingModules(false);
    }
  }

  useEffect(() => {
    if (page === 'student-waiting' && ['live', 'paused'].includes(studentSession?.status)) {
      setPage('student-game');
    }
  }, [page, studentSession]);

  useEffect(() => {
    if (
      page === 'live-lobby' &&
      currentUser?.role === 'teacher' &&
      ['live', 'paused'].includes(activeSession?.status)
    ) {
      setPage('teacher-control');
    }
  }, [activeSession?.status, currentUser?.role, page]);

  useEffect(() => {
    if (
      currentUser?.role === 'student' &&
      ['student-waiting', 'student-game'].includes(page) &&
      studentSession?.id &&
      activeSessionId !== studentSession.id
    ) {
      setActiveSessionId(studentSession.id);
    }
  }, [activeSessionId, currentUser?.role, page, studentSession?.id]);

  useEffect(() => {
    if (
      currentUser?.role === 'student' &&
      ['student-waiting', 'student-game'].includes(page) &&
      studentSession?.status === 'ended'
    ) {
      setPage('session-results');
    }
  }, [currentUser?.role, page, studentSession?.status]);

  useEffect(() => {
    if (
      page === 'teacher-control' &&
      currentUser?.role === 'teacher' &&
      activeSession?.status === 'ended'
    ) {
      setTeacherResultBackTarget('home');
      setPage('session-summary-loading');
    }
  }, [activeSession?.status, currentUser?.role, page]);

  useEffect(() => {
    const pagesUsingLiveSession = ['live-lobby', 'teacher-control', 'student-waiting', 'student-game'];
    const studentLivePage = currentUser?.role === 'student' && ['student-waiting', 'student-game'].includes(page);
    const sessionIdForRefresh = studentLivePage
      ? student?.sessionId
      : activeSessionId;
    const moduleIdForRefresh = studentLivePage
      ? studentSession?.moduleId
      : activeSession?.moduleId;
    const gameTypeForRefresh = studentLivePage
      ? studentSession?.gameType
      : activeSession?.gameType;

    if (!sessionIdForRefresh || !pagesUsingLiveSession.includes(page)) {
      return undefined;
    }

    let active = true;
    let refreshCycle = 0;

    async function refreshSession() {
      try {
        const fastLobbyRefresh = page === 'live-lobby' && refreshCycle % 5 !== 0;
        refreshCycle += 1;

        if (fastLobbyRefresh) {
          const participants = await fetchSessionParticipants(sessionIdForRefresh);

          if (!active) {
            return;
          }

          setSessions((currentSessions) =>
            currentSessions.map((session) =>
              session.id === sessionIdForRefresh
                ? { ...session, participants }
                : session,
            ),
          );
          return;
        }

        let refreshedModule;

        if (moduleIdForRefresh) {
          refreshedModule = await fetchModuleWithQuestions(moduleIdForRefresh);

          if (!active) {
            return;
          }

          setModules((currentModules) => upsertById(currentModules, refreshedModule));
        }

        const updatedSession = await fetchSessionDetails(sessionIdForRefresh, refreshedModule);

        if (!active) {
          return;
        }

        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      } catch (error) {
        if (active) {
          handleMissingLiveSession(error);
        }
      }
    }

    refreshSession();
    const refreshDelay = page === 'live-lobby'
      ? 600
      : gameTypeForRefresh === 'qr_pair_match'
        ? 1000
        : 2500;
    const refreshTimer = window.setInterval(refreshSession, refreshDelay);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [
    activeSession?.gameType,
    activeSession?.moduleId,
    activeSessionId,
    currentUser?.role,
    page,
    student?.sessionId,
    studentSession?.gameType,
    studentSession?.id,
    studentSession?.moduleId,
  ]);

  useEffect(() => {
    if (
      currentUser?.role !== 'student' ||
      !['student-waiting', 'student-game'].includes(page) ||
      !studentSession?.id ||
      !currentUser.id
    ) {
      return;
    }

    const stillInSession = studentSession.participants.some(
      (participant) => participant.studentId === currentUser.id,
    );

    if (!stillInSession) {
      handleStudentKickedFromSession();
    }
  }, [currentUser?.id, currentUser?.role, page, studentSession?.id, studentSession?.participants]);

  useEffect(() => {
    const studentLivePage = currentUser?.role === 'student' && ['student-waiting', 'student-game'].includes(page);
    const sessionIdForSync = studentLivePage
      ? student?.sessionId
      : activeSessionId;
    const moduleIdForSync = studentLivePage
      ? studentSession?.moduleId
      : activeSession?.moduleId;

    if (!sessionIdForSync || !['live-lobby', 'student-waiting', 'student-game'].includes(page)) {
      return undefined;
    }

    let active = true;

    async function refreshParticipantsFromRealtime() {
      try {
        const participants = await fetchSessionParticipants(sessionIdForSync);

        if (!active) {
          return;
        }

        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id === sessionIdForSync
              ? { ...session, participants }
              : session,
          ),
        );

        if (
          studentLivePage &&
          currentUser?.id &&
          !participants.some((participant) => participant.studentId === currentUser.id)
        ) {
          handleStudentKickedFromSession();
        }
      } catch (error) {
        if (active) {
          handleMissingLiveSession(error);
        }
      }
    }

    async function refreshSessionFromRealtime() {
      try {
        let refreshedModule;

        if (moduleIdForSync) {
          refreshedModule = await fetchModuleWithQuestions(moduleIdForSync);

          if (!active) {
            return;
          }

          setModules((currentModules) => upsertById(currentModules, refreshedModule));
        }

        const updatedSession = await fetchSessionDetails(sessionIdForSync, refreshedModule);

        if (!active) {
          return;
        }

        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      } catch (error) {
        if (active) {
          handleMissingLiveSession(error);
        }
      }
    }

    const channel = supabase
      .channel(`session-sync-${sessionIdForSync}-${page}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionIdForSync}`,
        },
        refreshParticipantsFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionIdForSync}`,
        },
        refreshSessionFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
          filter: `session_id=eq.${sessionIdForSync}`,
        },
        refreshSessionFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionIdForSync}`,
        },
        () => {
          if (studentLivePage) {
            handleMissingLiveSession({ code: 'PGRST116', message: 'Session not found.' });
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [
    activeSession?.moduleId,
    activeSessionId,
    currentUser?.role,
    page,
    student?.sessionId,
    studentSession?.moduleId,
  ]);

  useEffect(() => {
    async function restoreUser() {
      try {
        const restoredUser = await getCurrentAuthUser();

        if (restoredUser) {
          const user = await markSignedInUserOnline(restoredUser);
          setCurrentUser(user);
          if (user.role === 'student') {
            setStudent({
              ...user,
              systemId: user.userCode,
              sessionId: null,
            });
          }
          if (user.role === 'teacher') {
            await loadTeacherModules(user.id);
          }
          if (user.role === 'student') {
            const restoredOpenSession = await restoreStudentOpenSession(user);

            if (restoredOpenSession) {
              return;
            }
          }
          if (user.role === 'student' && joinForm.code.trim()) {
            setJoinForm((currentForm) => ({
              ...currentForm,
              name: user.name,
            }));
            setPage('student-join');
            return;
          }
          goByUserRole(user);
          return;
        }

        if (joinForm.code.trim()) {
          setFeedback('Please login as a student to join this session.');
          setPage('login');
        }
      } catch (error) {
        console.warn(error.message);
      }
    }

    restoreUser();
  }, []);

  useEffect(() => {
    if (!currentUser || !['student', 'teacher'].includes(currentUser.role)) {
      return undefined;
    }

    let active = true;
    let accessToken = '';

    getCurrentAccessToken()
      .then((token) => {
        if (active) {
          accessToken = token;
        }
      })
      .catch(() => {});

    function markOfflineOnExit() {
      sendOfflinePresenceBeacon({
        accessToken,
        userId: currentUser.id,
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        markOfflineOnExit();
        return;
      }

      if (document.visibilityState === 'visible') {
        updateUserPresence(currentUser, 'online').catch(() => {});
      }
    }

    window.addEventListener('pagehide', markOfflineOnExit);
    window.addEventListener('beforeunload', markOfflineOnExit);
    window.addEventListener('pageshow', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('pagehide', markOfflineOnExit);
      window.removeEventListener('beforeunload', markOfflineOnExit);
      window.removeEventListener('pageshow', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  useEffect(() => {
    if (
      currentUser?.role !== 'student' ||
      joinAccessPrompt?.type !== 'private' ||
      !joinAccessPrompt.waiting ||
      !joinForm.code.trim()
    ) {
      return undefined;
    }

    let active = true;
    let rejectionTimer;

    async function checkApproval() {
      try {
        const accessCheck = await checkSessionJoinAccess({
          code: joinForm.code,
          student: currentUser,
        });

        if (!active) {
          return;
        }

        if (accessCheck.access === 'joined') {
          await completeJoinSession();
          return;
        }

        if (accessCheck.request?.status === 'rejected') {
          setJoinAccessPrompt((currentPrompt) => ({
            ...currentPrompt,
            request: accessCheck.request,
            rejected: true,
            rejectedMessage:
              accessCheck.request.teacher_response ||
              'Your request was rejected by the teacher.',
            waiting: false,
          }));
          setFeedback('');
          rejectionTimer = window.setTimeout(() => {
            if (!active) {
              return;
            }

            setJoinAccessPrompt(null);
            clearJoinSessionState();
            setPage('student-dashboard');
          }, 1600);
        }
      } catch (error) {
        if (active) {
          setFeedback(error.message);
        }
      }
    }

    const approvalTimer = window.setInterval(checkApproval, 1000);
    checkApproval();

    return () => {
      active = false;
      window.clearTimeout(rejectionTimer);
      window.clearInterval(approvalTimer);
    };
  }, [currentUser, joinAccessPrompt?.type, joinAccessPrompt?.waiting, joinForm.code]);

  function go(nextPage) {
    setFeedback('');
    setPage(nextPage);
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

  async function restoreStudentOpenSession(user) {
    if (user.role !== 'student') {
      return false;
    }

    const openSessionState = await fetchOpenStudentSession(user.id);

    if (!openSessionState) {
      return false;
    }

    const { module, session } = openSessionState;
    const returnPage = ['live', 'paused'].includes(session.status) ? 'student-game' : 'student-waiting';

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
      eyebrow: ['live', 'paused'].includes(session.status) ? 'Session Restored' : 'Waiting Room',
      title:
        ['live', 'paused'].includes(session.status)
          ? 'You are still inside this session'
          : 'You were in the waiting room',
      message:
        ['live', 'paused'].includes(session.status)
          ? session.status === 'paused'
            ? 'The game is paused. Bringing you back to the paused game.'
            : 'The game is already live. Bringing you back to the game.'
          : 'This room is still open. Bringing you back to the waiting room.',
      returnPage,
    });
    setPage('session-closed-loading');

    return true;
  }

  async function markSignedInUserOnline(user) {
    if (!user || !['student', 'teacher'].includes(user.role)) {
      return user;
    }

    await updateUserPresence(user, 'online');

    return {
      ...user,
      presenceStatus: 'online',
      lastSeenAt: new Date().toISOString(),
    };
  }

  async function logout() {
    setFeedback('');
    setPage('logout-loading');

    try {
      if (currentUser?.role === 'student' || currentUser?.role === 'teacher') {
        await updateUserPresence(currentUser, 'offline');
      }

      await logoutUser();
      clearJoinSessionState();
      setCurrentUser(null);
      setStudent(null);
      setActiveSessionId(null);
      window.setTimeout(() => {
        setPage('start');
      }, 900);
    } catch (error) {
      setFeedback(error.message);
      setPage('start');
    }
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

  function resetQuestionForm() {
    setQuestionForm({
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      explanation: '',
    });
    setEditingQuestionId(null);
  }

  function selectModule(moduleId) {
    setSelectedModuleId(moduleId);
    resetQuestionForm();
  }

  async function login(event, credentials) {
    event.preventDefault();

    try {
      const data = await loginUser(credentials);
      const signedInUser = await markSignedInUserOnline(data.user);
      setCurrentUser(signedInUser);
      if (signedInUser.role === 'student') {
        setStudent({
          id: signedInUser.id,
          name: signedInUser.name,
          systemId: signedInUser.userCode,
          sessionId: null,
        });
      }
      if (signedInUser.role === 'teacher') {
        await loadTeacherModules(signedInUser.id);
      }
      setFeedback('');
      if (signedInUser.role === 'student' && joinForm.code.trim()) {
        setJoinForm((currentForm) => ({
          ...currentForm,
          name: signedInUser.name,
        }));
        setPage('student-join');
        return;
      }
      goByUserRole(signedInUser);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function registerStudentAccount(event, profile) {
    event.preventDefault();

    try {
      const data = await registerStudent(profile);
      setUsers((currentUsers) => [...currentUsers, data.user]);
      await logoutUser();
      setCurrentUser(null);
      setStudent(null);
      setFeedback('Student account registered successfully. Please login.');
      setPage('login');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function registerTeacherAccount(event, profile) {
    event.preventDefault();

    try {
      const data = await registerTeacher(profile);
      setUsers((currentUsers) => [...currentUsers, data.user]);
      await logoutUser();
      setCurrentUser(null);
      setStudent(null);
      setModules(initialModules);
      setFeedback('Teacher account registered successfully. Please login.');
      setPage('login');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function addModule(event) {
    event.preventDefault();

    if (!moduleForm.title.trim()) {
      setFeedback('Please enter a module name.');
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can create modules.');
      return;
    }

    try {
      setModuleBusyMessage('Creating module...');
      const nextModule = await createTeacherModule(currentUser.id, moduleForm);
      setModules((currentModules) => [nextModule, ...currentModules]);
      setSelectedModuleId(nextModule.id);
      setSessionForm((currentForm) => ({ ...currentForm, moduleId: nextModule.id }));
      setModuleForm({ title: '', description: '' });
      setFeedback(`Module ${nextModule.moduleCode} created.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function toggleModuleVisibility(moduleId, visibility) {
    const module = modules.find((item) => item.id === moduleId);
    const nextVisibility = visibility || (module?.visibility === 'public' ? 'private' : 'public');

    try {
      setModuleBusyMessage(`Changing ${module?.moduleCode || 'module'} access...`);
      const updatedModule = await updateTeacherModuleVisibility(moduleId, nextVisibility);

      setModules((currentModules) =>
        currentModules.map((item) =>
          item.id === moduleId
            ? {
                ...item,
                ...updatedModule,
                questions: item.questions || updatedModule.questions || [],
                latestReviewRequest: item.latestReviewRequest || updatedModule.latestReviewRequest,
              }
            : item,
        ),
      );
      setFeedback(`Module access changed to ${nextVisibility}.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function editModuleDetails(moduleId, moduleForm) {
    if (!moduleForm.title.trim()) {
      setFeedback('Please enter a module name.');
      return false;
    }

    const module = modules.find((item) => item.id === moduleId);

    try {
      setModuleBusyMessage(`Updating ${module?.moduleCode || 'module'}...`);
      const updatedModule = await updateTeacherModuleDetails(moduleId, moduleForm);

      setModules((currentModules) =>
        currentModules.map((item) =>
          item.id === moduleId
            ? {
                ...item,
                ...updatedModule,
                questions: item.questions || updatedModule.questions || [],
                latestReviewRequest: item.latestReviewRequest || updatedModule.latestReviewRequest,
              }
            : item,
        ),
      );
      setFeedback(`${updatedModule.moduleCode || 'Module'} updated.`);
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function deleteModule(moduleId) {
    const module = modules.find((item) => item.id === moduleId);

    if (!module) {
      return;
    }

    const confirmed = window.confirm(
      `Move ${module.moduleCode} - ${module.title} to deleted modules? Its questions and history will be kept for admin review.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setModuleBusyMessage('Moving module to deleted modules...');
      await deleteTeacherModule(moduleId);
      const remainingModules = modules.filter((module) => module.id !== moduleId);
      setModules(remainingModules);

      if (remainingModules.length > 0) {
        setSelectedModuleId(remainingModules[0].id);
        setSessionForm((currentForm) => ({ ...currentForm, moduleId: remainingModules[0].id }));
      }

      setFeedback('Module moved to deleted modules. Admin can still view its data.');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function addQuestion(event) {
    event.preventDefault();

    const requiredFields = [
      questionForm.question,
      questionForm.optionA,
      questionForm.optionB,
      questionForm.optionC,
      questionForm.optionD,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setFeedback('Please enter the question and all four options.');
      return;
    }

    if (!['A', 'B', 'C', 'D'].includes(questionForm.correctOption)) {
      setFeedback('Please choose the correct option.');
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can add questions.');
      return;
    }

    if (!selectedModule) {
      setFeedback('Please select a module first.');
      return;
    }

    try {
      if (editingQuestionId) {
        const updatedQuestion = await updateModuleQuestion(editingQuestionId, questionForm);

        setModules((currentModules) =>
          currentModules.map((module) => {
            if (module.id !== Number(selectedModuleId)) {
              return module;
            }

            return {
              ...module,
              questions: (module.questions || []).map((question) =>
                question.id === editingQuestionId ? updatedQuestion : question,
              ),
            };
          }),
        );
        resetQuestionForm();
        setFeedback(`Question ${updatedQuestion.questionCode || ''} updated.`);
        return;
      }

      const nextQuestion = await createModuleQuestion({
        teacherId: currentUser.id,
        moduleId: selectedModuleId,
        questionForm,
      });

      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(selectedModuleId)) {
            return module;
          }

          return {
            ...module,
            questions: [nextQuestion, ...(module.questions || [])],
          };
        }),
      );
      resetQuestionForm();
      setFeedback(`Question ${nextQuestion.questionCode || ''} added to ${selectedModule.moduleCode}.`);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function importQuestions(questionRows) {
    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can import questions.');
      return false;
    }

    if (!selectedModule) {
      setFeedback('Please select a module first.');
      return false;
    }

    if (!questionRows.length) {
      setFeedback('No valid questions to import.');
      return false;
    }

    try {
      const importedQuestions = await createModuleQuestions({
        teacherId: currentUser.id,
        moduleId: selectedModuleId,
        questionRows,
      });

      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(selectedModuleId)) {
            return module;
          }

          return {
            ...module,
            questions: [...importedQuestions, ...(module.questions || [])],
          };
        }),
      );
      setFeedback(`${importedQuestions.length} questions imported to ${selectedModule.moduleCode}.`);
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    }
  }

  async function requestModuleReview(moduleId, message) {
    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can request module review.');
      return false;
    }

    try {
      const reviewRequest = await submitModuleReviewRequest({
        moduleId,
        teacherId: currentUser.id,
        message,
      });

      setModules((currentModules) =>
        currentModules.map((module) =>
          module.id === Number(moduleId)
            ? {
                ...module,
                latestReviewRequest: reviewRequest,
              }
            : module,
        ),
      );
      setFeedback('Review request sent to admin.');
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    }
  }

  function editQuestion(questionId) {
    const question = selectedModule?.questions?.find((item) => item.id === questionId);

    if (!question) {
      setFeedback('Question not found.');
      return;
    }

    setQuestionForm({
      question: question.question || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correctOption: question.correctOption || 'A',
      explanation: question.explanation || '',
    });
    setEditingQuestionId(questionId);
    setFeedback(`Editing ${question.questionCode || 'question'}.`);
  }

  async function deleteQuestion(questionId) {
    const question = selectedModule?.questions?.find((item) => item.id === questionId);

    if (!question) {
      return;
    }

    const confirmed = window.confirm(`Delete ${question.questionCode || 'this question'}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteModuleQuestion(questionId);
      if (editingQuestionId === questionId) {
        resetQuestionForm();
      }
      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(selectedModuleId)) {
            return module;
          }

          return {
            ...module,
            questions: (module.questions || []).filter((questionItem) => questionItem.id !== questionId),
          };
        }),
      );
      setFeedback('Question deleted.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function createSession(event) {
    event.preventDefault();
    const module = modules.find((item) => item.id === Number(sessionForm.moduleId));
    const openTeacherSession = sessions.find((session) =>
      ['lobby', 'live', 'active'].includes(String(session.status || '').toLowerCase()) &&
      (!session.teacherId || session.teacherId === currentUser?.id),
    );

    if (openTeacherSession) {
      setFeedback(
        `You have an ongoing room (${openTeacherSession.code}). Please return to that room or close it before creating a new session.`,
      );
      return;
    }

    if (!module || !module.questions?.length) {
      setFeedback('Please choose a module with at least one question. Create a module, then Manage Questions first.');
      return;
    }

    if (!sessionForm.gameType) {
      setFeedback('Please choose a game type first.');
      return;
    }

    if (module.isLocked) {
      setFeedback('This module is locked by admin and cannot be used to create a session.');
      return;
    }

    const availableQuestionIds = module.questions.map((question) => question.id);
    const requestedQuestionCount = Number(sessionForm.questionCount);
    let selectedSessionQuestionIds = sessionForm.selectedQuestionIds;
    const effectiveQuestionCount = sessionForm.questionSelectionMode === 'manual'
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

      if (validSelectedQuestionIds.length > module.questions.length) {
        setFeedback('Selected questions cannot be more than the questions inside this module.');
        return;
      }

      selectedSessionQuestionIds = validSelectedQuestionIds;
    } else if (
      Number.isNaN(requestedQuestionCount) ||
      requestedQuestionCount < 1 ||
      requestedQuestionCount > module.questions.length
    ) {
      setFeedback(`Please choose between 1 and ${module.questions.length} questions.`);
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can create sessions.');
      return;
    }

    try {
      const session = await createDatabaseSession({
        gameType: sessionForm.gameType,
        module,
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
      setPage('live-lobby');
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

  async function startGame() {
    if (!activeSession) {
      return;
    }

    if (!activeSession.participants?.length) {
      setFeedback('At least 1 student must join before starting the game.');
      return;
    }

    try {
      if (activeSession.gameType === 'qr_pair_match') {
        await startQrPairSession(activeSession);
        const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      } else {
        await updateDatabaseSessionStatus(activeSession.id, 'live', 0);
        const updatedSession = await fetchSessionDetails(activeSession.id, activeModule);
        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      }

      setFeedback('');
      setPage('teacher-control');
    } catch (error) {
      setFeedback(error.message);
    }
  }

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
    const currentQuestion = activeModule.questions.find((question) => question.id === Number(questionId));

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
        return;
      }

      setSessions((currentSessions) => upsertById(currentSessions, latestSession));
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function submitQrPairAnswerToken(token) {
    if (!activeSession || !activeModule || !student) {
      return;
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
      return;
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
    if (!activeSession || !activeModule) {
      return;
    }

    if (activeSession.status === 'paused') {
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
        setPage('session-results');
        return;
      }

      setFeedback('Ready for next turn.');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function endSession() {
    if (!activeSession) {
      return;
    }

    try {
      await updateDatabaseSessionStatus(activeSession.id, 'ended', activeSession.currentQuestionIndex);
      updateSession(activeSession.id, (session) => ({ ...session, status: 'ended' }));
      clearJoinSessionState();
      if (currentUser?.role === 'teacher') {
        setTeacherResultBackTarget('home');
      }
      setPage(currentUser?.role === 'teacher' ? 'session-summary-loading' : 'session-results');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function pauseSession() {
    if (!activeSession || activeSession.status !== 'live') {
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
    if (!activeSession || activeSession.status !== 'paused') {
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

  function addUser(event) {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim()) {
      setFeedback('Please enter name and email.');
      return;
    }

    setUsers((currentUsers) => [
      ...currentUsers,
      {
        id: Date.now(),
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
      },
    ]);
    setUserForm({ name: '', email: '', role: 'Teacher' });
    setFeedback('User added.');
  }

  function deleteUser(userId) {
    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    setFeedback('User deleted.');
  }

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
    setPage(session.status === 'lobby' ? 'live-lobby' : 'teacher-control');
  }

  function backToTeacherHistory() {
    setTeacherDashboardInitialTab('history');
    go('teacher-dashboard');
  }

  function openStudentJoin(sessionCode = '') {
    setJoinForm((currentForm) => ({
      ...currentForm,
      code: sessionCode ? String(sessionCode).trim().toUpperCase() : '',
      name: currentUser?.role === 'student' ? currentUser.name : currentForm.name,
    }));
    go('student-join');
  }

  function getDashboardPageForCurrentUser() {
    if (currentUser?.role === 'student') {
      return 'student-dashboard';
    }

    if (currentUser?.role === 'admin') {
      return 'admin-dashboard';
    }

    return 'teacher-dashboard';
  }

  function backFromSessionResults() {
    if (currentUser?.role === 'teacher') {
      setTeacherDashboardInitialTab(teacherResultBackTarget === 'history' ? 'history' : 'home');
      go('teacher-dashboard');
      return;
    }

    go(getDashboardPageForCurrentUser());
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

  async function updateCurrentProfile(profile) {
    const updatedUser = await updateProfileDetails(currentUser, profile);

    setCurrentUser((user) =>
      user?.id === updatedUser.id ? { ...user, ...updatedUser } : user,
    );

    if (updatedUser.role === 'student') {
      setStudent((currentStudent) =>
        currentStudent?.id === updatedUser.id ? { ...currentStudent, ...updatedUser } : currentStudent,
      );
    }

    return updatedUser;
  }

  if (page === 'start') {
    return <StartPage onStart={() => go('login')} />;
  }

  if (page === 'logout-loading') {
    return <LogoutLoadingPage />;
  }

  if (page === 'session-summary-loading') {
    return <SessionSummaryLoadingPage onDone={() => go('session-results')} />;
  }

  if (page === 'session-closed-loading') {
    return (
      <SessionClosedLoadingPage
        eyebrow={closedSessionNotice.eyebrow}
        message={closedSessionNotice.message}
        title={closedSessionNotice.title}
        onDone={() => go(closedSessionNotice.returnPage)}
      />
    );
  }

  if (page === 'login') {
    return (
      <LoginPage
        feedback={feedback}
        onLogin={login}
        onStudentRegister={() => go('student-register')}
        onTeacherRegister={() => go('teacher-register')}
      />
    );
  }

  if (page === 'student-register') {
    return (
      <StudentRegisterPage
        feedback={feedback}
        onBack={() => go('login')}
        onRegister={registerStudentAccount}
      />
    );
  }

  if (page === 'teacher-register') {
    return (
      <TeacherRegisterPage
        feedback={feedback}
        onBack={() => go('login')}
        onRegister={registerTeacherAccount}
      />
    );
  }

  if (page === 'role-selection') {
    return (
      <RoleSelectionPage
        onTeacher={() => go('teacher-dashboard')}
        onStudent={() => go('student-dashboard')}
        onAdmin={() => go('admin-dashboard')}
        onLogin={() => go('login')}
      />
    );
  }

  if (page === 'student-dashboard') {
    return (
      <StudentDashboardPage
        student={currentUser?.role === 'student' ? currentUser : student}
        onJoinSession={openStudentJoin}
        onLogout={logout}
        onUpdateProfile={updateCurrentProfile}
        onViewActivityResult={openStudentActivityResult}
      />
    );
  }

  if (page === 'teacher-dashboard') {
    return (
      <TeacherDashboardPage
        currentUser={currentUser}
        feedback={feedback}
        initialTab={teacherDashboardInitialTab}
        loadingModules={loadingModules}
        moduleBusyMessage={moduleBusyMessage}
        moduleForm={moduleForm}
        modules={modules}
        onAddModule={addModule}
        onAddQuestion={addQuestion}
        onCreateSession={createSession}
        onDeleteModule={deleteModule}
        onDeleteQuestion={deleteQuestion}
        onEditModule={editModuleDetails}
        onEditQuestion={editQuestion}
        onCancelQuestionEdit={resetQuestionForm}
        onImportQuestions={importQuestions}
        stats={stats}
        onLogout={logout}
        onModuleFormChange={setModuleForm}
        onOpenResults={openSessionResults}
        onOpenActiveSession={openTeacherActiveSession}
        ongoingSession={sessions.find((session) =>
          ['lobby', 'live', 'paused', 'active'].includes(String(session.status || '').toLowerCase()) &&
          (!session.teacherId || session.teacherId === currentUser?.id),
        )}
        onQuestionFormChange={setQuestionForm}
        onRefreshModules={() => loadTeacherModules(currentUser?.id)}
        onRequestModuleReview={requestModuleReview}
        onSelectedModuleChange={selectModule}
        onSessionFormChange={setSessionForm}
        onToggleModuleVisibility={toggleModuleVisibility}
        onUpdateProfile={updateCurrentProfile}
        onReviewSession={openTeacherSessionReview}
        questionForm={questionForm}
        editingQuestionId={editingQuestionId}
        selectedModule={selectedModule}
        selectedModuleId={selectedModuleId}
        sessionForm={sessionForm}
        sessions={sessions}
      />
    );
  }

  if (page === 'modules') {
    return (
      <ModuleManagementPage
        feedback={feedback}
        moduleForm={moduleForm}
        modules={modules}
        onAddModule={addModule}
        onBack={() => go('teacher-dashboard')}
        onDeleteModule={deleteModule}
        onLogout={logout}
        onModuleFormChange={setModuleForm}
      />
    );
  }

  if (page === 'questions') {
    return (
      <QuestionBankPage
        feedback={feedback}
        modules={modules}
        onAddQuestion={addQuestion}
        onBack={() => go('teacher-dashboard')}
        onDeleteQuestion={deleteQuestion}
        onEditQuestion={editQuestion}
        onCancelQuestionEdit={resetQuestionForm}
        onImportQuestions={importQuestions}
        onLogout={logout}
        onQuestionFormChange={setQuestionForm}
        onSelectedModuleChange={selectModule}
        questionForm={questionForm}
        editingQuestionId={editingQuestionId}
        selectedModule={selectedModule}
        selectedModuleId={selectedModuleId}
      />
    );
  }

  if (page === 'create-session') {
    return (
      <CreateSessionPage
        feedback={feedback}
        modules={modules}
        onBack={() => go('teacher-dashboard')}
        onCreateSession={createSession}
        onLogout={logout}
        ongoingSession={sessions.find((session) =>
          ['lobby', 'live', 'active'].includes(String(session.status || '').toLowerCase()) &&
          (!session.teacherId || session.teacherId === currentUser?.id),
        )}
        onSessionFormChange={setSessionForm}
        sessionForm={sessionForm}
      />
    );
  }

  if (page === 'live-lobby') {
    return (
      <LiveLobbyPage
        activeModule={activeModule}
        activeSession={activeSession}
        onBack={() => go('teacher-dashboard')}
        onCloseSession={closeLobbySession}
        onKickStudent={kickLobbyStudent}
        onRefreshSession={refreshActiveSession}
        onStartGame={startGame}
      />
    );
  }

  if (page === 'student-join') {
    return (
      <StudentJoinPage
        feedback={feedback}
        joinAccessPrompt={joinAccessPrompt}
        joinForm={joinForm}
        onBack={() => go(currentUser?.role === 'student' ? 'student-dashboard' : 'role-selection')}
        onCancelJoinAccessPrompt={cancelJoinAccessPrompt}
        onConfirmJoinPublicModule={confirmJoinPublicModule}
        onJoinFormChange={setJoinForm}
        onJoinSession={joinSession}
        onRequestPrivateModuleAccess={requestPrivateModuleAccess}
      />
    );
  }

  if (page === 'student-waiting') {
    return (
      <StudentWaitingPage
        currentSession={studentSession}
        onLeaveSession={leaveWaitingRoom}
        student={student}
      />
    );
  }

  if (page === 'student-game') {
    return (
      <StudentGamePage
        activeModule={activeModule}
        activeSession={activeSession}
        feedback={feedback}
        onBack={() => go('student-waiting')}
        onLogout={logout}
        onResults={() => go('session-results')}
        onClassicCompleted={completeClassicMcqProgress}
        onQrPairReady={readyForNextQrPairTurn}
        onQrPairScan={submitQrPairAnswerToken}
        onQrPairTimeout={timeoutQrPairAssignment}
        onSubmitAnswer={submitAnswer}
        student={student}
      />
    );
  }

  if (page === 'teacher-control') {
    return (
      <TeacherControlPage
        activeModule={activeModule}
        activeSession={activeSession}
        onBack={() => go('teacher-dashboard')}
        onEndSession={endSession}
        onPauseSession={pauseSession}
        onResumeSession={resumeSession}
      />
    );
  }

  if (page === 'teacher-session-review') {
    return (
      <TeacherSessionReviewPage
        module={activeModule}
        onBack={backToTeacherHistory}
        session={activeSession}
      />
    );
  }

  if (page === 'session-results') {
    return (
      <SessionResultsPage
        activeSession={activeSession}
        currentUser={currentUser}
        onBack={backFromSessionResults}
        onExperienceSettled={updateCurrentStudentExperience}
        onLogout={logout}
      />
    );
  }

  if (page === 'result-history') {
    return (
      <ResultHistoryPage
        modules={modules}
        onBack={() => go('teacher-dashboard')}
        onLogout={logout}
        onOpenResults={openSessionResults}
        sessions={sessions}
      />
    );
  }

  if (page === 'admin-dashboard') {
    return (
      <AdminDashboardPage
        currentUser={currentUser}
        modules={modules}
        onLogout={logout}
        sessions={sessions}
        stats={stats}
        users={users}
      />
    );
  }

  if (page === 'user-management') {
    return (
      <UserManagementPage
        feedback={feedback}
        onAddUser={addUser}
        onBack={() => go('admin-dashboard')}
        onDeleteUser={deleteUser}
        onLogout={logout}
        onUserFormChange={setUserForm}
        userForm={userForm}
        users={users}
      />
    );
  }

  return null;
}
