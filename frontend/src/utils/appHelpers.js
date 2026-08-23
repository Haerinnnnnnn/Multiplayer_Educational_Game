export function getInitialJoinCode() {
  return new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase() || '';
}

export function getInitialFeedback() {
  return new URLSearchParams(window.location.search).get('confirmed') === '1'
    ? 'Email confirmed. You can login now.'
    : '';
}

export function clearJoinCodeFromUrl() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has('join')) {
    return;
  }

  url.searchParams.delete('join');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function isUsableSessionModule(module) {
  return Boolean(module) && !module.isLocked && !module.isDeleted;
}

export function getActiveChapters(module) {
  return (module?.chapters || []).filter((chapter) => !chapter.isDeleted);
}

export function getFirstChapterId(module) {
  return getActiveChapters(module)[0]?.id || '';
}

const TEACHER_SESSION_PAGES = new Set([
  'live-lobby',
  'teacher-control',
  'session-summary-loading',
  'session-results',
]);

const STUDENT_SESSION_PAGES = new Set([
  'student-waiting',
  'student-game',
  'session-results',
]);

export function canUserAccessSessionPage(user, sessionPage) {
  if (user?.role === 'teacher') {
    return TEACHER_SESSION_PAGES.has(sessionPage);
  }

  if (user?.role === 'student') {
    return STUDENT_SESSION_PAGES.has(sessionPage);
  }

  return false;
}

export function getDashboardPageForUser(user) {
  if (user?.role === 'student') {
    return 'student-dashboard';
  }

  if (user?.role === 'admin') {
    return 'admin-dashboard';
  }

  return 'teacher-dashboard';
}

export function getDefaultSessionForm(moduleList) {
  const defaultModule =
    moduleList.find((module) => isUsableSessionModule(module) && getActiveChapters(module).length) ||
    moduleList.find(isUsableSessionModule);

  return {
    gameType: '',
    moduleId: defaultModule?.id || '',
    chapterId: getFirstChapterId(defaultModule),
    questionCount: 2,
    questionSelectionMode: 'random',
    roundSeconds: 60,
    timerEnabled: true,
    wrongScanPenaltySeconds: 10,
    selectedQuestionIds: [],
  };
}

export function upsertById(items, nextItem) {
  return items.some((item) => item.id === nextItem.id)
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [nextItem, ...items];
}
