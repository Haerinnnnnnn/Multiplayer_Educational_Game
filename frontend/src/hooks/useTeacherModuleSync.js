import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient.js';

export function useTeacherModuleSync({
  authChecked,
  currentUser,
  page,
  refreshTeacherModules,
}) {
  const refreshTeacherModulesRef = useRef(refreshTeacherModules);

  useEffect(() => {
    refreshTeacherModulesRef.current = refreshTeacherModules;
  }, [refreshTeacherModules]);

  useEffect(() => {
    if (
      !authChecked ||
      currentUser?.role !== 'teacher' ||
      page !== 'teacher-dashboard' ||
      !currentUser.id
    ) {
      return undefined;
    }

    let active = true;

    async function refreshSilently() {
      if (!active) {
        return;
      }

      await refreshTeacherModulesRef.current(currentUser.id, { silent: true });
    }

    const channel = supabase
      .channel(`teacher-module-sync-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'modules',
          filter: `teacher_id=eq.${currentUser.id}`,
        },
        refreshSilently,
      )
      .subscribe();

    const refreshTimer = window.setInterval(refreshSilently, 8000);
    refreshSilently();

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [authChecked, currentUser?.id, currentUser?.role, page]);
}
