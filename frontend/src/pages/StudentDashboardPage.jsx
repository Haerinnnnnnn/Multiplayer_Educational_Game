import React, { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ChangePasswordForm } from '../components/ChangePasswordForm.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import { Feedback } from '../components/Common.jsx';
import { ProfileDetailsForm } from '../components/ProfileDetailsForm.jsx';
import {
  fetchStudentModules,
  joinPublicModule,
  requestPrivateModule,
} from '../services/moduleAccessService.js';
import { getLevelProgress } from '../services/experienceService.js';
import { fetchStudentActivity } from '../services/studentActivityService.js';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function getGameTypeClass(gameType) {
  return gameType === 'qr_pair_match' ? 'qr-pair' : 'classic';
}

function getInitial(name) {
  return (name || 'S').trim().charAt(0).toUpperCase() || 'S';
}

function StudentLevelCard({ student }) {
  const progress = getLevelProgress(student?.totalExp || 0);

  return (
    <section className="student-level-card">
      <div className="student-level-card-header">
        <div>
          <p className="eyebrow">Student Level</p>
          <h2>Level {student?.level || progress.level}</h2>
        </div>
        <span className="level-badge">LV {student?.level || progress.level}</span>
      </div>
      <div className="level-progress-track" aria-label={`Level progress ${progress.percent}%`}>
        <div className="level-progress-fill" style={{ '--level-progress': `${progress.percent}%` }} />
      </div>
      <div className="student-level-meta">
        <span>{progress.totalExp} EXP</span>
        {progress.nextThreshold ? (
          <span>{progress.remainingExp} EXP to Level {progress.level + 1}</span>
        ) : (
          <span>Max tracked level reached</span>
        )}
      </div>
    </section>
  );
}

function StudentHome({ joinedModules, student, onJoinSession, onOpenModules }) {
  return (
    <section className="student-dashboard-grid student-dashboard-panel-in">
      <div className="student-hero-panel">
        <p className="eyebrow">Student Home</p>
        <h1>Welcome back, {student?.name || 'Student'}</h1>
        <p>
          Student ID: <strong>{student?.userCode || student?.systemId || '-'}</strong>
        </p>
        <button className="primary-button large-button" type="button" onClick={onJoinSession}>
          Join Session
        </button>
        <div className="student-home-modules">
          <div className="student-home-modules-header">
            <strong>My Joined Modules</strong>
            <button className="link-button" type="button" onClick={onOpenModules}>
              View Modules
            </button>
          </div>
          {joinedModules.length ? (
            joinedModules.slice(0, 3).map((module) => (
              <div className="student-home-module-row" key={module.id}>
                <span>{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</span>
                <strong>{module.title}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No joined modules yet.</p>
          )}
        </div>
      </div>

      <div className="student-profile-card">
        <StudentLevelCard student={student} />
        <h2>Profile</h2>
        <dl className="profile-list">
          <div>
            <dt>Email</dt>
            <dd>{student?.email || '-'}</dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>{student?.schoolName || '-'}</dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{student?.grade || '-'}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{student?.course || '-'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function ModuleAccessBadge({ module }) {
  if (module.memberStatus === 'joined') {
    return <span className="visibility-badge public">Joined</span>;
  }

  if (module.requestStatus === 'pending') {
    return <span className="review-badge pending">Pending</span>;
  }

  if (module.requestStatus === 'rejected') {
    return <span className="review-badge rejected">Rejected</span>;
  }

  return (
    <span className={`visibility-badge ${module.visibility === 'public' ? 'public' : 'private'}`}>
      {module.visibility === 'public' ? 'Public' : 'Private'}
    </span>
  );
}

function StudentModules({ modules, onJoinPublic, onRequestPrivate, loading, error }) {
  const [requestMessages, setRequestMessages] = useState({});

  if (loading) {
    return <section className="panel student-dashboard-panel-in">Loading modules...</section>;
  }

  if (error) {
    return <Feedback text={error} />;
  }

  return (
    <section className="student-module-list student-dashboard-panel-in">
      {modules.map((module) => {
        const isJoined = module.memberStatus === 'joined';
        const isPending = module.requestStatus === 'pending';
        const isPrivate = module.visibility !== 'public';

        return (
          <article className={module.isLocked ? 'student-module-card locked-module-card' : 'student-module-card'} key={module.id}>
            <div className="student-module-card-header">
              <div>
                <p className="eyebrow">{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</p>
                <h2 className={module.isLocked ? 'locked-module-title' : ''}>{module.title}</h2>
              </div>
              <ModuleAccessBadge module={module} />
            </div>
            <p>{module.description}</p>
            {module.isLocked && (
              <p className="module-lock-message">
                This module is locked by admin and cannot be used in sessions now.
              </p>
            )}
            {module.requestStatus === 'rejected' && module.teacherResponse && (
              <p className="lock-warning">Teacher response: {module.teacherResponse}</p>
            )}
            {!isJoined && !module.isLocked && isPrivate && (
              <label className="student-request-message">
                Request Message
                <textarea
                  value={requestMessages[module.id] || ''}
                  onChange={(event) =>
                    setRequestMessages((currentMessages) => ({
                      ...currentMessages,
                      [module.id]: event.target.value,
                    }))
                  }
                  placeholder="Optional message to teacher"
                />
              </label>
            )}
            <div className="button-row">
              {isJoined && <button className="secondary-button" disabled type="button">Already Joined</button>}
              {!isJoined && !module.isLocked && module.visibility === 'public' && (
                <button className="primary-button" type="button" onClick={() => onJoinPublic(module.id)}>
                  Join Module
                </button>
              )}
              {!isJoined && !module.isLocked && isPrivate && (
                <button
                  className="primary-button"
                  disabled={isPending}
                  type="button"
                  onClick={() => onRequestPrivate(module.id, requestMessages[module.id] || '')}
                >
                  {isPending ? 'Request Sent' : 'Request Join'}
                </button>
              )}
            </div>
          </article>
        );
      })}
      {!modules.length && <section className="panel empty-state">No modules available yet.</section>}
    </section>
  );
}

function ActivityCard({ item, onViewResult }) {
  const [expanded, setExpanded] = useState(false);
  const canViewResult = item.sessionId && item.sessionStatus === 'ended' && onViewResult;

  return (
    <article className="activity-card">
      <button className="activity-card-main" type="button" onClick={() => setExpanded(!expanded)}>
        <span className="activity-card-info">
          <strong>{item.moduleTitle}</strong>
          <span className={`history-game-badge activity-game-badge ${getGameTypeClass(item.gameType)}`}>
            {getGameTypeLabel(item.gameType)}
          </span>
          <small>Session {item.sessionCode} - {formatDate(item.joinedAt)}</small>
        </span>
        <span className="activity-score">
          {item.score} pts
          {item.expGained > 0 && <small>+{item.expGained} EXP</small>}
        </span>
      </button>

      <div className="activity-metrics">
        <span>{item.totalAnswers} answers</span>
        <span>{item.correctCount} correct</span>
        <span>{item.wrongCount} wrong</span>
        <span>{item.sessionStatus}</span>
        {item.levelAfter && <span>Level {item.levelAfter}</span>}
      </div>

      <div className="activity-card-actions">
        <button
          className="secondary-button"
          disabled={!canViewResult}
          type="button"
          onClick={() => onViewResult(item.sessionId)}
        >
          {canViewResult ? 'View Result' : 'Result Available After Session Ends'}
        </button>
      </div>

      {expanded && (
        <div className="answer-history">
          {item.answers.length || item.qrAttempts?.length ? (
            <>
              {item.answers.map((answer) => (
              <div className="answer-history-row" key={answer.id}>
                <div>
                  <strong>{answer.questionText}</strong>
                  <p>Your answer: {answer.submittedAnswer}</p>
                  <p>Correct answer: {answer.correctAnswer}</p>
                  <p>Score earned: {answer.scoreAwarded || 0} pts</p>
                  {answer.explanation && <p>Explanation: {answer.explanation}</p>}
                </div>
                <span className={answer.isCorrect ? 'answer-badge correct' : 'answer-badge wrong'}>
                  {answer.isCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>
              ))}
              {(item.qrAttempts || []).map((attempt) => (
                <div className="answer-history-row" key={`qr-${attempt.id}`}>
                  <div>
                    <strong>{attempt.questionText}</strong>
                    <p>Correct answer: {attempt.correctAnswer}</p>
                    <p>
                      Time used: {Number.isFinite(attempt.answeredSeconds) ? `${attempt.answeredSeconds}s` : 'timeout'}
                    </p>
                    <p>Wrong scans: {attempt.wrongScanCount}</p>
                    <p>Score earned: {attempt.scoreAwarded || 0} pts</p>
                    {attempt.explanation && <p>Explanation: {attempt.explanation}</p>}
                  </div>
                  <span className={attempt.isCorrect ? 'answer-badge correct' : 'answer-badge wrong'}>
                    {attempt.isCorrect ? 'Correct Scan' : 'Timeout'}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <p className="muted">No answer details recorded for this session.</p>
          )}
        </div>
      )}
    </article>
  );
}

function StudentActivity({ activity, error, loading, onViewResult }) {
  if (loading) {
    return <section className="panel student-dashboard-panel-in">Loading activity...</section>;
  }

  if (error) {
    return <Feedback text={error} />;
  }

  if (!activity.length) {
    return <section className="panel empty-state student-dashboard-panel-in">No activity yet.</section>;
  }

  return (
    <section className="activity-list student-dashboard-panel-in">
      {activity.map((item) => (
        <ActivityCard item={item} key={item.id} onViewResult={onViewResult} />
      ))}
    </section>
  );
}

function StudentSettings({ onUpdateProfile, student }) {
  return (
    <section className="student-settings-grid student-dashboard-panel-in">
      <div className="student-profile-card">
        <h2>Settings</h2>
        <dl className="profile-list">
          <div>
            <dt>Name</dt>
            <dd>{student?.name || '-'}</dd>
          </div>
          <div>
            <dt>Student ID</dt>
            <dd>{student?.userCode || student?.systemId || '-'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{student?.email || '-'}</dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>{student?.schoolName || '-'}</dd>
          </div>
        </dl>
      </div>

      <div className="student-profile-card">
        <ProfileDetailsForm user={student} onUpdateProfile={onUpdateProfile} />
      </div>

      <div className="student-profile-card">
        <ChangePasswordForm />
      </div>
    </section>
  );
}

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

  const studentInitial = useMemo(() => getInitial(student?.name), [student?.name]);

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
          <span className={`student-tab-indicator ${activeTab}`} />
        </nav>

        <div className="student-avatar-area">
          <button
            className="avatar-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Open student menu"
          >
            {studentInitial}
          </button>

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
        {activeTab === 'settings' && (
          <StudentSettings student={student} onUpdateProfile={onUpdateProfile} />
        )}
      </section>
    </main>
  );
}
