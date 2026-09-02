import React, { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ChangePasswordForm } from '../components/ChangePasswordForm.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import { ProfileDetailsForm } from '../components/ProfileDetailsForm.jsx';
import { fetchStudentExperienceLeaderboard } from '../services/experienceService.js';
import { fetchTeacherApprovalState, queueTeacherApprovalAfterEmailConfirmation } from '../services/authService.js';
import { fetchTeacherJoinRequestNotifications } from '../services/teacherNotificationService.js';
import { CreateSessionTab } from './teacher-dashboard/CreateSessionTab.jsx';
import { ManageModuleTab } from './teacher-dashboard/ManageModuleTab.jsx';
import { ModuleStudentsTab } from './teacher-dashboard/ModuleStudentsTab.jsx';
import { SessionHistoryTab } from './teacher-dashboard/SessionHistoryTab.jsx';
import { TeacherAnalyzeTab } from './teacher-dashboard/TeacherAnalyzeTab.jsx';
import { TeacherHome } from './teacher-dashboard/TeacherHome.jsx';
import { TeacherLeaderboardPage } from './teacher-dashboard/TeacherLeaderboardPage.jsx';
import { TeacherModulesTab } from './teacher-dashboard/TeacherModulesTab.jsx';
import { TopicQuestionsTab } from './teacher-dashboard/TopicQuestionsTab.jsx';
import { getInitial, getIndicatorStyle } from './teacher-dashboard/teacherDashboardHelpers.js';

export function TeacherDashboardPage({
  currentUser,
  feedback,
  initialTab = 'home',
  loadingModules,
  moduleBusyMessage,
  moduleForm,
  modules,
  editingQuestionId,
  onAddModule,
  onAddQuestion,
  onCancelQuestionEdit,
  onCreateSession,
  onDeleteModule,
  onDeleteQuestion,
  onEditModule,
  onEditQuestion,
  onImportQuestions,
  onLogout,
  onModuleFormChange,
  onOpenResults,
  onOpenActiveSession,
  ongoingSession,
  onQuestionFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onReviewSession,
  onSelectedModuleChange,
  onSessionFormChange,
  onToggleModuleVisibility,
  onUpdateProfile,
  questionForm,
  selectedModule,
  selectedModuleId,
  sessionForm,
  sessions,
  stats,
}) {
  const [activeTab, setActiveTab] = useState(initialTab === 'results' ? 'history' : initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [joinRequestNotifications, setJoinRequestNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [manageReturnTab, setManageReturnTab] = useState('modules');
  const [questionTopicFilterId, setQuestionTopicFilterId] = useState('');
  const [approvalState, setApprovalState] = useState({
    approvalStatus: currentUser?.approvalStatus || 'awaiting_email',
    approvalMessage: currentUser?.approvalMessage || '',
    reviewedAt: currentUser?.reviewedAt || null,
    emailVerifiedAt: currentUser?.emailVerifiedAt || null,
  });
  const [approvalRequestMessage, setApprovalRequestMessage] = useState('');
  const [approvalRequestFeedback, setApprovalRequestFeedback] = useState('');
  const [approvalRequestLoading, setApprovalRequestLoading] = useState(false);
  const teacherInitial = useMemo(() => getInitial(currentUser?.name), [currentUser?.name]);
  const teacherApproved = approvalState.approvalStatus === 'approved';

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(initialTab === 'results' ? 'history' : initialTab);
  }, [initialTab]);

  useEffect(() => {
    setApprovalState({
      approvalStatus: currentUser?.approvalStatus || 'awaiting_email',
      approvalMessage: currentUser?.approvalMessage || '',
      reviewedAt: currentUser?.reviewedAt || null,
      emailVerifiedAt: currentUser?.emailVerifiedAt || null,
    });
  }, [
    currentUser?.approvalMessage,
    currentUser?.approvalStatus,
    currentUser?.emailVerifiedAt,
    currentUser?.reviewedAt,
  ]);

  useEffect(() => {
    if (teacherApproved || activeTab === 'settings' || activeTab === 'home') {
      return;
    }

    setActiveTab('home');
  }, [activeTab, teacherApproved]);

  useEffect(() => {
    if (!currentUser?.id || teacherApproved) {
      return undefined;
    }

    let isMounted = true;

    async function refreshApprovalState() {
      try {
        const nextState = await fetchTeacherApprovalState(currentUser.id);

        if (!isMounted) {
          return;
        }

        setApprovalState((previousState) => {
          if (previousState.approvalStatus !== 'approved' && nextState.approvalStatus === 'approved') {
            onRefreshModules?.();
          }

          return nextState;
        });
      } catch (error) {
        console.warn(`Unable to refresh teacher approval status: ${error.message}`);
      }
    }

    refreshApprovalState();
    const refreshTimer = window.setInterval(refreshApprovalState, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [currentUser?.id, onRefreshModules, teacherApproved]);

  async function handleResendTeacherApproval(event) {
    event.preventDefault();
    const message = approvalRequestMessage.trim();

    if (!message) {
      setApprovalRequestFeedback('Please type a short reason before sending the request.');
      return;
    }

    setApprovalRequestLoading(true);
    setApprovalRequestFeedback('');

    try {
      const teacher = await queueTeacherApprovalAfterEmailConfirmation({ message });

      setApprovalState((previousState) => ({
        ...previousState,
        approvalStatus: teacher?.approvalStatus || 'pending',
        approvalMessage: teacher?.approvalMessage || message,
        reviewedAt: teacher?.reviewedAt || null,
        emailVerifiedAt: teacher?.emailVerifiedAt || previousState.emailVerifiedAt,
      }));
      setApprovalRequestMessage('');
      setApprovalRequestFeedback('Approval request resent. Please wait for admin review.');
    } catch (error) {
      setApprovalRequestFeedback(error.message || 'Unable to resend approval request.');
    } finally {
      setApprovalRequestLoading(false);
    }
  }

  useEffect(() => {
    if (!teacherApproved) {
      setJoinRequestNotifications([]);
      setNotificationOpen(false);
      return undefined;
    }

    let isMounted = true;

    async function loadJoinRequestNotifications() {
      try {
        const notifications = await fetchTeacherJoinRequestNotifications(modules);

        if (isMounted) {
          setJoinRequestNotifications(notifications);
          setNotificationError('');
        }
      } catch (error) {
        if (isMounted) {
          setNotificationError(error.message);
        }
      }
    }

    loadJoinRequestNotifications();
    const refreshTimer = window.setInterval(loadJoinRequestNotifications, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [modules, teacherApproved]);

  useEffect(() => {
    if (!teacherApproved) {
      setLeaderboard([]);
      return undefined;
    }

    let isMounted = true;

    async function loadLeaderboard({ quiet = false } = {}) {
      if (!quiet) {
        setLeaderboardLoading(true);
      }
      setLeaderboardError('');

      try {
        const data = await fetchStudentExperienceLeaderboard(10);

        if (isMounted) {
          setLeaderboard(data);
        }
      } catch (error) {
        if (isMounted) {
          setLeaderboardError(error.message);
        }
      } finally {
        if (isMounted && !quiet) {
          setLeaderboardLoading(false);
        }
      }
    }

    loadLeaderboard();
    const refreshTimer = window.setInterval(() => loadLeaderboard({ quiet: true }), 12000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [teacherApproved]);

  function openQuestionsForModule(moduleId, topicId = '') {
    onSelectedModuleChange(moduleId);
    setQuestionTopicFilterId(topicId ? String(topicId) : '');
    onQuestionFormChange({
      ...questionForm,
      chapterId: topicId && topicId !== 'unassigned' ? String(topicId) : '',
    });
    setActiveTab('questions');
  }

  function openStudentsForModule(moduleId) {
    onSelectedModuleChange(moduleId);
    setActiveTab('module-students');
  }

  function openManageModule(moduleId) {
    onSelectedModuleChange(moduleId);
    setActiveTab('module-manage');
  }

  function openRequestNotification(notification) {
    setNotificationOpen(false);
    setMenuOpen(false);
    openStudentsForModule(notification.moduleId);
  }

  return (
    <main className="teacher-dashboard-shell">
      <DashboardBackground />
      <header className="teacher-dashboard-nav">
        <button
          className="dashboard-brand-home"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveTab('home');
          }}
          aria-label="Go to teacher dashboard home"
        >
          <BrandLogo className="teacher-brand" subtitle="Teacher Console" />
        </button>

        <nav className="teacher-tabs" aria-label="Teacher dashboard">
          <button
            className={activeTab === 'home' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            className={activeTab === 'modules' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('modules')}
            disabled={!teacherApproved}
          >
            Modules
          </button>
          <button
            className={activeTab === 'sessions' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('sessions')}
            disabled={!teacherApproved}
          >
            Sessions
          </button>
          <button
            className={activeTab === 'history' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('history')}
            disabled={!teacherApproved}
          >
            History
          </button>
          <button
            className={activeTab === 'analyze' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('analyze')}
            disabled={!teacherApproved}
          >
            Analyze
          </button>
          <button
            className={activeTab === 'leaderboard' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            disabled={!teacherApproved}
          >
            Leaderboard
          </button>
          <span className="teacher-tab-indicator" style={getIndicatorStyle(activeTab)} />
        </nav>

        <div className="teacher-avatar-area">
          <button
            className={
              notificationOpen
                ? 'student-notification-button teacher-notification-button active'
                : 'student-notification-button teacher-notification-button'
            }
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setNotificationOpen((open) => !open);
            }}
            aria-expanded={notificationOpen}
            aria-label="Open teacher notifications"
            disabled={!teacherApproved}
          >
            !
            {joinRequestNotifications.length > 0 && <strong>{joinRequestNotifications.length}</strong>}
          </button>

          <button
            className="avatar-button teacher-avatar-button"
            type="button"
            onClick={() => {
              setNotificationOpen(false);
              setMenuOpen((open) => !open);
            }}
            aria-expanded={menuOpen}
            aria-label="Open teacher menu"
          >
            {teacherInitial}
          </button>

          {notificationOpen && (
            <div className="student-notification-popover teacher-notification-popover">
              <div className="student-notification-popover-header">
                <div>
                  <p className="eyebrow">Teacher Notifications</p>
                  <h2>Join Requests</h2>
                </div>
                <span>{joinRequestNotifications.length}</span>
              </div>

              {notificationError && (
                <p className="student-notification-empty compact">{notificationError}</p>
              )}

              {!notificationError && joinRequestNotifications.length > 0 && (
                <div className="student-notification-list compact">
                  {joinRequestNotifications.map((notification) => (
                    <article className="student-notification-card teacher-notification-card" key={notification.id}>
                      <div>
                        <p className="eyebrow">
                          {notification.moduleCode} - {notification.studentCode}
                        </p>
                        <h3>{notification.studentName}</h3>
                        <p>
                          Requested to join {notification.moduleTitle}.
                          {notification.requestMessage ? ` Message: ${notification.requestMessage}` : ''}
                        </p>
                        <small>{notification.studentEmail}</small>
                      </div>
                      <div className="student-notification-actions">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => openRequestNotification(notification)}
                        >
                          Review
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!notificationError && joinRequestNotifications.length === 0 && (
                <p className="student-notification-empty compact">No pending join requests.</p>
              )}
            </div>
          )}

          {menuOpen && (
            <div className="teacher-menu">
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

      {!teacherApproved && (
        <section className={`teacher-approval-banner ${approvalState.approvalStatus}`} role="status">
          <div className="teacher-approval-banner-icon" aria-hidden="true">
            {approvalState.approvalStatus === 'rejected' ? '!' : '...'}
          </div>
          <div>
            <p className="eyebrow">Teacher Account Status</p>
            <h1>
              {approvalState.approvalStatus === 'rejected'
                ? 'Teacher Account Not Approved'
                : approvalState.approvalStatus === 'awaiting_email'
                  ? 'Confirm Your Email'
                  : 'Account Approval Pending'}
            </h1>
            <p>
              {approvalState.approvalStatus === 'rejected'
                ? approvalState.approvalMessage ||
                  'The administrator did not approve this teacher account. Contact the administrator for more information.'
                : approvalState.approvalStatus === 'awaiting_email'
                  ? 'Please confirm the email address used during registration. Your request will be sent to the administrator after email verification.'
                  : 'Your email has been verified. Your teacher account is waiting for administrator approval. Dashboard features will become available after approval.'}
            </p>
            <small>Settings and Logout remain available while your account is under review.</small>
            {approvalState.approvalStatus === 'rejected' && (
              <form className="teacher-approval-resend-form" onSubmit={handleResendTeacherApproval}>
                <label htmlFor="teacher-approval-reason">Message To Admin</label>
                <textarea
                  id="teacher-approval-reason"
                  value={approvalRequestMessage}
                  onChange={(event) => setApprovalRequestMessage(event.target.value)}
                  maxLength={1000}
                  placeholder="Explain why your teacher account should be reviewed again..."
                />
                <div className="teacher-approval-resend-actions">
                  <button type="submit" disabled={approvalRequestLoading}>
                    {approvalRequestLoading ? 'Sending...' : 'Resend Approval Request'}
                  </button>
                  <span>{approvalRequestMessage.trim().length}/1000</span>
                </div>
                {approvalRequestFeedback && <p className="teacher-approval-resend-feedback">{approvalRequestFeedback}</p>}
              </form>
            )}
          </div>
        </section>
      )}

      <section
        className={`teacher-dashboard-content ${
          !teacherApproved && activeTab !== 'settings' ? 'teacher-approval-locked-content' : ''
        }`}
        aria-disabled={!teacherApproved && activeTab !== 'settings'}
      >
        {activeTab === 'home' && (
          <TeacherHome
            currentUser={currentUser}
            modules={modules}
            onOpenActiveSession={onOpenActiveSession}
            stats={stats}
            sessions={sessions}
            onCreateSession={() => setActiveTab('sessions')}
            onModules={() => setActiveTab('modules')}
          />
        )}

        {activeTab === 'modules' && (
          <TeacherModulesTab
            feedback={feedback}
            moduleForm={moduleForm}
            moduleBusyMessage={moduleBusyMessage}
            modules={modules}
            loadingModules={loadingModules}
            onAddModule={onAddModule}
            onDeleteModule={onDeleteModule}
            onEditModule={onEditModule}
            onManageModule={openManageModule}
            onManageStudents={openStudentsForModule}
            onModuleFormChange={onModuleFormChange}
            onRefreshModules={onRefreshModules}
            onRequestModuleReview={onRequestModuleReview}
            onToggleModuleVisibility={onToggleModuleVisibility}
          />
        )}

        {activeTab === 'module-manage' && (
          <ManageModuleTab
            currentUser={currentUser}
            feedback={feedback}
            module={selectedModule}
            onBack={() => setActiveTab('modules')}
            onDeleteModule={onDeleteModule}
            onEditModule={onEditModule}
            onManageTopicQuestions={(moduleId, topicId) => {
              setManageReturnTab('module-manage');
              openQuestionsForModule(moduleId, topicId);
            }}
            onManageStudents={(moduleId) => {
              setManageReturnTab('module-manage');
              openStudentsForModule(moduleId);
            }}
            onRefreshModules={onRefreshModules}
            onRequestModuleReview={onRequestModuleReview}
            onToggleModuleVisibility={onToggleModuleVisibility}
          />
        )}

        {activeTab === 'module-students' && (
          <ModuleStudentsTab
            currentUser={currentUser}
            module={selectedModule}
            onBack={() => setActiveTab(manageReturnTab)}
          />
        )}

        {activeTab === 'questions' && (
          <TopicQuestionsTab
            feedback={feedback}
            modules={modules}
            editingQuestionId={editingQuestionId}
            onAddQuestion={onAddQuestion}
            onCancelQuestionEdit={onCancelQuestionEdit}
            onDeleteQuestion={onDeleteQuestion}
            onEditQuestion={onEditQuestion}
            onImportQuestions={onImportQuestions}
            onQuestionFormChange={onQuestionFormChange}
            onSelectedModuleChange={onSelectedModuleChange}
            onTopicFilterChange={setQuestionTopicFilterId}
            questionForm={questionForm}
            selectedModule={selectedModule}
            selectedModuleId={selectedModuleId}
            topicFilterId={questionTopicFilterId}
            onBackToModule={() => setActiveTab(manageReturnTab)}
          />
        )}

        {activeTab === 'sessions' && (
          <CreateSessionTab
            feedback={feedback}
            modules={modules}
            onCreateSession={onCreateSession}
            onOpenActiveSession={onOpenActiveSession}
            ongoingSession={ongoingSession}
            onSessionFormChange={onSessionFormChange}
            sessionForm={sessionForm}
          />
        )}

        {activeTab === 'history' && (
          <SessionHistoryTab
            modules={modules}
            onOpenResults={onOpenResults}
            onReviewSession={onReviewSession}
            sessions={sessions}
          />
        )}

        {activeTab === 'analyze' && (
          <TeacherAnalyzeTab modules={modules} sessions={sessions} />
        )}

        {activeTab === 'leaderboard' && (
          <TeacherLeaderboardPage
            error={leaderboardError}
            leaderboard={leaderboard}
            loading={leaderboardLoading}
          />
        )}

        {activeTab === 'settings' && (
          <section className="teacher-settings-grid teacher-dashboard-panel-in">
            <div className="teacher-profile-panel">
              <h2>Settings</h2>
              <dl className="profile-list">
                <div>
                  <dt>Name</dt>
                  <dd>{currentUser?.name || '-'}</dd>
                </div>
                <div>
                  <dt>Teacher ID</dt>
                  <dd>{currentUser?.userCode || '-'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{currentUser?.email || '-'}</dd>
                </div>
                <div>
                  <dt>School</dt>
                  <dd>{currentUser?.schoolName || '-'}</dd>
                </div>
              </dl>
            </div>

            <div className="teacher-profile-panel">
              <ProfileDetailsForm user={currentUser} onUpdateProfile={onUpdateProfile} />
            </div>

            <div className="teacher-profile-panel">
              <ChangePasswordForm />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
