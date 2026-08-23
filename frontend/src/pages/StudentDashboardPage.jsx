import React, { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import { Feedback } from '../components/Common.jsx';
import {
  fetchStudentModules,
  joinPublicModule,
  requestPrivateModule,
} from '../services/moduleAccessService.js';
import { fetchStudentExperienceLeaderboard } from '../services/experienceService.js';
import { fetchStudentActivity } from '../services/studentActivityService.js';
import { fetchStudentSessionNotifications } from '../services/studentNotificationService.js';
import { StudentActivity } from './student-dashboard/StudentActivity.jsx';
import { StudentHome } from './student-dashboard/StudentHome.jsx';
import { StudentLeaderboardPage } from './student-dashboard/StudentLeaderboardPage.jsx';
import { StudentModules } from './student-dashboard/StudentModules.jsx';
import { StudentNotificationList } from './student-dashboard/StudentNotificationList.jsx';
import { StudentSettings } from './student-dashboard/StudentSettings.jsx';
import {
  getDismissedNotificationIds,
  getInitial,
  saveDismissedNotificationIds,
} from './student-dashboard/studentDashboardHelpers.js';

export function StudentDashboardPage({
  student,
  onJoinSession,
  onLogout,
  onUpdateProfile,
  onViewActivityResult,
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityError, setActivityError] = useState('');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [studentModules, setStudentModules] = useState([]);
  const [moduleError, setModuleError] = useState('');
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleFeedback, setModuleFeedback] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() =>
    getDismissedNotificationIds(student?.id),
  );

  const studentInitial = useMemo(() => getInitial(student?.name), [student?.name]);
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, notifications],
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeTab]);

  useEffect(() => {
    let active = true;

    async function loadActivity() {
      if (activeTab !== 'activity') {
        return;
      }

      setLoadingActivity(true);
      setActivityError('');

      try {
        const data = await fetchStudentActivity(student?.id);

        if (active) {
          setActivity(data);
        }
      } catch (error) {
        if (active) {
          setActivityError(error.message);
        }
      } finally {
        if (active) {
          setLoadingActivity(false);
        }
      }
    }

    loadActivity();

    return () => {
      active = false;
    };
  }, [activeTab, student?.id]);

  async function loadStudentModules() {
    if (!student?.id) {
      return;
    }

    setLoadingModules(true);
    setModuleError('');

    try {
      const data = await fetchStudentModules(student.id);
      setStudentModules(data);
    } catch (error) {
      setModuleError(error.message);
    } finally {
      setLoadingModules(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'home' && activeTab !== 'modules') {
      return;
    }

    loadStudentModules();
  }, [activeTab, student?.id]);

  useEffect(() => {
    setDismissedNotificationIds(getDismissedNotificationIds(student?.id));
  }, [student?.id]);

  useEffect(() => {
    if (!student?.id) {
      return undefined;
    }

    let active = true;

    async function loadNotifications({ quiet = false } = {}) {
      try {
        const data = await fetchStudentSessionNotifications(student.id);

        if (active) {
          setNotifications(data);
        }
      } catch (error) {
        if (!quiet && active) {
          setModuleFeedback(error.message);
        }
      }
    }

    loadNotifications();
    const refreshTimer = window.setInterval(() => loadNotifications({ quiet: true }), 8000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [student?.id]);

  useEffect(() => {
    if (!student?.id) {
      return undefined;
    }

    let active = true;

    async function loadLeaderboard({ quiet = false } = {}) {
      if (!quiet) {
        setLeaderboardLoading(true);
      }
      setLeaderboardError('');

      try {
        const data = await fetchStudentExperienceLeaderboard(10);

        if (active) {
          setLeaderboard(data);
        }
      } catch (error) {
        if (active) {
          setLeaderboardError(error.message);
        }
      } finally {
        if (active && !quiet) {
          setLeaderboardLoading(false);
        }
      }
    }

    loadLeaderboard();
    const refreshTimer = window.setInterval(() => loadLeaderboard({ quiet: true }), 12000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [student?.id]);

  function dismissNotification(notificationId) {
    const nextIds = [...dismissedNotificationIds, notificationId];
    setDismissedNotificationIds(nextIds);
    saveDismissedNotificationIds(student?.id, nextIds);
  }

  function joinFromNotification(notification) {
    setNotificationOpen(false);
    setMenuOpen(false);
    onJoinSession(notification.sessionCode);
  }

  async function joinModule(moduleId) {
    setModuleFeedback('');

    try {
      await joinPublicModule({ moduleId, studentId: student.id });
      setModuleFeedback('Module joined. You can now join sessions from this module.');
      await loadStudentModules();
    } catch (error) {
      setModuleFeedback(error.message);
    }
  }

  async function requestModule(moduleId, message) {
    setModuleFeedback('');

    try {
      await requestPrivateModule({ moduleId, studentId: student.id, message });
      setModuleFeedback('Join request sent to the teacher.');
      await loadStudentModules();
    } catch (error) {
      setModuleFeedback(error.message);
    }
  }

  return (
    <main className="student-dashboard-shell">
      <DashboardBackground />
      <header className="student-dashboard-nav">
        <button
          className="dashboard-brand-home"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveTab('home');
          }}
          aria-label="Go to student dashboard home"
        >
          <BrandLogo className="student-brand" subtitle="Learning System" />
        </button>

        <nav className="student-tabs" aria-label="Student dashboard">
          <button
            className={activeTab === 'home' ? 'student-tab active' : 'student-tab'}
            type="button"
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            className={activeTab === 'activity' ? 'student-tab active' : 'student-tab'}
            type="button"
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button
            className={activeTab === 'modules' ? 'student-tab active' : 'student-tab'}
            type="button"
            onClick={() => setActiveTab('modules')}
          >
            Modules
          </button>
          <button
            className={activeTab === 'leaderboard' ? 'student-tab active' : 'student-tab'}
            type="button"
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
          <span className={`student-tab-indicator ${activeTab}`} />
        </nav>

        <div className="student-avatar-area">
          <button
            className={visibleNotifications.length ? 'student-notification-button active' : 'student-notification-button'}
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setNotificationOpen((open) => !open);
            }}
            aria-expanded={notificationOpen}
            aria-label="Open student notifications"
          >
            <span aria-hidden="true">!</span>
            {visibleNotifications.length > 0 && <strong>{visibleNotifications.length}</strong>}
          </button>

          <button
            className="avatar-button"
            type="button"
            onClick={() => {
              setNotificationOpen(false);
              setMenuOpen((open) => !open);
            }}
            aria-expanded={menuOpen}
            aria-label="Open student menu"
          >
            {studentInitial}
          </button>

          {notificationOpen && (
            <div className="student-notification-popover">
              <div className="student-notification-popover-header">
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h2>Live Sessions</h2>
                </div>
                <span>{visibleNotifications.length}</span>
              </div>
              <StudentNotificationList
                compact
                notifications={visibleNotifications}
                onDismiss={dismissNotification}
                onJoin={joinFromNotification}
              />
            </div>
          )}

          {menuOpen && (
            <div className="student-menu">
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

      <section className="student-dashboard-content">
        {activeTab === 'home' && (
          <StudentHome
            joinedModules={studentModules.filter((module) => module.memberStatus === 'joined')}
            student={student}
            onJoinSession={onJoinSession}
            onOpenModules={() => setActiveTab('modules')}
          />
        )}
        {activeTab === 'activity' && (
          <StudentActivity
            activity={activity}
            error={activityError}
            loading={loadingActivity}
            onViewResult={onViewActivityResult}
          />
        )}
        {activeTab === 'modules' && (
          <>
            <Feedback text={moduleFeedback} />
            <StudentModules
              error={moduleError}
              loading={loadingModules}
              modules={studentModules}
              onJoinPublic={joinModule}
              onRequestPrivate={requestModule}
            />
          </>
        )}
        {activeTab === 'leaderboard' && (
          <StudentLeaderboardPage
            currentStudentId={student?.id}
            error={leaderboardError}
            leaderboard={leaderboard}
            loading={leaderboardLoading}
          />
        )}
        {activeTab === 'settings' && (
          <StudentSettings student={student} onUpdateProfile={onUpdateProfile} />
        )}
      </section>
    </main>
  );
}
