import {
  getDashboardPath,
  getSessionPath,
  syncDashboardPath,
  syncSessionPath,
} from '../routes/publicRoutes.js';
import { getDashboardPageForUser } from '../utils/appHelpers.js';

export function useBackPromptActions({
  currentUser,
  logout,
  page,
  setBackLogoutPromptOpen,
  setFeedback,
  setPage,
  setStudentSessionLeavePromptOpen,
}) {
  function holdDashboardAndAskToLogout(dashboardPage) {
    const dashboardPath = getDashboardPath(dashboardPage);

    setFeedback('');
    setPage(dashboardPage);
    setBackLogoutPromptOpen(true);

    if (!dashboardPath) {
      syncDashboardPath(dashboardPage, { replace: true });
      return;
    }

    window.history.replaceState({ page: dashboardPage }, '', dashboardPath);
    window.history.pushState(
      { page: dashboardPage, backGuard: true, dashboardGuard: true },
      '',
      dashboardPath,
    );
  }

  function cancelBackLogoutPrompt() {
    const dashboardPage = getDashboardPageForUser(currentUser);
    const dashboardPath = getDashboardPath(dashboardPage);

    setBackLogoutPromptOpen(false);
    setFeedback('');
    setPage(dashboardPage);

    if (dashboardPath) {
      window.history.replaceState({ page: dashboardPage }, '', dashboardPath);
      return;
    }

    syncDashboardPath(dashboardPage, { replace: true });
  }

  function confirmBackLogoutPrompt() {
    setBackLogoutPromptOpen(false);
    logout();
  }

  function holdStudentSessionAndAskLeave(sessionPage) {
    const sessionPath = getSessionPath(sessionPage);

    setFeedback('');
    setPage(sessionPage);
    setStudentSessionLeavePromptOpen(true);

    if (!sessionPath) {
      syncSessionPath(sessionPage, { replace: true });
      return;
    }

    window.history.replaceState({ page: sessionPage }, '', sessionPath);
    window.history.pushState(
      { page: sessionPage, studentSessionGuard: true },
      '',
      sessionPath,
    );
  }

  function cancelStudentSessionLeavePrompt() {
    const sessionPath = getSessionPath(page);

    setStudentSessionLeavePromptOpen(false);
    setFeedback('');

    if (sessionPath) {
      window.history.replaceState({ page }, '', sessionPath);
      return;
    }

    syncSessionPath(page, { replace: true });
  }

  return {
    cancelBackLogoutPrompt,
    cancelStudentSessionLeavePrompt,
    confirmBackLogoutPrompt,
    holdDashboardAndAskToLogout,
    holdStudentSessionAndAskLeave,
  };
}
