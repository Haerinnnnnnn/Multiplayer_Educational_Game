import { useEffect, useRef } from 'react';
import {
  fetchModuleWithQuestions,
  fetchSessionDetails,
  fetchSessionParticipants,
} from '../services/sessionService.js';
import { supabase } from '../services/supabaseClient.js';
import { upsertById } from '../utils/appHelpers.js';

const STUDENT_LIVE_PAGES = new Set(['student-waiting', 'student-game']);
const POLLED_SESSION_PAGES = new Set([
  'live-lobby',
  'teacher-control',
  'student-waiting',
  'student-game',
]);
const REALTIME_SESSION_PAGES = new Set(['live-lobby', 'student-waiting', 'student-game']);

export function useLiveSessionSync({
  activeSession,
  activeSessionId,
  currentUser,
  onMissingSession,
  onStudentKicked,
  page,
  setModules,
  setSessions,
  student,
  studentSession,
}) {
  const onMissingSessionRef = useRef(onMissingSession);
  const onStudentKickedRef = useRef(onStudentKicked);

  useEffect(() => {
    onMissingSessionRef.current = onMissingSession;
    onStudentKickedRef.current = onStudentKicked;
  });

  useEffect(() => {
    const studentLivePage =
      currentUser?.role === 'student' && STUDENT_LIVE_PAGES.has(page);
    const sessionIdForRefresh = studentLivePage ? student?.sessionId : activeSessionId;
    const moduleIdForRefresh = studentLivePage
      ? studentSession?.moduleId
      : activeSession?.moduleId;
    const gameTypeForRefresh = studentLivePage
      ? studentSession?.gameType
      : activeSession?.gameType;

    if (!sessionIdForRefresh || !POLLED_SESSION_PAGES.has(page)) {
      return undefined;
    }

    let active = true;
    let refreshCycle = 0;

    async function refreshSession() {
      try {
        const fastLobbyRefresh = page === 'live-lobby' && refreshCycle % 5 !== 0;
        refreshCycle += 1;

        if (fastLobbyRefresh) {
          const participants = await fetchSessionParticipants(sessionIdForRefresh);

          if (!active) {
            return;
          }

          setSessions((currentSessions) =>
            currentSessions.map((session) =>
              session.id === sessionIdForRefresh ? { ...session, participants } : session,
            ),
          );
          return;
        }

        let refreshedModule;

        if (moduleIdForRefresh) {
          refreshedModule = await fetchModuleWithQuestions(moduleIdForRefresh);

          if (!active) {
            return;
          }

          setModules((currentModules) => upsertById(currentModules, refreshedModule));
        }

        const updatedSession = await fetchSessionDetails(
          sessionIdForRefresh,
          refreshedModule,
        );

        if (!active) {
          return;
        }

        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      } catch (error) {
        if (active) {
          onMissingSessionRef.current(error);
        }
      }
    }

    refreshSession();
    const refreshDelay =
      page === 'live-lobby' ? 600 : gameTypeForRefresh === 'qr_pair_match' ? 1000 : 2500;
    const refreshTimer = window.setInterval(refreshSession, refreshDelay);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [
    activeSession?.gameType,
    activeSession?.moduleId,
    activeSessionId,
    currentUser?.role,
    page,
    setModules,
    setSessions,
    student?.sessionId,
    studentSession?.gameType,
    studentSession?.id,
    studentSession?.moduleId,
  ]);

  useEffect(() => {
    if (
      currentUser?.role !== 'student' ||
      !STUDENT_LIVE_PAGES.has(page) ||
      !studentSession?.id ||
      !currentUser.id
    ) {
      return;
    }

    const stillInSession = studentSession.participants.some(
      (participant) => participant.studentId === currentUser.id,
    );

    if (!stillInSession) {
      onStudentKickedRef.current();
    }
  }, [currentUser?.id, currentUser?.role, page, studentSession?.id, studentSession?.participants]);

  useEffect(() => {
    const studentLivePage =
      currentUser?.role === 'student' && STUDENT_LIVE_PAGES.has(page);
    const sessionIdForSync = studentLivePage ? student?.sessionId : activeSessionId;
    const moduleIdForSync = studentLivePage
      ? studentSession?.moduleId
      : activeSession?.moduleId;

    if (!sessionIdForSync || !REALTIME_SESSION_PAGES.has(page)) {
      return undefined;
    }

    let active = true;

    async function refreshParticipantsFromRealtime() {
      try {
        const participants = await fetchSessionParticipants(sessionIdForSync);

        if (!active) {
          return;
        }

        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id === sessionIdForSync ? { ...session, participants } : session,
          ),
        );

        if (
          studentLivePage &&
          currentUser?.id &&
          !participants.some((participant) => participant.studentId === currentUser.id)
        ) {
          onStudentKickedRef.current();
        }
      } catch (error) {
        if (active) {
          onMissingSessionRef.current(error);
        }
      }
    }

    async function refreshSessionFromRealtime() {
      try {
        let refreshedModule;

        if (moduleIdForSync) {
          refreshedModule = await fetchModuleWithQuestions(moduleIdForSync);

          if (!active) {
            return;
          }

          setModules((currentModules) => upsertById(currentModules, refreshedModule));
        }

        const updatedSession = await fetchSessionDetails(sessionIdForSync, refreshedModule);

        if (!active) {
          return;
        }

        setSessions((currentSessions) => upsertById(currentSessions, updatedSession));
      } catch (error) {
        if (active) {
          onMissingSessionRef.current(error);
        }
      }
    }

    const channel = supabase
      .channel(`session-sync-${sessionIdForSync}-${page}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionIdForSync}`,
        },
        refreshParticipantsFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionIdForSync}`,
        },
        refreshSessionFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
          filter: `session_id=eq.${sessionIdForSync}`,
        },
        refreshSessionFromRealtime,
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionIdForSync}`,
        },
        () => {
          if (studentLivePage) {
            onMissingSessionRef.current({
              code: 'PGRST116',
              message: 'Session not found.',
            });
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [
    activeSession?.moduleId,
    activeSessionId,
    currentUser?.id,
    currentUser?.role,
    page,
    setModules,
    setSessions,
    student?.sessionId,
    studentSession?.moduleId,
  ]);
}
