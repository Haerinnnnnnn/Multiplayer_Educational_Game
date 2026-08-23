import { useEffect } from 'react';
import { GameSession } from '../domain/sessions/GameSession.js';

export function useSessionTransitions({
  activeSession,
  activeSessionId,
  currentUser,
  go,
  page,
  setActiveSessionId,
  setTeacherResultBackTarget,
  studentSession,
}) {
  useEffect(() => {
    if (page === 'student-waiting' && GameSession.from(studentSession).isPlayable()) {
      go('student-game', { replace: true });
    }
  }, [go, page, studentSession]);

  useEffect(() => {
    if (
      page === 'live-lobby' &&
      currentUser?.role === 'teacher' &&
      GameSession.from(activeSession).isPlayable()
    ) {
      go('teacher-control', { replace: true });
    }
  }, [activeSession?.status, currentUser?.role, go, page]);

  useEffect(() => {
    if (
      currentUser?.role === 'student' &&
      ['student-waiting', 'student-game'].includes(page) &&
      studentSession?.id &&
      activeSessionId !== studentSession.id
    ) {
      setActiveSessionId(studentSession.id);
    }
  }, [activeSessionId, currentUser?.role, page, setActiveSessionId, studentSession?.id]);

  useEffect(() => {
    if (
      currentUser?.role === 'student' &&
      ['student-waiting', 'student-game'].includes(page) &&
      GameSession.from(studentSession).isEnded()
    ) {
      setActiveSessionId(studentSession.id);
      go('session-results', { replace: true });
    }
  }, [
    currentUser?.role,
    go,
    page,
    setActiveSessionId,
    studentSession?.id,
    studentSession?.status,
  ]);

  useEffect(() => {
    if (
      page === 'teacher-control' &&
      currentUser?.role === 'teacher' &&
      GameSession.from(activeSession).isEnded()
    ) {
      setTeacherResultBackTarget('home');
      go('session-summary-loading', { replace: true });
    }
  }, [activeSession?.status, currentUser?.role, go, page, setTeacherResultBackTarget]);
}
