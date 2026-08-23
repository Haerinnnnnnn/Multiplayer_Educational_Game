import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import {
  cleanupAdminUserEmail,
  createAdminUser,
  deleteAdminUser,
  fetchAdminModules,
  fetchAdminSessions,
  fetchAdminUsers,
  fetchTeacherAccountRequests,
  reviewAdminModuleRequest,
  reviewTeacherAccountRequest,
  updateAdminModuleLock,
  updateAdminUser,
} from '../services/adminService.js';
import { AdminHome } from './admin-dashboard/AdminHome.jsx';
import { AdminModulesTab } from './admin-dashboard/AdminModulesTab.jsx';
import { AdminSessionsTab } from './admin-dashboard/AdminSessionsTab.jsx';
import { AdminSettingsTab } from './admin-dashboard/AdminSettingsTab.jsx';
import { AdminTeacherRequestsTab } from './admin-dashboard/AdminTeacherRequestsTab.jsx';
import { AdminUsersTab } from './admin-dashboard/AdminUsersTab.jsx';
import { getIndicatorStyle, getInitial } from './admin-dashboard/adminDashboardHelpers.js';

export function AdminDashboardPage({
  currentUser,
  modules,
  onLogout,
  sessions,
  stats,
  users,
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [databaseUsers, setDatabaseUsers] = useState(users);
  const [databaseModules, setDatabaseModules] = useState(modules);
  const [databaseSessions, setDatabaseSessions] = useState(sessions);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loadingTeacherRequests, setLoadingTeacherRequests] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [modulesError, setModulesError] = useState('');
  const [sessionsError, setSessionsError] = useState('');
  const [teacherRequestsError, setTeacherRequestsError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const adminInitial = useMemo(() => getInitial(currentUser?.name), [currentUser?.name]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeTab]);

  async function loadUsers({ quiet = false } = {}) {
    if (!quiet) {
      setLoadingUsers(true);
      setUsersError('');
    }

    try {
      const data = await fetchAdminUsers();
      setDatabaseUsers(data);
    } catch (error) {
      setUsersError(error.message);
    } finally {
      if (!quiet) {
        setLoadingUsers(false);
      }
    }
  }

  async function loadModules({ quiet = false } = {}) {
    if (!quiet) {
      setLoadingModules(true);
      setModulesError('');
    }

    try {
      const data = await fetchAdminModules();
      setDatabaseModules(data);
    } catch (error) {
      setModulesError(error.message);
    } finally {
      if (!quiet) {
        setLoadingModules(false);
      }
    }
  }

  async function loadSessions({ quiet = false } = {}) {
    if (!quiet) {
      setLoadingSessions(true);
      setSessionsError('');
    }

    try {
      const data = await fetchAdminSessions();
      setDatabaseSessions(data);
    } catch (error) {
      setSessionsError(error.message);
    } finally {
      if (!quiet) {
        setLoadingSessions(false);
      }
    }
  }

  async function loadTeacherRequests({ quiet = false } = {}) {
    if (!quiet) {
      setLoadingTeacherRequests(true);
      setTeacherRequestsError('');
    }

    try {
      const data = await fetchTeacherAccountRequests();
      setTeacherRequests(data);
    } catch (error) {
      setTeacherRequestsError(error.message);
    } finally {
      if (!quiet) {
        setLoadingTeacherRequests(false);
      }
    }
  }

  async function editUser(user) {
    setLoadingUsers(true);
    setUsersError('');

    try {
      const updatedUser = await updateAdminUser(user);
      setDatabaseUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      );
    } catch (error) {
      setUsersError(error.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function createUser(profile) {
    setLoadingUsers(true);
    setUsersError('');

    try {
      const createdUser = await createAdminUser(profile);
      setDatabaseUsers((currentUsers) => [createdUser, ...currentUsers]);
      setUsersError(`${createdUser.userCode} created successfully.`);
      return createdUser;
    } catch (error) {
      setUsersError(error.message);
      throw error;
    } finally {
      setLoadingUsers(false);
    }
  }

  function requestAdminConfirm(options) {
    return new Promise((resolve) => {
      setConfirmDialog({
        ...options,
        resolve,
      });
    });
  }

  function closeAdminConfirm(value) {
    if (confirmDialog?.resolve) {
      confirmDialog.resolve(value);
    }

    setConfirmDialog(null);
  }

  async function deleteUser(user) {
    const confirmed = await requestAdminConfirm({
      eyebrow: 'Delete Account',
      title: `Delete ${user.name}?`,
      message: `This permanently removes the ${user.role} login account and profile.`,
      confirmText: 'Yes, Delete',
      danger: true,
    });

    if (!confirmed) {
      return false;
    }

    setLoadingUsers(true);
    setUsersError('');

    try {
      await deleteAdminUser(user);
      setDatabaseUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id));
    } catch (error) {
      setUsersError(error.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function cleanupEmail(email) {
    if (!email.trim()) {
      setUsersError('Please enter an email to clean.');
      return;
    }

    setLoadingUsers(true);
    setUsersError('');

    try {
      await cleanupAdminUserEmail(email);
      const normalizedEmail = email.trim().toLowerCase();
      setDatabaseUsers((currentUsers) =>
        currentUsers.filter((item) => item.email?.toLowerCase() !== normalizedEmail),
      );
      setUsersError(`Cleaned deleted account email: ${normalizedEmail}`);
    } catch (error) {
      setUsersError(error.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function toggleModuleLock(module) {
    const nextLocked = !module.isLocked;
    const action = nextLocked ? 'Lock' : 'Unlock';
    const confirmed = await requestAdminConfirm({
      eyebrow: 'Module Control',
      title: `${action} ${module.moduleCode || module.title}?`,
      message: nextLocked
        ? 'Locked modules cannot be published to students or used in game sessions until admin unlocks them.'
        : 'This module will become available for teacher sessions again.',
      confirmText: action,
      danger: nextLocked,
    });

    if (!confirmed) {
      return;
    }

    setLoadingModules(true);
    setModulesError('');

    try {
      const updatedModule = await updateAdminModuleLock(module.id, nextLocked);
      setDatabaseModules((currentModules) =>
        currentModules.map((item) =>
          item.id === module.id
            ? {
                ...item,
                isLocked: updatedModule.isLocked,
                lockedAt: updatedModule.lockedAt,
                lockedBy: updatedModule.lockedBy,
              }
            : item,
        ),
      );
    } catch (error) {
      setModulesError(error.message);
    } finally {
      setLoadingModules(false);
    }
  }

  async function reviewModuleRequest(reviewRequest, decision, adminFeedback) {
    const isApproved = decision === 'approved';
    const confirmed = await requestAdminConfirm({
      eyebrow: 'Review Request',
      title: `${isApproved ? 'Approve and unlock' : 'Reject'} this module review request?`,
      message: isApproved
        ? 'The module will be unlocked and the teacher will see the approved status.'
        : 'The module will remain locked and the teacher will see the rejected status.',
      confirmText: isApproved ? 'Approve And Unlock' : 'Reject Request',
      danger: !isApproved,
    });

    if (!confirmed) {
      return;
    }

    setLoadingModules(true);
    setModulesError('');

    try {
      await reviewAdminModuleRequest({
        requestId: reviewRequest.id,
        decision,
        adminFeedback,
      });
      await loadModules({ quiet: true });
      return true;
    } catch (error) {
      setModulesError(error.message);
      return false;
    } finally {
      setLoadingModules(false);
    }
  }

  async function reviewTeacherRequest(teacher, decision, message = '') {
    const isApproved = decision === 'approved';
    const confirmed = await requestAdminConfirm({
      eyebrow: 'Teacher Account Review',
      title: `${isApproved ? 'Approve' : 'Reject'} ${teacher.name}?`,
      message: isApproved
        ? 'This teacher will receive full access to teacher dashboard features.'
        : 'This teacher will remain signed in with dashboard features disabled and will see the rejection reason.',
      confirmText: isApproved ? 'Approve Teacher' : 'Reject Teacher',
      danger: !isApproved,
    });

    if (!confirmed) {
      return false;
    }

    setLoadingTeacherRequests(true);
    setTeacherRequestsError('');

    try {
      await reviewTeacherAccountRequest(teacher.id, decision, message);
      await Promise.all([
        loadTeacherRequests({ quiet: true }),
        loadUsers({ quiet: true }),
      ]);
      return true;
    } catch (error) {
      setTeacherRequestsError(error.message);
      return false;
    } finally {
      setLoadingTeacherRequests(false);
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
      loadModules();
      loadSessions();
      loadTeacherRequests();
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' || !['home', 'users'].includes(activeTab)) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadUsers({ quiet: true });
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [activeTab, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadTeacherRequests({ quiet: true });
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' || activeTab !== 'modules') {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadModules({ quiet: true });
    }, 10000);

    return () => window.clearInterval(refreshTimer);
  }, [activeTab, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' || !['home', 'sessions'].includes(activeTab)) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadSessions({ quiet: true });
    }, 10000);

    return () => window.clearInterval(refreshTimer);
  }, [activeTab, currentUser?.id, currentUser?.role]);

  return (
    <main className="admin-dashboard-shell">
      <DashboardBackground />
      <header className="admin-dashboard-nav">
        <button
          className="dashboard-brand-home"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveTab('home');
          }}
          aria-label="Go to admin dashboard home"
        >
          <BrandLogo className="admin-brand" subtitle="Admin Console" />
        </button>

        <nav className="admin-tabs" aria-label="Admin dashboard">
          <button
            className={activeTab === 'home' ? 'admin-tab active' : 'admin-tab'}
            type="button"
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            className={activeTab === 'users' ? 'admin-tab active' : 'admin-tab'}
            type="button"
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={activeTab === 'modules' ? 'admin-tab active' : 'admin-tab'}
            type="button"
            onClick={() => setActiveTab('modules')}
          >
            Modules
          </button>
          <button
            className={activeTab === 'sessions' ? 'admin-tab active' : 'admin-tab'}
            type="button"
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
          <button
            className={activeTab === 'teacher-requests' ? 'admin-tab active' : 'admin-tab'}
            type="button"
            onClick={() => setActiveTab('teacher-requests')}
          >
            Requests
            {teacherRequests.length > 0 && <strong className="admin-tab-badge">{teacherRequests.length}</strong>}
          </button>
          <span className="admin-tab-indicator" style={getIndicatorStyle(activeTab)} />
        </nav>

        <div className="admin-avatar-area">
          <button
            className={
              activeTab === 'teacher-requests'
                ? 'student-notification-button admin-notification-button active'
                : 'student-notification-button admin-notification-button'
            }
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setActiveTab('teacher-requests');
            }}
            aria-label="Open teacher account requests"
          >
            !
            {teacherRequests.length > 0 && <strong>{teacherRequests.length}</strong>}
          </button>

          <button
            className="avatar-button admin-avatar-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Open admin menu"
          >
            {adminInitial}
          </button>

          {menuOpen && (
            <div className="admin-menu">
              <button type="button" onClick={() => setActiveTab('settings')}>
                Settings
              </button>
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="admin-dashboard-content">
        {activeTab === 'home' && (
          <AdminHome modules={databaseModules} sessions={databaseSessions} stats={stats} users={databaseUsers} />
        )}
        {activeTab === 'users' && (
          <AdminUsersTab
            error={usersError}
            loading={loadingUsers}
            onCleanupEmail={cleanupEmail}
            onCreateUser={createUser}
            onDeleteUser={deleteUser}
            onEditUser={editUser}
            onRefresh={loadUsers}
            users={databaseUsers}
          />
        )}
        {activeTab === 'modules' && (
          <AdminModulesTab
            error={modulesError}
            loading={loadingModules}
            modules={databaseModules}
            onRefresh={loadModules}
            onReviewRequest={reviewModuleRequest}
            onToggleLock={toggleModuleLock}
          />
        )}
        {activeTab === 'sessions' && (
          <AdminSessionsTab
            error={sessionsError}
            loading={loadingSessions}
            onRefresh={loadSessions}
            sessions={databaseSessions}
          />
        )}
        {activeTab === 'teacher-requests' && (
          <AdminTeacherRequestsTab
            error={teacherRequestsError}
            loading={loadingTeacherRequests}
            onReview={reviewTeacherRequest}
            requests={teacherRequests}
          />
        )}
        {activeTab === 'settings' && <AdminSettingsTab currentUser={currentUser} />}
      </section>

      {confirmDialog &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop admin-confirm-backdrop"
            role="presentation"
            onClick={() => closeAdminConfirm(false)}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal admin-confirm-modal"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="eyebrow">{confirmDialog.eyebrow || 'Confirm Action'}</p>
              <h2>{confirmDialog.title}</h2>
              <p>{confirmDialog.message}</p>
              <div className="button-row">
                <button
                  className={confirmDialog.danger ? 'secondary-button danger-button' : 'primary-button'}
                  type="button"
                  onClick={() => closeAdminConfirm(true)}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
                <button className="secondary-button" type="button" onClick={() => closeAdminConfirm(false)}>
                  Cancel
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </main>
  );
}
