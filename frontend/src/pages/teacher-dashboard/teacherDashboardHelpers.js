export function getInitial(name) {
  return (name || 'T').trim().charAt(0).toUpperCase() || 'T';
}

export function getIndicatorStyle(activeTab) {
  const tabOrder = ['home', 'modules', 'sessions', 'history', 'analyze', 'leaderboard'];
  const index = tabOrder.indexOf(activeTab);

  if (index < 0) {
    return { display: 'none' };
  }

  return {
    transform: `translateX(${index * 112}px)`,
  };
}

export function getReviewStatusLabel(status) {
  if (status === 'pending') {
    return 'Pending Admin Review';
  }

  if (status === 'approved') {
    return 'Approved';
  }

  if (status === 'rejected') {
    return 'Rejected';
  }

  return 'No Review Request';
}

export function getSessionModule(modules, session) {
  return modules.find((module) => module.id === session.moduleId);
}

export function getSessionModuleTitle(modules, session) {
  return session.moduleTitle || getSessionModule(modules, session)?.title || '-';
}

export function getSessionTopicTitle(session) {
  return session.topicTitle && session.topicTitle !== '-' ? session.topicTitle : 'Unassigned';
}

export function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function getSessionDate(session) {
  const rawDate = session.createdAtRaw || session.createdAt;
  const parsedDate = rawDate ? new Date(rawDate) : null;

  return parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
}

function isSameCalendarDate(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
  );
}

export function isSessionInHistoryDateRange(session, dateRange) {
  if (dateRange === 'all') {
    return true;
  }

  const sessionDate = getSessionDate(session);

  if (!sessionDate) {
    return false;
  }

  const today = new Date();

  if (dateRange === 'today') {
    return isSameCalendarDate(sessionDate, today);
  }

  if (dateRange === 'week') {
    const weekStart = new Date(today);
    const daysFromMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);

    return sessionDate >= weekStart && sessionDate <= today;
  }

  if (dateRange === 'month') {
    return (
      sessionDate.getFullYear() === today.getFullYear()
      && sessionDate.getMonth() === today.getMonth()
    );
  }

  return true;
}
