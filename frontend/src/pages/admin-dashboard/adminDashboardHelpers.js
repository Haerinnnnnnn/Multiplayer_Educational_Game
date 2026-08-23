export function getInitial(name) {
  return (name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

export function getIndicatorStyle(activeTab) {
  const tabOrder = ['home', 'users', 'modules', 'sessions', 'teacher-requests'];
  const index = tabOrder.indexOf(activeTab);

  if (index < 0) {
    return { display: 'none' };
  }

  return {
    transform: `translateX(${index * 112}px)`,
  };
}

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function formatGameType(gameType) {
  if (gameType === 'qr_pair_match') {
    return 'QR Pair Match';
  }

  if (gameType === 'classic_mcq') {
    return 'Classic MCQ';
  }

  return gameType || '-';
}
