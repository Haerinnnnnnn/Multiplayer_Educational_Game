import { useEffect } from 'react';
import { getCurrentAccessToken, updateUserPresence } from '../services/authService.js';
import { sendOfflinePresenceBeacon } from '../services/presenceService.js';

export function useUserPresence(currentUser) {
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
}
