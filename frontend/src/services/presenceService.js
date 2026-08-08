import { backendUrl } from './apiConfig.js';

export function sendOfflinePresenceBeacon({ accessToken, userId }) {
  if (!accessToken || !userId) {
    return false;
  }

  const payload = new URLSearchParams({
    accessToken,
    userId,
  });
  const url = `${backendUrl}/api/presence/offline`;

  if (navigator.sendBeacon) {
    return navigator.sendBeacon(url, payload);
  }

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
    keepalive: true,
  }).catch(() => {});

  return true;
}
