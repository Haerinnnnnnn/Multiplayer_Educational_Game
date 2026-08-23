import { useCallback, useEffect, useState } from 'react';
import {
  getDashboardPageFromPath,
  getPublicPageFromPath,
  getSessionPageFromPath,
  isDashboardPage,
  isPublicPage,
  isSessionPage,
  syncDashboardPath,
  syncPublicPath,
  syncSessionPath,
} from '../routes/publicRoutes.js';

function getInitialPage() {
  return (
    getPublicPageFromPath(window.location.pathname) ||
    getDashboardPageFromPath(window.location.pathname) ||
    getSessionPageFromPath(window.location.pathname) ||
    'start'
  );
}

export function useAppNavigation({
  setBackLogoutPromptOpen,
  setFeedback,
  setStudentSessionLeavePromptOpen,
}) {
  const [page, setPage] = useState(getInitialPage);

  useEffect(() => {
    if (isPublicPage(page)) {
      syncPublicPath(page, { replace: window.location.pathname === '/' });
    }

    if (isDashboardPage(page)) {
      syncDashboardPath(page, { replace: Boolean(getPublicPageFromPath(window.location.pathname)) });
    }

    if (isSessionPage(page)) {
      syncSessionPath(page, { replace: Boolean(getPublicPageFromPath(window.location.pathname)) });
    }
  }, [page]);

  const go = useCallback(
    (nextPage, options = {}) => {
      setFeedback('');
      setBackLogoutPromptOpen(false);
      setStudentSessionLeavePromptOpen(false);
      setPage(nextPage);
      syncPublicPath(nextPage, options);
      syncDashboardPath(nextPage, options);
      syncSessionPath(nextPage, options);
    },
    [setBackLogoutPromptOpen, setFeedback, setStudentSessionLeavePromptOpen],
  );

  return { go, page, setPage };
}
