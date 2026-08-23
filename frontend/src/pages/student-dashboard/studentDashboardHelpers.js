export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

export function getGameTypeClass(gameType) {
  return gameType === 'qr_pair_match' ? 'qr-pair' : 'classic';
}

export function getInitial(name) {
  return (name || 'S').trim().charAt(0).toUpperCase() || 'S';
}

export function getDismissedNotificationIds(studentId) {
  if (!studentId) return [];
  try {
    return JSON.parse(window.localStorage.getItem(`obitz-student-notifications-dismissed-${studentId}`) || '[]');
  } catch {
    return [];
  }
}

export function saveDismissedNotificationIds(studentId, ids) {
  if (!studentId) return;
  window.localStorage.setItem(
    `obitz-student-notifications-dismissed-${studentId}`,
    JSON.stringify([...new Set(ids)]),
  );
}
