export const PUBLIC_PAGE_PATHS = {
  start: '/main',
  login: '/login',
  'student-register': '/register/student',
  'teacher-register': '/register/teacher',
};

export const DASHBOARD_PAGE_PATHS = {
  'student-dashboard': '/dashboard/student',
  'teacher-dashboard': '/dashboard/teacher',
  'admin-dashboard': '/dashboard/admin',
};

export const SESSION_PAGE_PATHS = {
  'student-waiting': '/session/waiting',
  'student-game': '/session/game',
};

const PUBLIC_PATH_PAGES = Object.entries(PUBLIC_PAGE_PATHS).reduce((collection, [page, path]) => {
  collection[path] = page;
  return collection;
}, {});

PUBLIC_PATH_PAGES['/'] = 'start';

const DASHBOARD_PATH_PAGES = Object.entries(DASHBOARD_PAGE_PATHS).reduce((collection, [page, path]) => {
  collection[path] = page;
  return collection;
}, {});

const SESSION_PATH_PAGES = Object.entries(SESSION_PAGE_PATHS).reduce((collection, [page, path]) => {
  collection[path] = page;
  return collection;
}, {});

export function isPublicPage(page) {
  return Object.hasOwn(PUBLIC_PAGE_PATHS, page);
}

export function isDashboardPage(page) {
  return Object.hasOwn(DASHBOARD_PAGE_PATHS, page);
}

export function isSessionPage(page) {
  return Object.hasOwn(SESSION_PAGE_PATHS, page);
}

export function getPublicPageFromPath(pathname) {
  return PUBLIC_PATH_PAGES[pathname] || null;
}

export function getDashboardPageFromPath(pathname) {
  return DASHBOARD_PATH_PAGES[pathname] || null;
}

export function getSessionPageFromPath(pathname) {
  return SESSION_PATH_PAGES[pathname] || null;
}

export function getDashboardPath(page) {
  return DASHBOARD_PAGE_PATHS[page] || '';
}

export function getSessionPath(page) {
  return SESSION_PAGE_PATHS[page] || '';
}

export function syncPublicPath(page, { replace = false } = {}) {
  if (!isPublicPage(page)) {
    return;
  }

  const nextPath = PUBLIC_PAGE_PATHS[page];
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentPath === nextPath) {
    return;
  }

  const historyAction = replace ? 'replaceState' : 'pushState';
  window.history[historyAction]({ page }, '', nextPath);
}

export function syncDashboardPath(page, { replace = false } = {}) {
  if (!isDashboardPage(page)) {
    return;
  }

  const nextPath = DASHBOARD_PAGE_PATHS[page];
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentPath === nextPath) {
    return;
  }

  const historyAction = replace ? 'replaceState' : 'pushState';
  window.history[historyAction]({ page }, '', nextPath);
}

export function syncSessionPath(page, { replace = false } = {}) {
  if (!isSessionPage(page)) {
    return;
  }

  const nextPath = SESSION_PAGE_PATHS[page];
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentPath === nextPath) {
    return;
  }

  const historyAction = replace ? 'replaceState' : 'pushState';
  window.history[historyAction]({ page }, '', nextPath);
}
