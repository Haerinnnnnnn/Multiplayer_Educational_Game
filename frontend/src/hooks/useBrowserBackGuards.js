import { useEffect, useRef } from 'react';
import {
  getDashboardPageFromPath,
  getDashboardPath,
  getPublicPageFromPath,
  getSessionPageFromPath,
  getSessionPath,
  isDashboardPage,
  isSessionPage,
  syncDashboardPath,
  syncPublicPath,
} from '../routes/publicRoutes.js';
import { canUserAccessSessionPage, getDashboardPageForUser } from '../utils/appHelpers.js';

export function useBrowserBackGuards({
  authChecked,
  backLogoutPromptOpen,
  currentUser,
  onDashboardBack,
  onStudentSessionBack,
  page,
  setFeedback,
  setPage,
  studentSessionId,
  studentSessionLeavePromptOpen,
}) {
  const dashboardGuardRef = useRef('');
  const studentSessionGuardRef = useRef('');
  const onDashboardBackRef = useRef(onDashboardBack);
  const onStudentSessionBackRef = useRef(onStudentSessionBack);

  useEffect(() => {
    onDashboardBackRef.current = onDashboardBack;
    onStudentSessionBackRef.current = onStudentSessionBack;
  });

  useEffect(() => {
    function handleRoutePopState() {
      const nextPublicPage = getPublicPageFromPath(window.location.pathname);
      const nextDashboardPage = getDashboardPageFromPath(window.location.pathname);

      if (currentUser) {
        if (currentUser.role === 'student' && ['student-waiting', 'student-game'].includes(page)) {
          onStudentSessionBackRef.current(page);
          return;
        }

        onDashboardBackRef.current(getDashboardPageForUser(currentUser));
        return;
      }

      if (nextDashboardPage || getSessionPageFromPath(window.location.pathname)) {
        setFeedback('');
        setPage('start');
        syncPublicPath('start', { replace: true });
        return;
      }

      if (!nextPublicPage) {
        return;
      }

      setFeedback('');
      setPage(nextPublicPage);
    }

    window.addEventListener('popstate', handleRoutePopState);
    return () => window.removeEventListener('popstate', handleRoutePopState);
  }, [currentUser, page, setFeedback, setPage]);

  useEffect(() => {
    if (!authChecked || (!isDashboardPage(page) && !isSessionPage(page))) {
      return;
    }

    if (!currentUser) {
      setFeedback('');
      setPage('start');
      syncPublicPath('start', { replace: true });
      return;
    }

    const currentDashboardPage = getDashboardPageForUser(currentUser);

    if (isSessionPage(page)) {
      if (!canUserAccessSessionPage(currentUser, page)) {
        setFeedback('');
        setPage(currentDashboardPage);
        syncDashboardPath(currentDashboardPage, { replace: true });
        return;
      }

      if (
        currentUser.role === 'student' &&
        ['student-waiting', 'student-game'].includes(page) &&
        !studentSessionId
      ) {
        setFeedback('');
        setPage('student-dashboard');
        syncDashboardPath('student-dashboard', { replace: true });
      }

      return;
    }

    if (page !== currentDashboardPage) {
      setFeedback('');
      setPage(currentDashboardPage);
      syncDashboardPath(currentDashboardPage, { replace: true });
    }
  }, [authChecked, currentUser, page, setFeedback, setPage, studentSessionId]);

  useEffect(() => {
    if (!authChecked || !currentUser || !isDashboardPage(page) || backLogoutPromptOpen) {
      return;
    }

    const dashboardPage = getDashboardPageForUser(currentUser);
    const dashboardPath = getDashboardPath(dashboardPage);

    if (!dashboardPath || page !== dashboardPage) {
      return;
    }

    const guardKey = `${currentUser.id}:${dashboardPath}`;
    const currentState = window.history.state || {};

    if (
      dashboardGuardRef.current === guardKey &&
      currentState.dashboardGuard &&
      window.location.pathname === dashboardPath
    ) {
      return;
    }

    dashboardGuardRef.current = guardKey;
    window.history.replaceState({ page: dashboardPage }, '', dashboardPath);
    window.history.pushState({ page: dashboardPage, dashboardGuard: true }, '', dashboardPath);
  }, [authChecked, backLogoutPromptOpen, currentUser, page]);

  useEffect(() => {
    if (!currentUser) {
      dashboardGuardRef.current = '';
    }
  }, [currentUser]);

  useEffect(() => {
    if (
      !authChecked ||
      currentUser?.role !== 'student' ||
      !isSessionPage(page) ||
      studentSessionLeavePromptOpen
    ) {
      return;
    }

    const sessionPath = getSessionPath(page);

    if (!sessionPath) {
      return;
    }

    const guardKey = `${currentUser.id}:${sessionPath}`;
    const currentState = window.history.state || {};

    if (
      studentSessionGuardRef.current === guardKey &&
      currentState.studentSessionGuard &&
      window.location.pathname === sessionPath
    ) {
      return;
    }

    studentSessionGuardRef.current = guardKey;
    window.history.replaceState({ page }, '', sessionPath);
    window.history.pushState({ page, studentSessionGuard: true }, '', sessionPath);
  }, [authChecked, currentUser, page, studentSessionLeavePromptOpen]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      studentSessionGuardRef.current = '';
    }
  }, [currentUser]);
}
