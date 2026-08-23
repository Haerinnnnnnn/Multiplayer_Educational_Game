import { useCallback } from 'react';
import { initialModules } from '../data/seedData.js';
import { syncPublicPath } from '../routes/publicRoutes.js';
import {
  loginUser,
  logoutUser,
  queueTeacherApprovalAfterEmailConfirmation,
  registerStudent,
  registerTeacher,
  updateProfileDetails,
  updateUserPresence,
} from '../services/authService.js';

export function useAuthActions({
  clearJoinSessionState,
  currentUser,
  goByUserRole,
  joinCode,
  loadTeacherModules,
  setActiveSessionId,
  setBackLogoutPromptOpen,
  setCurrentUser,
  setFeedback,
  setJoinForm,
  setModules,
  setPage,
  setStudent,
  setUsers,
}) {
  const markSignedInUserOnline = useCallback(async (user) => {
    if (!user || !['student', 'teacher'].includes(user.role)) {
      return user;
    }

    await updateUserPresence(user, 'online');

    return {
      ...user,
      presenceStatus: 'online',
      lastSeenAt: new Date().toISOString(),
    };
  }, []);

  const logout = useCallback(async () => {
    setFeedback('');
    setBackLogoutPromptOpen(false);
    setPage('logout-loading');

    try {
      if (currentUser?.role === 'student' || currentUser?.role === 'teacher') {
        await updateUserPresence(currentUser, 'offline');
      }

      await logoutUser();
      clearJoinSessionState();
      setCurrentUser(null);
      setStudent(null);
      setActiveSessionId(null);
      window.setTimeout(() => {
        setPage('start');
        syncPublicPath('start', { replace: true });
      }, 900);
    } catch (error) {
      setFeedback(error.message);
      setPage('start');
      syncPublicPath('start', { replace: true });
    }
  }, [
    clearJoinSessionState,
    currentUser,
    setActiveSessionId,
    setBackLogoutPromptOpen,
    setCurrentUser,
    setFeedback,
    setPage,
    setStudent,
  ]);

  const login = useCallback(async (event, credentials) => {
    event.preventDefault();

    try {
      const data = await loginUser(credentials);
      let signedInUser = await markSignedInUserOnline(data.user);

      if (signedInUser.role === 'teacher' && signedInUser.approvalStatus === 'awaiting_email') {
        const queuedTeacher = await queueTeacherApprovalAfterEmailConfirmation();

        if (queuedTeacher) {
          signedInUser = {
            ...signedInUser,
            ...queuedTeacher,
            presenceStatus: signedInUser.presenceStatus,
            lastSeenAt: signedInUser.lastSeenAt,
          };
        }
      }

      setCurrentUser(signedInUser);

      if (signedInUser.role === 'student') {
        setStudent({
          id: signedInUser.id,
          name: signedInUser.name,
          systemId: signedInUser.userCode,
          sessionId: null,
        });
      }

      if (signedInUser.role === 'teacher' && signedInUser.approvalStatus === 'approved') {
        await loadTeacherModules(signedInUser.id);
      }

      setFeedback('');
      if (signedInUser.role === 'student' && joinCode.trim()) {
        setJoinForm((currentForm) => ({
          ...currentForm,
          name: signedInUser.name,
        }));
        setPage('student-join');
        return;
      }

      goByUserRole(signedInUser);
    } catch (error) {
      setFeedback(error.message);
    }
  }, [
    goByUserRole,
    joinCode,
    loadTeacherModules,
    markSignedInUserOnline,
    setCurrentUser,
    setFeedback,
    setJoinForm,
    setPage,
    setStudent,
  ]);

  const registerStudentAccount = useCallback(async (event, profile) => {
    event.preventDefault();

    try {
      const data = await registerStudent(profile);
      setUsers((currentUsers) => [...currentUsers, data.user]);
      await logoutUser();
      setCurrentUser(null);
      setStudent(null);
      setFeedback(
        data.user.confirmationEmailSent
          ? 'Student account created. Please check your email and confirm the account before logging in.'
          : `Student account created, but the confirmation email was not sent automatically. ${data.user.confirmationEmailError || 'Please check Supabase email settings.'}`,
      );
      setPage('login');
      syncPublicPath('login', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    }
  }, [setCurrentUser, setFeedback, setPage, setStudent, setUsers]);

  const registerTeacherAccount = useCallback(async (event, profile) => {
    event.preventDefault();

    try {
      const data = await registerTeacher(profile);
      setUsers((currentUsers) => [...currentUsers, data.user]);
      await logoutUser();
      setCurrentUser(null);
      setStudent(null);
      setModules(initialModules);
      setFeedback(
        data.user.confirmationEmailSent
          ? 'Teacher account created. Please confirm your email first. After verification, an administrator must approve the account before dashboard features become available.'
          : 'Teacher account created. If the confirmation email arrived, please confirm it and login again so the admin approval request can be created.',
      );
      setPage('login');
      syncPublicPath('login', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    }
  }, [setCurrentUser, setFeedback, setModules, setPage, setStudent, setUsers]);

  const updateCurrentProfile = useCallback(async (profile) => {
    const updatedUser = await updateProfileDetails(currentUser, profile);

    setCurrentUser((user) =>
      user?.id === updatedUser.id ? { ...user, ...updatedUser } : user,
    );

    if (updatedUser.role === 'student') {
      setStudent((currentStudent) =>
        currentStudent?.id === updatedUser.id
          ? { ...currentStudent, ...updatedUser }
          : currentStudent,
      );
    }

    return updatedUser;
  }, [currentUser, setCurrentUser, setStudent]);

  return {
    login,
    logout,
    markSignedInUserOnline,
    registerStudentAccount,
    registerTeacherAccount,
    updateCurrentProfile,
  };
}
