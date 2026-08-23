import { useEffect, useRef } from 'react';
import {
  getCurrentAuthUser,
  queueTeacherApprovalAfterEmailConfirmation,
} from '../services/authService.js';
import { getDashboardPageFromPath, syncPublicPath } from '../routes/publicRoutes.js';

export function useAuthRestore(options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    async function restoreUser() {
      const {
        goByUserRole,
        joinCode,
        loadTeacherModules,
        markSignedInUserOnline,
        restoreStudentOpenSession,
        setAuthChecked,
        setCurrentUser,
        setFeedback,
        setJoinForm,
        setPage,
        setStudent,
      } = optionsRef.current;

      try {
        const restoredUser = await getCurrentAuthUser();

        if (restoredUser) {
          let user = await markSignedInUserOnline(restoredUser);

          if (user.role === 'teacher' && user.approvalStatus === 'awaiting_email') {
            const queuedTeacher = await queueTeacherApprovalAfterEmailConfirmation();

            if (queuedTeacher) {
              user = {
                ...user,
                ...queuedTeacher,
                presenceStatus: user.presenceStatus,
                lastSeenAt: user.lastSeenAt,
              };
            }
          }

          setCurrentUser(user);

          if (user.role === 'student') {
            setStudent({
              ...user,
              systemId: user.userCode,
              sessionId: null,
            });
          }

          if (user.role === 'teacher' && user.approvalStatus === 'approved') {
            await loadTeacherModules(user.id);
          }

          if (user.role === 'student') {
            const restoredOpenSession = await restoreStudentOpenSession(user);

            if (restoredOpenSession) {
              return;
            }
          }

          if (user.role === 'student' && joinCode.trim()) {
            setJoinForm((currentForm) => ({
              ...currentForm,
              name: user.name,
            }));
            setPage('student-join');
            return;
          }

          goByUserRole(user);
          return;
        }

        if (joinCode.trim()) {
          setFeedback('Please login as a student to join this session.');
          setPage('login');
          syncPublicPath('login', { replace: true });
          return;
        }

        if (getDashboardPageFromPath(window.location.pathname)) {
          setFeedback('');
          setPage('start');
          syncPublicPath('start', { replace: true });
        }
      } catch (error) {
        console.warn(error.message);

        if (getDashboardPageFromPath(window.location.pathname)) {
          setFeedback('');
          setPage('start');
          syncPublicPath('start', { replace: true });
        }
      } finally {
        setAuthChecked(true);
      }
    }

    restoreUser();
  }, []);
}
