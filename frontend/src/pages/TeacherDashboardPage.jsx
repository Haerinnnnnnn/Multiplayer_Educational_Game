import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ChangePasswordForm } from '../components/ChangePasswordForm.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import { EmptyState, Feedback, Stat } from '../components/Common.jsx';
import { ProfileDetailsForm } from '../components/ProfileDetailsForm.jsx';
import classicMcqImage from '../assets/ClassicMCQ.png';
import qrPairMatchImage from '../assets/QRPairMatch.png';
import {
  createModuleChapter,
  deleteModuleChapter,
  updateModuleChapter,
} from '../services/chapterService.js';
import {
  addStudentToModule,
  fetchModuleInviteCandidates,
  fetchModuleStudentAccess,
  inviteStudentToModule,
  removeStudentFromModule,
  reviewModuleJoinRequest,
} from '../services/moduleAccessService.js';
import {
  downloadQuestionTemplate,
  normalizeEditedQuestionImportRow,
  readExcelQuestionFile,
  validateQuestionImportRow,
} from '../services/questionImportService.js';
import { fetchStudentExperienceLeaderboard } from '../services/experienceService.js';
import { fetchTeacherJoinRequestNotifications } from '../services/teacherNotificationService.js';

function getInitial(name) {
  return (name || 'T').trim().charAt(0).toUpperCase() || 'T';
}

function getIndicatorStyle(activeTab) {
  const tabOrder = ['home', 'modules', 'sessions', 'history', 'analyze', 'leaderboard'];
  const index = tabOrder.indexOf(activeTab);

  if (index < 0) {
    return { display: 'none' };
  }

  return {
    transform: `translateX(${index * 112}px)`,
  };
}

function TeacherLeaderboardPage({ error, leaderboard, loading }) {
  return (
    <section className="student-leaderboard-page teacher-dashboard-panel-in">
      <div className="student-leaderboard-hero">
        <div>
          <p className="eyebrow">EXP Ranking</p>
          <h1>Student Leaderboard</h1>
          <p>Monitor the highest student EXP across all completed game sessions.</p>
        </div>
        <span>{leaderboard.length} players</span>
      </div>

      <section className="student-exp-leaderboard">
        <div className="student-exp-leaderboard-header">
          <div>
            <p className="eyebrow">Leaderboard</p>
            <h2>Top EXP Players</h2>
          </div>
          <span>{leaderboard.length}</span>
        </div>

        {loading && <p className="muted">Loading leaderboard...</p>}
        {!loading && error && <p className="leaderboard-error">{error}</p>}
        {!loading && !error && !leaderboard.length && (
          <p className="muted">No EXP ranking yet.</p>
        )}
        {!loading && !error && leaderboard.length > 0 && (
          <ol className="student-exp-leaderboard-list">
            {leaderboard.map((player) => (
              <li key={player.id || player.rank}>
                <strong>#{player.rank}</strong>
                <span>{player.name}</span>
                <b>{player.totalExp} EXP</b>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

function TeacherHome({ currentUser, modules, onCreateSession, onModules, onOpenActiveSession, sessions, stats }) {
  const activeSessions = sessions.filter((session) => session.status !== 'ended');

  return (
    <>
      <section className="teacher-hero-panel teacher-dashboard-panel-in">
        <div>
          <p className="eyebrow">Teacher Home</p>
          <h1>Welcome back, {currentUser?.name || 'Teacher'}</h1>
          <p>
            Teacher ID: <strong>{currentUser?.userCode || '-'}</strong>
          </p>
        </div>
        <button className="primary-button large-button" type="button" onClick={onCreateSession}>
          Create Session
        </button>
      </section>

      <div className="stats-grid teacher-dashboard-panel-in">
        <Stat label="Modules" value={stats.modules} />
        <Stat label="Questions" value={stats.questions} />
        <Stat label="Active Sessions" value={stats.active} />
        <Stat label="Past Sessions" value={stats.past} />
      </div>

      <section className="teacher-profile-panel teacher-dashboard-panel-in">
        <h2>Next Step</h2>
        <p className="muted">
          Create a module first, then manage the questions inside that module.
        </p>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={onModules}>
            Create Module
          </button>
          <button className="secondary-button" type="button" onClick={onCreateSession}>
            Create Session
          </button>
        </div>
      </section>

      {activeSessions.length > 0 && (
        <section className="teacher-profile-panel teacher-dashboard-panel-in active-session-panel">
          <div className="active-session-heading">
            <div>
              <h2>Active Session</h2>
              <p className="muted">You have a session still in progress.</p>
            </div>
            <span className="visibility-badge public">{activeSessions.length}</span>
          </div>

          <div className="active-session-list">
            {activeSessions.map((session) => {
              const module = getSessionModule(modules, session);

              return (
                <article className="active-session-card" key={session.id}>
                  <div>
                    <p className="eyebrow">{session.status === 'lobby' ? 'Waiting Lobby' : 'Live Game'}</p>
                    <h3>{session.code}</h3>
                    <p>{module?.title || '-'}</p>
                    <p className="muted">
                      {session.participants?.length || 0} students joined
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onOpenActiveSession(session.id)}
                  >
                    Return To Session
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function getReviewStatusLabel(status) {
  if (status === 'pending') {
    return 'Pending Admin Review';
  }

  if (status === 'approved') {
    return 'Approved';
  }

  if (status === 'rejected') {
    return 'Rejected';
  }

  return 'No Review Request';
}

function ModulesTab({
  feedback,
  moduleForm,
  moduleBusyMessage,
  modules,
  loadingModules,
  onAddModule,
  onDeleteModule,
  onEditModule,
  onManageModule,
  onManageStudents,
  onModuleFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onToggleModuleVisibility,
}) {
  return (
    <section className="teacher-dashboard-panel-in module-section-wrap">
      {moduleBusyMessage && (
        <div className="module-loading-overlay">
          <div className="logout-spinner" aria-hidden="true" />
          <strong>{moduleBusyMessage}</strong>
        </div>
      )}
      <form className="panel form-grid" onSubmit={onAddModule}>
        <h2>Create Module</h2>
        <label>
          Module Name
          <input
            value={moduleForm.title}
            onChange={(event) => onModuleFormChange({ ...moduleForm, title: event.target.value })}
            placeholder="Example: Web Development"
          />
        </label>
        <label>
          Description
          <textarea
            value={moduleForm.description}
            onChange={(event) =>
              onModuleFormChange({ ...moduleForm, description: event.target.value })
            }
            placeholder="Short module description"
          />
        </label>
        <p className="muted">
          New modules are private first. You can switch access after the module is created.
        </p>
        <button className="primary-button" type="submit">
          Add Module
        </button>
      </form>

      <Feedback text={feedback} />

      {loadingModules && <section className="panel">Loading modules...</section>}

      <div className="button-row admin-user-actions">
        <p className="muted admin-refresh-note">Refresh to check whether admin locked a module.</p>
        <button className="secondary-button" type="button" onClick={onRefreshModules}>
          Refresh Modules
        </button>
      </div>

      <div className="list-grid teacher-section-list">
        {modules.map((module) => (
          <section className={module.isLocked ? 'panel locked-module-card' : 'panel'} key={module.id}>
            <p className="eyebrow">{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</p>
            <h3 className={module.isLocked ? 'locked-module-title' : ''}>{module.title}</h3>
            <div className="module-status-row">
              <span className={module.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                {module.isLocked ? 'Locked by Admin' : 'Unlocked'}
              </span>
              <span className={`visibility-badge ${module.visibility === 'public' ? 'public' : 'private'}`}>
                {module.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>
            {module.isLocked && (
              <p className="module-lock-message">
                This module is locked by admin. This module cannot be used in any session unless it gets unlocked by admin.
              </p>
            )}
            <p>{module.description}</p>
            <div className="module-card-meta-grid">
              <span>
                <strong>{module.chapters?.length || 0}</strong>
                topics
              </span>
              <span>
                <strong>{module.questions?.length || 0}</strong>
                questions
              </span>
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => onManageModule(module.id)}
              >
                Manage Module
              </button>
            </div>
          </section>
        ))}
        {!loadingModules && modules.length === 0 && <EmptyState text="No modules created yet." />}
      </div>
    </section>
  );
}

function ManageModuleTab({
  currentUser,
  feedback,
  module,
  onBack,
  onDeleteModule,
  onEditModule,
  onManageTopicQuestions,
  onManageStudents,
  onRefreshModules,
  onRequestModuleReview,
  onToggleModuleVisibility,
}) {
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', sortOrder: 0 });
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingChapterForm, setEditingChapterForm] = useState({ title: '', description: '', sortOrder: 0 });
  const [editingModule, setEditingModule] = useState(false);
  const [editingModuleForm, setEditingModuleForm] = useState({ title: '', description: '' });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [busyMessage, setBusyMessage] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');
  const [deleteChapterConfirm, setDeleteChapterConfirm] = useState(null);

  if (!module) {
    return (
      <section className="teacher-dashboard-panel-in">
        <EmptyState text="Select a module first." />
      </section>
    );
  }

  const unassignedQuestionCount = (module.questions || []).filter((question) => !question.chapterId).length;

  function resetChapterForm() {
    setChapterForm({ title: '', description: '', sortOrder: 0 });
  }

  async function submitChapter(event) {
    event.preventDefault();

    if (!chapterForm.title.trim()) {
      setLocalFeedback('Please enter a topic title.');
      return;
    }

    try {
      setBusyMessage('Creating topic...');
      await createModuleChapter({
        moduleId: module.id,
        teacherId: currentUser?.id,
        chapterForm,
      });
      resetChapterForm();
      setLocalFeedback('Topic added to this module.');
      await onRefreshModules();
    } catch (error) {
      setLocalFeedback(error.message);
    } finally {
      setBusyMessage('');
    }
  }

  function startEditChapter(chapter) {
    setEditingChapterId(chapter.id);
    setEditingChapterForm({
      title: chapter.title || '',
      description: chapter.description || '',
      sortOrder: chapter.sortOrder || 0,
    });
  }

  async function submitEditChapter(event) {
    event.preventDefault();

    if (!editingChapterForm.title.trim()) {
      setLocalFeedback('Please enter a topic title.');
      return;
    }

    try {
      setBusyMessage('Updating topic...');
      await updateModuleChapter(editingChapterId, editingChapterForm);
      setEditingChapterId(null);
      setEditingChapterForm({ title: '', description: '', sortOrder: 0 });
      setLocalFeedback('Topic updated.');
      await onRefreshModules();
    } catch (error) {
      setLocalFeedback(error.message);
    } finally {
      setBusyMessage('');
    }
  }

  async function confirmRemoveChapter(chapter) {
    try {
      setDeleteChapterConfirm(null);
      setBusyMessage(`Removing ${chapter.chapterCode || 'topic'}...`);
      await deleteModuleChapter(chapter.id);
      setLocalFeedback('Topic removed from active use. Existing questions and results are kept.');
      await onRefreshModules();
    } catch (error) {
      setLocalFeedback(error.message);
    } finally {
      setBusyMessage('');
    }
  }

  function startEditModule() {
    setEditingModule(true);
    setEditingModuleForm({
      title: module.title || '',
      description: module.description === 'No description yet.' ? '' : module.description || '',
    });
  }

  async function submitModuleEdit(event) {
    event.preventDefault();

    const success = await onEditModule(module.id, editingModuleForm);

    if (success) {
      setEditingModule(false);
    }
  }

  async function submitReviewRequest(event) {
    event.preventDefault();

    const success = await onRequestModuleReview(
      module.id,
      reviewMessage || `I have updated ${module.moduleCode || module.title}. Please check again.`,
    );

    if (success) {
      setReviewOpen(false);
      setReviewMessage('');
    }
  }

  return (
    <section className="teacher-dashboard-panel-in module-manage-view">
      {busyMessage && (
        <div className="module-loading-overlay">
          <div className="logout-spinner" aria-hidden="true" />
          <strong>{busyMessage}</strong>
        </div>
      )}

      <section className="panel manage-module-hero">
        <div>
          <p className="eyebrow">{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</p>
          <h2>{module.title}</h2>
          <p>{module.description}</p>
          <div className="module-status-row">
            <span className={module.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
              {module.isLocked ? 'Locked by Admin' : 'Unlocked'}
            </span>
            <span className={`visibility-badge ${module.visibility === 'public' ? 'public' : 'private'}`}>
              {module.visibility === 'public' ? 'Public' : 'Private'}
            </span>
          </div>
        </div>
        <div className="manage-module-hero-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Back To Modules
          </button>
          <button className="secondary-button" type="button" onClick={() => onManageStudents(module.id)}>
            Manage Students
          </button>
        </div>
      </section>

      <Feedback text={localFeedback || feedback} />

      <section className="module-manage-grid">
        <section className="panel manage-module-card">
          <h3>Module Access</h3>
          <label className="module-access-switch">
            <span>
              <strong>{module.visibility === 'public' ? 'Public Module' : 'Private Module'}</strong>
              <small>
                {module.visibility === 'public'
                  ? 'Students can join directly.'
                  : 'Students need teacher approval before joining.'}
              </small>
            </span>
            <input
              checked={module.visibility === 'public'}
              type="checkbox"
              onChange={(event) =>
                onToggleModuleVisibility(module.id, event.target.checked ? 'public' : 'private')
              }
            />
            <i aria-hidden="true" />
          </label>
          {module.isLocked && (
            <p className="module-lock-message">
              This module is locked by admin. You can modify content, but it cannot be used in sessions until admin unlocks it.
            </p>
          )}
        </section>

        <section className="panel manage-module-card">
          <h3>Module Actions</h3>
          <div className="module-action-stack">
            <button className="secondary-button" type="button" onClick={startEditModule}>
              Edit Details
            </button>
            {module.isLocked && (
              <button className="secondary-button" type="button" onClick={() => setReviewOpen(true)}>
                Request Admin Review
              </button>
            )}
            <button className="secondary-button danger-button" type="button" onClick={() => onDeleteModule(module.id)}>
              Delete Module
            </button>
          </div>
        </section>
      </section>

      {module.latestReviewRequest && (
        <section className="panel review-status-panel manage-review-panel">
          <span className={`review-badge ${module.latestReviewRequest.status}`}>
            {getReviewStatusLabel(module.latestReviewRequest.status)}
          </span>
          {module.latestReviewRequest.status !== 'approved' && (
            <>
              <p>{module.latestReviewRequest.message}</p>
              {module.latestReviewRequest.adminFeedback && (
                <p className="muted">Admin feedback: {module.latestReviewRequest.adminFeedback}</p>
              )}
            </>
          )}
        </section>
      )}

      {reviewOpen && (
        <form className="panel review-request-form" onSubmit={submitReviewRequest}>
          <h3>Message To Admin</h3>
          <label>
            Review Message
            <textarea
              value={reviewMessage}
              onChange={(event) => setReviewMessage(event.target.value)}
              placeholder={`I have updated ${module.moduleCode || module.title}. Please check again.`}
            />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">
              Send Review Request
            </button>
            <button className="secondary-button" type="button" onClick={() => setReviewOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingModule && (
        <form className="panel form-grid module-edit-form" onSubmit={submitModuleEdit}>
          <h3>Edit Module Details</h3>
          <label>
            Module Name
            <input
              value={editingModuleForm.title}
              onChange={(event) =>
                setEditingModuleForm((currentForm) => ({ ...currentForm, title: event.target.value }))
              }
              placeholder="Module name"
            />
          </label>
          <label>
            Description
            <textarea
              value={editingModuleForm.description}
              onChange={(event) =>
                setEditingModuleForm((currentForm) => ({ ...currentForm, description: event.target.value }))
              }
              placeholder="Short module description"
            />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">
              Save Changes
            </button>
            <button className="secondary-button" type="button" onClick={() => setEditingModule(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="panel module-topic-panel">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Topics / Chapters</p>
            <h2>Organize Questions Inside This Module</h2>
            <p className="muted">
              Create topics such as Testing Basics, SQA vs SQC, or Code Quality. Questions can be linked to a topic later.
            </p>
          </div>
          <span className="topic-count-pill">{module.chapters?.length || 0} topics</span>
        </div>

        <form className="chapter-form-grid" onSubmit={submitChapter}>
          <label>
            Topic Title
            <input
              value={chapterForm.title}
              onChange={(event) => setChapterForm((currentForm) => ({ ...currentForm, title: event.target.value }))}
              placeholder="Example: Software Testing Basics"
            />
          </label>
          <label>
            Sort Order
            <input
              min="0"
              type="number"
              value={chapterForm.sortOrder}
              onChange={(event) => setChapterForm((currentForm) => ({ ...currentForm, sortOrder: event.target.value }))}
            />
          </label>
          <label className="chapter-description-field">
            Description
            <textarea
              value={chapterForm.description}
              onChange={(event) =>
                setChapterForm((currentForm) => ({ ...currentForm, description: event.target.value }))
              }
              placeholder="Short topic description"
            />
          </label>
          <button className="primary-button" type="submit">
            Add Topic
          </button>
        </form>

        <div className="chapter-list">
          {(module.chapters || []).map((chapter) => (
            <article className="chapter-card" key={chapter.id}>
              {editingChapterId === chapter.id ? (
                <form className="chapter-edit-form" onSubmit={submitEditChapter}>
                  <label>
                    Topic Title
                    <input
                      value={editingChapterForm.title}
                      onChange={(event) =>
                        setEditingChapterForm((currentForm) => ({ ...currentForm, title: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Sort Order
                    <input
                      min="0"
                      type="number"
                      value={editingChapterForm.sortOrder}
                      onChange={(event) =>
                        setEditingChapterForm((currentForm) => ({ ...currentForm, sortOrder: event.target.value }))
                      }
                    />
                  </label>
                  <label className="chapter-description-field">
                    Description
                    <textarea
                      value={editingChapterForm.description}
                      onChange={(event) =>
                        setEditingChapterForm((currentForm) => ({
                          ...currentForm,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="button-row">
                    <button className="primary-button" type="submit">
                      Save Topic
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setEditingChapterId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <p className="eyebrow">{chapter.chapterCode || `CH${String(chapter.id).padStart(3, '0')}`}</p>
                    <h3>{chapter.title}</h3>
                    <p>{chapter.description || 'No topic description yet.'}</p>
                  </div>
                  <div className="chapter-card-side">
                    <span>{chapter.questionCount || 0} questions</span>
                    <div className="table-action-row">
                      <button className="link-button" type="button" onClick={() => startEditChapter(chapter)}>
                        Edit
                      </button>
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => onManageTopicQuestions(module.id, chapter.id)}
                      >
                        Manage Questions
                      </button>
                      <button
                        className="link-button danger-link"
                        type="button"
                        onClick={() => setDeleteChapterConfirm(chapter)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
          {unassignedQuestionCount > 0 && (
            <article className="chapter-card unassigned-topic-card">
              <div>
                <p className="eyebrow">Unassigned</p>
                <h3>Questions Without Topic</h3>
                <p>Old or imported questions that are not linked to a topic yet.</p>
              </div>
              <div className="chapter-card-side">
                <span>{unassignedQuestionCount} questions</span>
                <button
                  className="link-button"
                  type="button"
                  onClick={() => onManageTopicQuestions(module.id, 'unassigned')}
                >
                  Manage Questions
                </button>
              </div>
            </article>
          )}
          {(module.chapters || []).length === 0 && unassignedQuestionCount === 0 && (
            <EmptyState text="No topics yet. Add your first topic above." />
          )}
        </div>
      </section>

      {deleteChapterConfirm &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop"
            role="presentation"
            onClick={() => setDeleteChapterConfirm(null)}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal topic-delete-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Remove Topic</p>
              <h2>Delete {deleteChapterConfirm.chapterCode || 'this topic'}?</h2>
              <p>
                This is a soft delete. The topic will not be usable for new sessions, but existing
                questions, EXP records, and result history will be kept.
              </p>
              <div className="topic-delete-preview">
                <strong>{deleteChapterConfirm.title}</strong>
                <span>{deleteChapterConfirm.questionCount || 0} questions linked</span>
              </div>
              <div className="button-row">
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={() => confirmRemoveChapter(deleteChapterConfirm)}
                >
                  Yes, Delete Topic
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setDeleteChapterConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}

function ModuleStudentsTab({ currentUser, module, onBack }) {
  const [studentRows, setStudentRows] = useState([]);
  const [inviteText, setInviteText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidatePanelOpen, setCandidatePanelOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [kickConfirmMember, setKickConfirmMember] = useState(null);
  const [kickingStudentId, setKickingStudentId] = useState(null);

  const joinedStudents = studentRows.filter((row) => row.accessType === 'member');
  const pendingRequests = studentRows.filter(
    (row) => row.accessType === 'request' && row.status === 'pending',
  );
  const reviewedRequests = studentRows.filter(
    (row) => row.accessType === 'request' && row.status !== 'pending',
  );

  async function loadStudents({ quiet = false } = {}) {
    if (!module?.id) {
      return;
    }

    if (!quiet) {
      setLoading(true);
      setFeedback('');
    }

    try {
      const data = await fetchModuleStudentAccess(module.id);
      setStudentRows(data);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }

  async function loadCandidates(searchText = candidateSearch, { quiet = false } = {}) {
    if (!module?.id) {
      return;
    }

    if (!quiet) {
      setLoadingCandidates(true);
      setFeedback('');
    }

    try {
      const data = await fetchModuleInviteCandidates(module.id, searchText);
      setCandidates(data);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      if (!quiet) {
        setLoadingCandidates(false);
      }
    }
  }

  useEffect(() => {
    loadStudents();
  }, [module?.id]);

  useEffect(() => {
    if (!module?.id) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadStudents({ quiet: true });
      if (candidatePanelOpen) {
        loadCandidates(candidateSearch, { quiet: true });
      }
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [candidatePanelOpen, candidateSearch, module?.id]);

  useEffect(() => {
    if (!candidatePanelOpen) {
      return;
    }

    loadCandidates('');
  }, [candidatePanelOpen, module?.id]);

  async function submitInvite(event) {
    event.preventDefault();

    if (!inviteText.trim()) {
      setFeedback('Please enter a student ID or email.');
      return;
    }

    setBusy(true);
    setFeedback('');

    try {
      await inviteStudentToModule({
        moduleId: module.id,
        searchText: inviteText,
        teacherId: currentUser?.id,
      });
      setInviteText('');
      setFeedback('Student added to this module.');
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function addCandidate(candidate) {
    setBusy(true);
    setFeedback('');

    try {
      await addStudentToModule({
        moduleId: module.id,
        studentId: candidate.studentId,
        teacherId: currentUser?.id,
      });
      setFeedback(`${candidate.studentCode} added to this module.`);
      await loadStudents();
      await loadCandidates();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(requestId, status) {
    setBusy(true);
    setFeedback('');

    try {
      await reviewModuleJoinRequest({ requestId, status });
      setFeedback(status === 'approved' ? 'Student request approved.' : 'Student request rejected.');
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function kickStudent(member) {
    setKickingStudentId(member.studentId);
    setBusy(true);
    setFeedback('');

    try {
      await removeStudentFromModule({
        moduleId: module.id,
        studentId: member.studentId,
      });
      setFeedback(`${member.studentCode || member.name} removed from this module.`);
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
      setKickConfirmMember(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setKickingStudentId(null);
      setBusy(false);
    }
  }

  if (!module) {
    return <EmptyState text="Select a module first." />;
  }

  return (
    <section className="teacher-dashboard-panel-in module-students-view">
      <section className="panel module-students-header">
        <div>
          <p className="eyebrow">Manage Students</p>
          <h2>{module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}</h2>
          <p className="muted">
            {module.visibility === 'public'
              ? 'Public module: students can join directly, and teacher can still add students.'
              : 'Private module: students must request access or be added by the teacher.'}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back To Modules
        </button>
      </section>

      <form className="panel form-grid" onSubmit={submitInvite}>
        <h2>Invite Student</h2>
        <label>
          Student ID or Email
          <input
            value={inviteText}
            onChange={(event) => setInviteText(event.target.value)}
            placeholder="Example: S001 or student@gmail.com"
          />
        </label>
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? 'Adding...' : 'Add Student To Module'}
        </button>
      </form>

      <section className="panel invite-browser-panel">
        <div className="invite-browser-header">
          <div>
            <h2>Registered Students</h2>
            <p className="muted">Open this list to find students already registered in the system.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setCandidatePanelOpen((open) => !open)}
          >
            {candidatePanelOpen ? 'Hide Students' : 'Show Students'}
          </button>
        </div>

        {candidatePanelOpen && (
          <div className="invite-browser-body">
            <form
              className="invite-search-row"
              onSubmit={(event) => {
                event.preventDefault();
                loadCandidates(candidateSearch);
              }}
            >
              <input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder="Search name, S001, email, or school"
              />
              <button className="secondary-button" type="submit">
                Search
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setCandidateSearch('');
                  loadCandidates('');
                }}
              >
                Clear
              </button>
            </form>

            {loadingCandidates && <p className="muted">Loading registered students...</p>}

            <div className="table-panel nested-table-panel invite-candidate-table">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.studentId}>
                      <td>{candidate.studentCode}</td>
                      <td>{candidate.name}</td>
                      <td>{candidate.email}</td>
                      <td>{candidate.schoolName}</td>
                      <td>{candidate.course || '-'}</td>
                      <td>
                        {candidate.isMember ? (
                          <span className="visibility-badge public">Joined</span>
                        ) : candidate.requestStatus ? (
                          <span className={`review-badge ${candidate.requestStatus}`}>
                            {candidate.requestStatus}
                          </span>
                        ) : (
                          <span className="visibility-badge private">Available</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="link-button"
                          disabled={busy || candidate.isMember}
                          type="button"
                          onClick={() => addCandidate(candidate)}
                        >
                          {candidate.isMember ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingCandidates && !candidates.length && (
                <EmptyState text="No registered students found." />
              )}
            </div>
          </div>
        )}
      </section>

      <Feedback text={feedback} />

      {loading && <section className="panel">Loading students...</section>}

      <section className="panel">
        <div className="module-section-heading">
          <div>
            <h2>Pending Requests</h2>
            <p className="muted">Auto refreshes every 5 seconds while this page is open.</p>
          </div>
          <button className="secondary-button" disabled={loading} type="button" onClick={loadStudents}>
            {loading ? 'Refreshing...' : 'Refresh Requests'}
          </button>
        </div>
        <div className="table-panel nested-table-panel">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.studentCode}</td>
                  <td>{request.name}</td>
                  <td>{request.email}</td>
                  <td>{request.requestMessage || '-'}</td>
                  <td>
                    <div className="table-action-row">
                      <button
                        className="link-button"
                        disabled={busy}
                        type="button"
                        onClick={() => reviewRequest(request.requestId, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="link-button danger-link"
                        disabled={busy}
                        type="button"
                        onClick={() => reviewRequest(request.requestId, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pendingRequests.length && <EmptyState text="No pending requests." />}
        </div>
      </section>

      <section className="panel">
        <h2>Joined Students</h2>
        <div className="table-panel nested-table-panel">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>School</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {joinedStudents.map((member) => (
                <tr key={member.studentId}>
                  <td>{member.studentCode}</td>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.schoolName}</td>
                  <td>
                    <span className="visibility-badge public">Joined</span>
                  </td>
                  <td>
                    <button
                      className="link-button danger-link"
                      disabled={busy}
                      type="button"
                      onClick={() => setKickConfirmMember(member)}
                    >
                      Kick
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!joinedStudents.length && <EmptyState text="No students joined yet." />}
        </div>
      </section>

      {reviewedRequests.length > 0 && (
        <section className="panel">
          <h2>Reviewed Requests</h2>
          <div className="table-panel nested-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewedRequests.map((request) => (
                  <tr key={request.requestId}>
                    <td>{request.studentCode}</td>
                    <td>{request.name}</td>
                    <td>
                      <span className={`review-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {kickConfirmMember &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop module-kick-backdrop"
            role="presentation"
            onClick={() => {
              if (!kickingStudentId) {
                setKickConfirmMember(null);
              }
            }}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal module-kick-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Remove Student</p>
              <h2>Kick {kickConfirmMember.studentCode || kickConfirmMember.name} from this module?</h2>
              <p>
                This student will lose access to {module.moduleCode || module.title}. They can request to join
                again later if the module is private.
              </p>
              <div className="module-kick-student-summary">
                <strong>{kickConfirmMember.name}</strong>
                <span>{kickConfirmMember.email}</span>
              </div>
              <div className="button-row">
                <button
                  className="secondary-button danger-button"
                  disabled={Boolean(kickingStudentId)}
                  type="button"
                  onClick={() => kickStudent(kickConfirmMember)}
                >
                  {kickingStudentId ? 'Removing...' : 'Yes, Kick Student'}
                </button>
                <button
                  className="secondary-button"
                  disabled={Boolean(kickingStudentId)}
                  type="button"
                  onClick={() => setKickConfirmMember(null)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}

function QuestionsTab({
  feedback,
  modules,
  loadingModules,
  editingQuestionId,
  onAddQuestion,
  onCancelQuestionEdit,
  onDeleteQuestion,
  onEditQuestion,
  onImportQuestions,
  onBackToModule,
  onQuestionFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onSelectedModuleChange,
  onTopicFilterChange,
  questionForm,
  selectedModule,
  selectedModuleId,
  topicFilterId = '',
}) {
  const [importRows, setImportRows] = useState([]);
  const [selectedImportRowIds, setSelectedImportRowIds] = useState([]);
  const [showImportDeleteConfirm, setShowImportDeleteConfirm] = useState(false);
  const [deletingSelectedImportRows, setDeletingSelectedImportRows] = useState(false);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importDragging, setImportDragging] = useState(false);
  const scopedTopicId = topicFilterId && topicFilterId !== 'unassigned' ? String(topicFilterId) : '';

  useEffect(() => {
    if (scopedTopicId && String(questionForm.chapterId || '') !== scopedTopicId) {
      onQuestionFormChange({
        ...questionForm,
        chapterId: scopedTopicId,
      });
    }
  }, [onQuestionFormChange, questionForm, scopedTopicId]);

  if (!modules.length) {
    return <EmptyState text="Create a module before adding questions." />;
  }

  const validImportRows = importRows.filter((row) => row.errors.length === 0);
  const invalidImportRows = importRows.length - validImportRows.length;
  const selectedImportRowCount = selectedImportRowIds.length;
  const allImportRowsSelected =
    importRows.length > 0 && selectedImportRowCount === importRows.length;
  const activeTopicFilter = topicFilterId === 'unassigned'
    ? {
        id: 'unassigned',
        chapterCode: 'UNASSIGNED',
        title: 'Questions Without Topic',
        description: 'Old or imported questions that are not linked to a topic yet.',
      }
    : (selectedModule?.chapters || []).find((chapter) => String(chapter.id) === String(topicFilterId));
  const visibleQuestions = topicFilterId
    ? (selectedModule?.questions || []).filter((item) =>
        topicFilterId === 'unassigned'
          ? !item.chapterId
          : Number(item.chapterId) === Number(topicFilterId),
      )
    : (selectedModule?.questions || []);

  async function readImportFile(file) {
    setImportRows([]);
    setSelectedImportRowIds([]);
    setShowImportDeleteConfirm(false);
    setImportError('');

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const supportedFile = ['.xlsx', '.xls', '.csv'].some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!supportedFile) {
      setImportError('Please upload an Excel or CSV file that follows the template.');
      return;
    }

    try {
      const rows = await readExcelQuestionFile(file);
      setImportRows(rows);
    } catch (error) {
      setImportError(error.message);
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    await readImportFile(file);
    event.target.value = '';
  }

  function handleImportDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(true);
  }

  function handleImportDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(false);
  }

  async function handleImportDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(false);
    const file = event.dataTransfer.files?.[0];
    await readImportFile(file);
  }

  async function confirmImport() {
    if (!validImportRows.length) {
      setImportError('No valid rows to import.');
      return;
    }

    setImporting(true);
    const scopedRows = validImportRows.map((row) => ({
      ...normalizeEditedQuestionImportRow(row),
      chapterId: scopedTopicId,
    }));
    const success = await onImportQuestions(scopedRows);
    setImporting(false);

    if (success) {
      setImportRows([]);
      setSelectedImportRowIds([]);
      setShowImportDeleteConfirm(false);
      setImportError('');
    }
  }

  function updateImportRow(importId, field, value) {
    setImportRows((currentRows) =>
      currentRows.map((row) => {
        if (row.importId !== importId) {
          return row;
        }

        const nextRow = {
          ...row,
          [field]: field === 'correctOption' ? value.toUpperCase() : value,
        };

        return {
          ...nextRow,
          errors: validateQuestionImportRow(nextRow),
        };
      }),
    );
  }

  function deleteImportRow(importId) {
    setImportRows((currentRows) => currentRows.filter((row) => row.importId !== importId));
    setSelectedImportRowIds((currentIds) => currentIds.filter((id) => id !== importId));
  }

  function toggleImportRowSelection(importId) {
    setSelectedImportRowIds((currentIds) =>
      currentIds.includes(importId)
        ? currentIds.filter((id) => id !== importId)
        : [...currentIds, importId],
    );
  }

  function toggleAllImportRows() {
    setSelectedImportRowIds(allImportRowsSelected ? [] : importRows.map((row) => row.importId));
  }

  function selectValidImportRows() {
    setSelectedImportRowIds(validImportRows.map((row) => row.importId));
  }

  async function handleBackToModule() {
    if (onRefreshModules) {
      await onRefreshModules();
    }

    onBackToModule?.();
  }

  function requestDeleteSelectedImportRows() {
    if (!selectedImportRowCount) {
      return;
    }

    setShowImportDeleteConfirm(true);
  }

  function confirmDeleteSelectedImportRows() {
    const selectedIds = new Set(selectedImportRowIds);
    setShowImportDeleteConfirm(false);
    setDeletingSelectedImportRows(true);

    window.setTimeout(() => {
      setImportRows((currentRows) => currentRows.filter((row) => !selectedIds.has(row.importId)));
      setSelectedImportRowIds([]);
      setDeletingSelectedImportRows(false);
    }, 650);
  }

  return (
    <section className="teacher-dashboard-panel-in">
      <section className="panel">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Question Bank</p>
            <h2>Manage Topic Questions</h2>
          </div>
          {onBackToModule && (
            <button className="secondary-button" type="button" onClick={handleBackToModule}>
              Back To Manage Module
            </button>
          )}
        </div>
        {selectedModule && (
          <div className="topic-scope-summary">
            <div>
              <p className="eyebrow">Module</p>
              <h3>{selectedModule.moduleCode ? `${selectedModule.moduleCode} - ${selectedModule.title}` : selectedModule.title}</h3>
              <p>Questions added here stay inside this selected module.</p>
            </div>
            <div>
              <p className="eyebrow">Teacher</p>
              <h3>Current Account</h3>
              <p>All changes are linked to your teacher account.</p>
            </div>
          </div>
        )}
        {activeTopicFilter ? (
          <div className="topic-context-card">
            <div>
              <p className="eyebrow">{activeTopicFilter.chapterCode}</p>
              <h3>{activeTopicFilter.title}</h3>
              <p>{activeTopicFilter.description || 'No topic description yet.'}</p>
            </div>
            <strong>{visibleQuestions.length} questions</strong>
          </div>
        ) : (
          <p className="lock-warning">
            Topic not found. Please go back to Manage Module and choose a topic again.
          </p>
        )}
        {selectedModule?.isLocked && (
          <p className="lock-warning">
            This module is locked by admin for sessions. You can still edit questions, but cannot use it in a game.
          </p>
        )}
      </section>

      <form className="panel form-grid" onSubmit={onAddQuestion}>
        <h2>{editingQuestionId ? 'Edit MCQ Question' : 'Add MCQ Question'}</h2>
        {activeTopicFilter && (
          <div className="fixed-topic-card">
            <p className="eyebrow">Fixed Topic / Chapter</p>
            <h3>{activeTopicFilter.chapterCode ? `${activeTopicFilter.chapterCode} - ${activeTopicFilter.title}` : activeTopicFilter.title}</h3>
            <p>New questions and imported questions will be saved into this topic only.</p>
          </div>
        )}
        <label>
          Question
          <input
            value={questionForm.question}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, question: event.target.value })
            }
            placeholder="Enter question"
          />
        </label>
        <div className="mcq-option-grid">
          <label>
            Option A
            <input
              value={questionForm.optionA}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionA: event.target.value })
              }
              placeholder="Enter option A"
            />
          </label>
          <label>
            Option B
            <input
              value={questionForm.optionB}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionB: event.target.value })
              }
              placeholder="Enter option B"
            />
          </label>
          <label>
            Option C
            <input
              value={questionForm.optionC}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionC: event.target.value })
              }
              placeholder="Enter option C"
            />
          </label>
          <label>
            Option D
            <input
              value={questionForm.optionD}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionD: event.target.value })
              }
              placeholder="Enter option D"
            />
          </label>
        </div>
        <label>
          Correct Answer
          <select
            value={questionForm.correctOption}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, correctOption: event.target.value })
            }
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
        <label>
          Explanation
          <textarea
            value={questionForm.explanation}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, explanation: event.target.value })
            }
            placeholder="Explain why the answer is correct"
          />
        </label>
        <div className="button-row">
          <button className="primary-button" type="submit">
            {editingQuestionId ? 'Save Question' : 'Add MCQ Question'}
          </button>
          {editingQuestionId && (
            <button className="secondary-button" type="button" onClick={onCancelQuestionEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <section className="panel form-grid">
        <div className="import-header">
          <div>
            <h2>Import Questions From Excel</h2>
            <p className="muted">
              Required columns: question, option_a, option_b, option_c, option_d, correct_option.
            </p>
          </div>
          <button
            className="secondary-button template-download-link"
            type="button"
            onClick={downloadQuestionTemplate}
          >
            Download Template
          </button>
        </div>
        <div
          className={`excel-drop-zone${importDragging ? ' dragging' : ''}`}
          onDragOver={handleImportDragOver}
          onDragLeave={handleImportDragLeave}
          onDrop={handleImportDrop}
        >
          <div className="excel-drop-icon" aria-hidden="true">
            XLS
          </div>
          <div className="excel-drop-copy">
            <h3>Drop Excel File Here</h3>
            <p>Drag your completed template into this box and the preview table will fill automatically.</p>
          </div>
          <label className="excel-file-picker">
            <span>Choose File</span>
            <input
              accept=".xlsx,.xls,.csv"
              type="file"
              onChange={handleImportFile}
            />
          </label>
        </div>

        {importError && <Feedback text={importError} />}

        {importRows.length > 0 && (
          <>
            <div className="import-summary">
              <strong>{validImportRows.length} valid</strong>
              <span>{invalidImportRows} need fixing</span>
            </div>
            <div className="import-bulk-toolbar">
              <div>
                <strong>{selectedImportRowCount}</strong>
                <span> selected</span>
              </div>
              <div className="import-bulk-actions">
                <button className="secondary-button" type="button" onClick={toggleAllImportRows}>
                  {allImportRowsSelected ? 'Clear Selection' : 'Select All'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={selectValidImportRows}
                  disabled={!validImportRows.length}
                >
                  Select Valid
                </button>
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={requestDeleteSelectedImportRows}
                  disabled={deletingSelectedImportRows || !selectedImportRowCount}
                >
                  Delete Selected
                </button>
              </div>
            </div>
            <div className="table-panel import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th className="import-select-cell">
                      <input
                        aria-label="Select all imported questions"
                        checked={allImportRowsSelected}
                        className="import-checkbox"
                        type="checkbox"
                        onChange={toggleAllImportRows}
                      />
                    </th>
                    <th>Row</th>
                    <th>Question</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                    <th>Answer</th>
                    <th>Explanation</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row) => (
                    <tr key={row.importId}>
                      <td className="import-select-cell">
                        <input
                          aria-label={`Select imported row ${row.importId}`}
                          checked={selectedImportRowIds.includes(row.importId)}
                          className="import-checkbox"
                          type="checkbox"
                          onChange={() => toggleImportRowSelection(row.importId)}
                        />
                      </td>
                      <td>{row.importId}</td>
                      <td>
                        <textarea
                          className="import-edit-field question"
                          value={row.question}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'question', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionA}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionA', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionB}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionB', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionC}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionC', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionD}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionD', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="import-answer-select"
                          value={row.correctOption}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'correctOption', event.target.value)
                          }
                        >
                          <option value="">-</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.explanation}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'explanation', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <span className={row.errors.length ? 'import-row-status invalid' : 'import-row-status valid'}>
                          {row.errors.length ? `Missing ${row.errors.join(', ')}` : 'Ready'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link-button danger-link"
                          type="button"
                          onClick={() => deleteImportRow(row.importId)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={confirmImport}
                disabled={importing || !validImportRows.length}
              >
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setImportRows([]);
                  setSelectedImportRowIds([]);
                  setShowImportDeleteConfirm(false);
                  setImportError('');
                }}
              >
                Clear Preview
              </button>
            </div>
          </>
        )}
      </section>

      {showImportDeleteConfirm &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop"
            role="presentation"
            onClick={() => setShowImportDeleteConfirm(false)}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Confirm Delete</p>
              <h2>Delete Selected Questions?</h2>
              <p>
                Are you sure you want to delete {selectedImportRowCount} selected imported
                question{selectedImportRowCount === 1 ? '' : 's'} from this preview?
              </p>
              <div className="button-row">
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={confirmDeleteSelectedImportRows}
                >
                  Yes, Delete
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowImportDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}

      {deletingSelectedImportRows &&
        createPortal(
          <div className="modal-backdrop import-delete-backdrop" role="presentation">
            <section className="review-message-modal import-delete-modal import-delete-loading" role="status">
              <div className="logout-spinner" aria-hidden="true" />
              <p className="eyebrow">Updating Preview</p>
              <h2>Deleting Selected Questions</h2>
              <p>Please wait while the selected Excel rows are removed.</p>
            </section>
          </div>,
          document.body,
        )}

      <Feedback text={feedback} />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>ID</th>
              <th>Topic</th>
              <th>Question</th>
              <th>Option A</th>
              <th>Option B</th>
              <th>Option C</th>
              <th>Option D</th>
              <th>Answer</th>
              <th>Explanation</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleQuestions.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.questionCode || `Q${String(item.id).padStart(3, '0')}`}</td>
                <td>
                  {item.chapterTitle || 'Unassigned'}
                  {item.chapterIsDeleted && <p className="muted table-subtext">Deleted topic</p>}
                </td>
                <td>{item.question}</td>
                <td>{item.optionA}</td>
                <td>{item.optionB}</td>
                <td>{item.optionC}</td>
                <td>{item.optionD}</td>
                <td>{item.correctOption}</td>
                <td>{item.explanation || '-'}</td>
                <td>
                  <div className="table-action-row">
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => onEditQuestion(item.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="link-button danger-link"
                      type="button"
                      onClick={() => onDeleteQuestion(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleQuestions.length === 0 && (
          <EmptyState text={topicFilterId ? 'No questions in this topic yet.' : 'No questions in this module yet.'} />
        )}
      </div>
    </section>
  );
}

function SessionsTab({ feedback, modules, onCreateSession, ongoingSession, onSessionFormChange, sessionForm }) {
  useEffect(() => {
    if (sessionForm.gameType) {
      onSessionFormChange({
        ...sessionForm,
        gameType: '',
        selectedQuestionIds: [],
      });
    }
  }, []);

  const selectableModules = modules.filter((module) => !module.isLocked && !module.isDeleted);
  const selectedModule = selectableModules.find((module) => module.id === Number(sessionForm.moduleId));
  const sessionBlocked = Boolean(selectedModule?.isLocked);
  const moduleChapters = (selectedModule?.chapters || []).filter((chapter) => !chapter.isDeleted);
  const selectedChapter = moduleChapters.find((chapter) => chapter.id === Number(sessionForm.chapterId));
  const moduleHasTopics = moduleChapters.length > 0;
  const availableQuestions = selectedChapter
    ? (selectedModule?.questions || []).filter(
        (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(selectedChapter.id),
      )
    : [];
  const availableQuestionCount = availableQuestions.length;
  const isManualMode = sessionForm.questionSelectionMode === 'manual';
  const isClassicMcq = sessionForm.gameType === 'classic_mcq';
  const isQrPairMatch = sessionForm.gameType === 'qr_pair_match';
  const hasSelectedGameType = Boolean(sessionForm.gameType);
  const selectedQuestionIds = sessionForm.selectedQuestionIds || [];
  const effectiveQuestionCount = isManualMode
    ? selectedQuestionIds.length
    : Number(sessionForm.questionCount) || 0;
  const generateDisabled = !hasSelectedGameType ||
    selectableModules.length === 0 || sessionBlocked || !moduleHasTopics || !selectedChapter || availableQuestionCount === 0 ||
    Boolean(ongoingSession) ||
    (isManualMode && selectedQuestionIds.length === 0) ||
    (isQrPairMatch && effectiveQuestionCount < 2);

  function updateSelectedModule(moduleId) {
    const nextModule = selectableModules.find((module) => module.id === Number(moduleId));
    const nextChapterId = (nextModule?.chapters || []).find((chapter) => !chapter.isDeleted)?.id || '';
    const nextTopicQuestionCount = (nextModule?.questions || []).filter(
      (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(nextChapterId),
    ).length;
    const nextQuestionCount = Math.min(
      Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
      Math.max(nextTopicQuestionCount || 1, 1),
    );

    onSessionFormChange({
      ...sessionForm,
      moduleId: nextModule?.id || '',
      chapterId: nextChapterId,
      questionCount: nextQuestionCount,
      selectedQuestionIds: [],
    });
  }

  function updateQuestionCount(value) {
    const minimumQuestionCount = isQrPairMatch ? 2 : 1;
    const nextValue = Math.min(
      Math.max(Number(value) || minimumQuestionCount, minimumQuestionCount),
      Math.max(availableQuestionCount, 1),
    );

    onSessionFormChange({ ...sessionForm, questionCount: nextValue });
  }

  function updateGameType(gameType) {
    const minimumQuestionCount = gameType === 'qr_pair_match' ? 2 : 1;

    onSessionFormChange({
      ...sessionForm,
      gameType,
      questionCount: Math.max(Number(sessionForm.questionCount) || minimumQuestionCount, minimumQuestionCount),
    });
  }

  function updateQrPairSetting(key, value) {
    onSessionFormChange({
      ...sessionForm,
      [key]: Math.max(Number(value) || 1, 1),
    });
  }

  function updateTimerEnabled(timerEnabled) {
    onSessionFormChange({
      ...sessionForm,
      timerEnabled,
    });
  }

  function updateQuestionSelectionMode(questionSelectionMode) {
    onSessionFormChange({
      ...sessionForm,
      questionSelectionMode,
      selectedQuestionIds: questionSelectionMode === 'manual' ? selectedQuestionIds : [],
    });
  }

  function toggleQuestion(questionId) {
    const isSelected = selectedQuestionIds.includes(questionId);
    const nextSelectedQuestionIds = isSelected
      ? selectedQuestionIds.filter((selectedId) => selectedId !== questionId)
      : [...selectedQuestionIds, questionId];

    onSessionFormChange({
      ...sessionForm,
      questionCount: Math.max(nextSelectedQuestionIds.length, 1),
      selectedQuestionIds: nextSelectedQuestionIds,
    });
  }

  return (
    <section className="teacher-dashboard-panel-in create-session-flow">
      <div className="session-game-selector">
        <h2>Create Session</h2>
        <fieldset className="session-mode-field">
          <legend>Game Type</legend>
          <div className="session-mode-grid session-game-grid">
            <label className={isClassicMcq ? 'session-mode-card session-game-card active' : 'session-mode-card session-game-card'}>
              <input
                checked={isClassicMcq}
                name="gameType"
                type="radio"
                value="classic_mcq"
                onChange={() => updateGameType('classic_mcq')}
              />
              <img alt="Classic MCQ mode preview" src={classicMcqImage} />
            </label>
            <label className={isQrPairMatch ? 'session-mode-card session-game-card active' : 'session-mode-card session-game-card'}>
              <input
                checked={isQrPairMatch}
                name="gameType"
                type="radio"
                value="qr_pair_match"
                onChange={() => updateGameType('qr_pair_match')}
              />
              <img alt="QR Pair Match mode preview" src={qrPairMatchImage} />
            </label>
          </div>
        </fieldset>
      </div>

        {hasSelectedGameType && (
          <form className="panel form-grid session-options-reveal" onSubmit={onCreateSession}>
            <label>
              1. Module
              <select
                disabled={selectableModules.length === 0}
                value={selectedModule ? sessionForm.moduleId : ''}
                onChange={(event) =>
                  updateSelectedModule(event.target.value)
                }
              >
                <option value="">
                  {selectableModules.length ? 'Choose a module' : 'No available modules'}
                </option>
                {selectableModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
                  </option>
                ))}
              </select>
            </label>
            {selectedModule && (
              <label>
                2. Topic / Chapter
                <select
                  disabled={!moduleHasTopics}
                  value={sessionForm.chapterId || ''}
                  onChange={(event) =>
                    onSessionFormChange({
                      ...sessionForm,
                      chapterId: event.target.value,
                      questionCount: Math.min(
                        Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
                        Math.max(
                          (selectedModule.questions || []).filter(
                            (question) => !question.chapterIsDeleted && Number(question.chapterId) === Number(event.target.value),
                          ).length,
                          1,
                        ),
                      ),
                      selectedQuestionIds: [],
                    })
                  }
                >
                  <option value="">
                    {moduleHasTopics ? 'Choose a topic' : 'No topics available'}
                  </option>
                  {moduleChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.chapterCode ? `${chapter.chapterCode} - ${chapter.title}` : chapter.title}
                      {` (${chapter.questionCount || 0} questions)`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedModule && !moduleHasTopics && (
              <p className="lock-warning">
                This module has no topics yet. Please open Manage Module and create at least one topic first.
              </p>
            )}
            <p className="muted session-question-count">
              {selectedChapter ? (
                <>
                  Topic <strong>{selectedChapter.title}</strong> has <strong>{availableQuestionCount}</strong> questions available.
                </>
              ) : (
                <>Choose a topic to see available questions.</>
              )}
              {isQrPairMatch ? ' QR Pair Match needs at least 2 questions.' : ''}
            </p>

            <fieldset className="session-mode-field">
              <legend>3. Question Selection</legend>
              <div className="session-mode-grid">
                <label className={isManualMode ? 'session-mode-card' : 'session-mode-card active'}>
                  <input
                    checked={!isManualMode}
                    name="questionSelectionMode"
                    type="radio"
                    value="random"
                    onChange={() => updateQuestionSelectionMode('random')}
                  />
                  <span>
                    <strong>Random Questions</strong>
                    <small>System randomly chooses questions from the selected topic.</small>
                  </span>
                </label>
                <label className={isManualMode ? 'session-mode-card active' : 'session-mode-card'}>
                  <input
                    checked={isManualMode}
                    name="questionSelectionMode"
                    type="radio"
                    value="manual"
                    onChange={() => updateQuestionSelectionMode('manual')}
                  />
                  <span>
                    <strong>Manual Select Questions</strong>
                    <small>Teacher chooses exactly which questions appear in the game.</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {!isQrPairMatch && (
              <fieldset className="session-mode-field">
                <legend>Classic MCQ Timer</legend>
                <div className="session-mode-grid">
                  <label className={sessionForm.timerEnabled ? 'session-mode-card active' : 'session-mode-card'}>
                    <input
                      checked={Boolean(sessionForm.timerEnabled)}
                      name="timerEnabled"
                      type="radio"
                      onChange={() => updateTimerEnabled(true)}
                    />
                    <span>
                      <strong>Timer On</strong>
                      <small>Students get higher marks when they answer faster.</small>
                    </span>
                  </label>
                  <label className={!sessionForm.timerEnabled ? 'session-mode-card active' : 'session-mode-card'}>
                    <input
                      checked={!sessionForm.timerEnabled}
                      name="timerEnabled"
                      type="radio"
                      onChange={() => updateTimerEnabled(false)}
                    />
                    <span>
                      <strong>No Timer</strong>
                      <small>Correct answers get fixed marks without time pressure.</small>
                    </span>
                  </label>
                </div>
                {sessionForm.timerEnabled && (
                  <label>
                    Seconds Per Question
                    <input
                      min="10"
                      type="number"
                      value={sessionForm.roundSeconds}
                      onChange={(event) => updateQrPairSetting('roundSeconds', event.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            )}

            {isQrPairMatch && (
              <div className="mcq-option-grid">
                <label>
                  Round Seconds
                  <input
                    min="10"
                    type="number"
                    value={sessionForm.roundSeconds}
                    onChange={(event) => updateQrPairSetting('roundSeconds', event.target.value)}
                  />
                </label>
                <label>
                  Wrong Scan Penalty Seconds
                  <input
                    min="1"
                    type="number"
                    value={sessionForm.wrongScanPenaltySeconds}
                    onChange={(event) =>
                      updateQrPairSetting('wrongScanPenaltySeconds', event.target.value)
                    }
                  />
                </label>
              </div>
            )}

            {!isManualMode && (
              <label>
                Number of Questions
                <input
                  max={Math.max(availableQuestionCount, 1)}
                  min={isQrPairMatch ? 2 : 1}
                  type="number"
                  value={sessionForm.questionCount}
                  onChange={(event) => updateQuestionCount(event.target.value)}
                />
              </label>
            )}

            {isManualMode && (
              <div className="manual-question-picker">
                <div className="manual-question-header">
                  <h3>Choose Questions</h3>
                  <span>{selectedQuestionIds.length} selected</span>
                </div>
                <div className="manual-question-list">
                  {availableQuestions.map((question) => (
                    <label className="manual-question-item" key={question.id}>
                      <input
                        checked={selectedQuestionIds.includes(question.id)}
                        type="checkbox"
                        onChange={() => toggleQuestion(question.id)}
                      />
                      <span>
                        <strong>{question.questionCode || `Q${question.id}`}</strong>
                        {question.question}
                      </span>
                    </label>
                  ))}
                  {availableQuestionCount === 0 && <EmptyState text="No questions in this topic yet." />}
                </div>
              </div>
            )}

            <button className="primary-button" disabled={generateDisabled} type="submit">
              Generate Session
            </button>
          </form>
        )}

      {ongoingSession && (
        <p className="feedback ongoing-room-warning">
          You have an ongoing room ({ongoingSession.code}). Please return to that room or close it before creating a new session.
        </p>
      )}

      <Feedback text={feedback} />
    </section>
  );
}

function getSessionModule(modules, session) {
  return modules.find((module) => module.id === session.moduleId);
}

function getSessionModuleTitle(modules, session) {
  return session.moduleTitle || getSessionModule(modules, session)?.title || '-';
}

function getSessionTopicTitle(session) {
  return session.topicTitle && session.topicTitle !== '-' ? session.topicTitle : 'Unassigned';
}

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function getSessionDate(session) {
  const rawDate = session.createdAtRaw || session.createdAt;
  const parsedDate = rawDate ? new Date(rawDate) : null;

  return parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
}

function isSameCalendarDate(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
  );
}

function isSessionInHistoryDateRange(session, dateRange) {
  if (dateRange === 'all') {
    return true;
  }

  const sessionDate = getSessionDate(session);

  if (!sessionDate) {
    return false;
  }

  const today = new Date();

  if (dateRange === 'today') {
    return isSameCalendarDate(sessionDate, today);
  }

  if (dateRange === 'week') {
    const weekStart = new Date(today);
    const daysFromMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);

    return sessionDate >= weekStart && sessionDate <= today;
  }

  if (dateRange === 'month') {
    return (
      sessionDate.getFullYear() === today.getFullYear()
      && sessionDate.getMonth() === today.getMonth()
    );
  }

  return true;
}

const ANALYZE_GAME_MODES = [
  {
    value: 'classic_mcq',
    label: 'Classic MCQ',
    eyebrow: 'MCQ Analysis',
    description: 'Review answer correctness, response speed, and scores from normal MCQ sessions.',
    primaryMetric: 'Correct Average',
    topicMetric: 'Correct Avg',
    attemptLabel: 'answers',
    studentMetric: 'Correct Avg',
    timeMetric: 'Avg Answer Time',
    detailText: 'correct answers',
    emptyText: 'No Classic MCQ sessions found for this module yet.',
  },
  {
    value: 'qr_pair_match',
    label: 'QR Pair Match',
    eyebrow: 'QR Analysis',
    description: 'Review successful matches, solve speed, wrong scans, and teamwork performance.',
    primaryMetric: 'Match Success',
    topicMetric: 'Success Rate',
    attemptLabel: 'matches',
    studentMetric: 'Match Success',
    timeMetric: 'Avg Solve Time',
    detailText: 'successful matches',
    emptyText: 'No QR Pair Match sessions found for this module yet.',
  },
];

function getAnalyzeGameMode(gameType) {
  return ANALYZE_GAME_MODES.find((mode) => mode.value === gameType) || ANALYZE_GAME_MODES[0];
}

function formatPercent(correct, total) {
  if (!total) {
    return '0%';
  }

  return `${Math.round((correct / total) * 100)}%`;
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) {
    return '-';
  }

  return `${Number(seconds).toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function getAverage(numbers) {
  const validNumbers = numbers.filter((number) => Number.isFinite(number));

  if (!validNumbers.length) {
    return null;
  }

  return validNumbers.reduce((total, number) => total + number, 0) / validNumbers.length;
}

function getTopicKey(topicId) {
  return topicId ? String(topicId) : 'unassigned';
}

function getQuestionTopic(module, questionId, session) {
  const question = (module?.questions || []).find((item) => Number(item.id) === Number(questionId));
  const firstSessionTopic = (session?.topics || [])[0];

  return {
    id: question?.chapterId || session?.topicId || firstSessionTopic?.id || null,
    code: question?.chapterCode || session?.topicCode || firstSessionTopic?.code || '',
    title: question?.chapterTitle || getSessionTopicTitle(session),
  };
}

function getQrPairAttempts(session, module) {
  return (session?.qrPair?.turns || [])
    .flatMap((turn) =>
      (turn.assignments || []).map((assignment) => ({
        ...assignment,
        turnNumber: turn.turnNumber,
      })),
    )
    .filter((assignment) => assignment.assignmentType === 'pair' && assignment.status !== 'pending')
    .map((assignment) => {
      const participant = (session.participants || []).find(
        (item) => Number(item.participantId) === Number(assignment.questionHolderParticipantId),
      );
      const topic = getQuestionTopic(module, assignment.questionId, session);

      return {
        sessionId: session.id,
        sessionCode: session.code,
        gameType: session.gameType,
        studentId: participant?.studentId || participant?.id || '',
        studentName: participant?.name || '-',
        questionId: assignment.questionId,
        topic,
        correct: assignment.status === 'correct',
        status: assignment.status,
        seconds: Number.isFinite(assignment.answeredSeconds) ? assignment.answeredSeconds : null,
        score: assignment.scoreAwarded || 0,
        wrongScans: Number(assignment.wrongScans || assignment.wrong_scan_count || 0),
      };
    });
}

function getClassicAttempts(session, module) {
  return (session.responses || []).map((response) => {
    const topic = getQuestionTopic(module, response.questionId, session);

    return {
      sessionId: session.id,
      sessionCode: session.code,
      gameType: session.gameType,
      studentId: response.studentId || '',
      studentName: response.studentName || '-',
      questionId: response.questionId,
      topic,
      correct: Boolean(response.correct),
      status: response.responseStatus || (response.correct ? 'correct' : 'wrong'),
      seconds: Number.isFinite(response.answeredSeconds) ? response.answeredSeconds : null,
      score: response.scoreAwarded || 0,
      wrongScans: Number(response.wrongScans || 0),
    };
  });
}

function makeEmptyStudentStats(student) {
  return {
    studentId: student.studentId,
    studentCode: student.studentCode || '',
    name: student.name || student.studentName || 'Student',
    email: student.email || '',
    sessionsJoined: 0,
    topicCounts: new Map(),
    answers: 0,
    correct: 0,
    score: 0,
    wrongScans: 0,
    times: [],
    attempts: [],
  };
}

function buildModuleAnalysis(module, sessions, studentRows, gameType = 'classic_mcq') {
  const mode = getAnalyzeGameMode(gameType);
  const moduleSessions = sessions.filter(
    (session) => Number(session.moduleId) === Number(module.id) && (session.gameType || 'classic_mcq') === gameType,
  );
  const memberRows = (studentRows || []).filter((row) => row.accessType === 'member');
  const studentsById = new Map();
  const topicStatsByKey = new Map();
  const attempts = [];

  (module.chapters || []).forEach((chapter) => {
    topicStatsByKey.set(getTopicKey(chapter.id), {
      id: chapter.id,
      code: chapter.chapterCode,
      title: chapter.title,
      sessions: new Set(),
      students: new Set(),
      answers: 0,
      correct: 0,
      scores: 0,
      wrongScans: 0,
      times: [],
    });
  });

  memberRows.forEach((student) => {
    if (student.studentId) {
      studentsById.set(student.studentId, makeEmptyStudentStats(student));
    }
  });

  moduleSessions.forEach((session) => {
    (session.participants || []).forEach((participant) => {
      if (!participant.studentId && !participant.id) {
        return;
      }

      const studentId = participant.studentId || participant.id;
      const existing = studentsById.get(studentId);

      if (!existing) {
        studentsById.set(studentId, makeEmptyStudentStats({
          studentId,
          name: participant.name,
        }));
      }

      const studentStats = studentsById.get(studentId);
      studentStats.sessionsJoined += 1;
      studentStats.score += participant.score || 0;

      (session.topics?.length ? session.topics : [{ id: session.topicId, title: getSessionTopicTitle(session) }])
        .forEach((topic) => {
          const topicKey = getTopicKey(topic.id);
          studentStats.topicCounts.set(topicKey, (studentStats.topicCounts.get(topicKey) || 0) + 1);

          if (!topicStatsByKey.has(topicKey)) {
            topicStatsByKey.set(topicKey, {
              id: topic.id,
              code: topic.code || session.topicCode || '',
              title: topic.title || getSessionTopicTitle(session),
              sessions: new Set(),
              students: new Set(),
              answers: 0,
              correct: 0,
              scores: 0,
              wrongScans: 0,
              times: [],
            });
          }

          const topicStats = topicStatsByKey.get(topicKey);
          topicStats.sessions.add(session.id);
          topicStats.students.add(studentId);
        });
    });

    attempts.push(
      ...(gameType === 'qr_pair_match'
        ? getQrPairAttempts(session, module)
        : getClassicAttempts(session, module)),
    );
  });

  attempts.forEach((attempt) => {
    if (!attempt.studentId) {
      return;
    }

    if (!studentsById.has(attempt.studentId)) {
      studentsById.set(attempt.studentId, makeEmptyStudentStats(attempt));
    }

    const studentStats = studentsById.get(attempt.studentId);
    const topicKey = getTopicKey(attempt.topic.id);

    studentStats.answers += 1;
    studentStats.correct += attempt.correct ? 1 : 0;
    studentStats.wrongScans += attempt.wrongScans || 0;
    studentStats.attempts.push(attempt);

    if (Number.isFinite(attempt.seconds)) {
      studentStats.times.push(attempt.seconds);
    }

    if (!topicStatsByKey.has(topicKey)) {
      topicStatsByKey.set(topicKey, {
        id: attempt.topic.id,
        code: attempt.topic.code || '',
        title: attempt.topic.title || 'Unassigned',
        sessions: new Set(),
        students: new Set(),
        answers: 0,
        correct: 0,
        scores: 0,
        wrongScans: 0,
        times: [],
      });
    }

    const topicStats = topicStatsByKey.get(topicKey);
    topicStats.answers += 1;
    topicStats.correct += attempt.correct ? 1 : 0;
    topicStats.scores += attempt.score || 0;
    topicStats.wrongScans += attempt.wrongScans || 0;
    topicStats.students.add(attempt.studentId);

    if (Number.isFinite(attempt.seconds)) {
      topicStats.times.push(attempt.seconds);
    }
  });

  const studentStats = [...studentsById.values()]
    .map((student) => {
      const topTopic = [...student.topicCounts.entries()]
        .sort((left, right) => right[1] - left[1])[0];
      const topTopicStats = topTopic ? topicStatsByKey.get(topTopic[0]) : null;

      return {
        ...student,
        accuracy: student.answers ? Math.round((student.correct / student.answers) * 100) : 0,
        averageTime: getAverage(student.times),
        topTopic: topTopicStats?.title || '-',
      };
    })
    .sort((left, right) => right.score - left.score || right.accuracy - left.accuracy);

  const topicStats = [...topicStatsByKey.values()]
    .map((topic) => ({
      ...topic,
      sessionCount: topic.sessions.size,
      studentCount: topic.students.size,
      accuracy: topic.answers ? Math.round((topic.correct / topic.answers) * 100) : 0,
      averageTime: getAverage(topic.times),
    }))
    .sort((left, right) => right.sessionCount - left.sessionCount || right.answers - left.answers);

  const totalAnswers = attempts.length;
  const totalCorrect = attempts.filter((attempt) => attempt.correct).length;
  const averageTime = getAverage(attempts.map((attempt) => attempt.seconds));
  const activeTopicStats = topicStats.filter((topic) => topic.answers > 0);
  const weakestTopic = [...activeTopicStats].sort((left, right) => left.accuracy - right.accuracy)[0];
  const strongestTopic = [...activeTopicStats].sort((left, right) => right.accuracy - left.accuracy)[0];

  return {
    moduleSessions,
    gameType,
    mode,
    studentStats,
    topicStats,
    totalAnswers,
    totalCorrect,
    totalWrongScans: attempts.reduce((total, attempt) => total + (attempt.wrongScans || 0), 0),
    averageTime,
    averageScore: getAverage(studentStats.map((student) => student.score)),
    accuracy: totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
    strongestTopic,
    weakestTopic,
  };
}

function AccuracyBar({ value }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div className="analyze-accuracy-bar" aria-label={`Accuracy ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function TeacherAnalyzeTab({ modules, sessions }) {
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [analyzeGameType, setAnalyzeGameType] = useState('classic_mcq');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topicBreakdownOpen, setTopicBreakdownOpen] = useState(false);
  const [studentPerformanceOpen, setStudentPerformanceOpen] = useState(false);
  const [studentRows, setStudentRows] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const selectedModule = modules.find((module) => String(module.id) === String(selectedModuleId));
  const analysis = selectedModule
    ? buildModuleAnalysis(selectedModule, sessions, studentRows, analyzeGameType)
    : null;
  const analyzeMode = getAnalyzeGameMode(analyzeGameType);
  const selectedStudent = analysis?.studentStats.find(
    (student) => String(student.studentId) === String(selectedStudentId),
  );
  const selectedModuleDescription = selectedModule?.description || 'No description yet.';

  useEffect(() => {
    if (!selectedModule?.id) {
      setStudentRows([]);
      return undefined;
    }

    let isMounted = true;

    async function loadStudents() {
      setLoadingStudents(true);
      setError('');

      try {
        const rows = await fetchModuleStudentAccess(selectedModule.id);

        if (isMounted) {
          setStudentRows(rows);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setLoadingStudents(false);
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [selectedModule?.id]);

  if (!selectedModule) {
    return (
      <section className="teacher-dashboard-panel-in analyze-page">
        <div className="analyze-hero panel">
          <div>
            <p className="eyebrow">Learning Analytics</p>
            <h1>Analyze Modules</h1>
            <p>Choose a module to review participation, topic performance, and student learning progress.</p>
          </div>
          <span>{modules.length} modules</span>
        </div>

        <div className="analyze-module-grid">
          {modules.map((module) => {
            const moduleSessions = sessions.filter((session) => Number(session.moduleId) === Number(module.id));
            const uniqueStudents = new Set(
              moduleSessions.flatMap((session) => (session.participants || []).map((participant) => participant.studentId || participant.id)),
            );
            const attempts = moduleSessions.flatMap((session) => [
              ...getClassicAttempts(session, module),
              ...getQrPairAttempts(session, module),
            ]);
            const correct = attempts.filter((attempt) => attempt.correct).length;
            const description = module.description || 'No description yet.';

            return (
              <article className="panel analyze-module-card" key={module.id}>
                <div className="analyze-module-card-head">
                  <p className="eyebrow">{module.moduleCode}</p>
                  <h2>{module.title}</h2>
                </div>
                <div className="analyze-description-hover">
                  <button className="description-toggle" type="button">
                    Show Description
                  </button>
                  <div className="analyze-description-popover" role="tooltip">
                    <p>{description}</p>
                  </div>
                </div>
                <div className="analyze-mini-grid">
                  <Stat label="Sessions" value={moduleSessions.length} />
                  <Stat label="Students Played" value={uniqueStudents.size} />
                  <Stat label="Topics" value={module.chapters?.length || 0} />
                  <Stat label="Correct Avg" value={formatPercent(correct, attempts.length)} />
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('');
                    setSelectedModuleId(module.id);
                  }}
                >
                  View Analysis
                </button>
              </article>
            );
          })}
          {modules.length === 0 && <EmptyState text="Create a module first before viewing analysis." />}
        </div>
      </section>
    );
  }

  return (
    <section className="teacher-dashboard-panel-in analyze-page">
      <div className="analyze-hero panel">
        <div>
          <p className="eyebrow">{selectedModule.moduleCode}</p>
          <div className="analyze-selected-title-wrap">
            <h1 tabIndex="0">{selectedModule.title}</h1>
            <div className="analyze-selected-description-popover" role="tooltip">
              <p>{selectedModuleDescription}</p>
            </div>
          </div>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setSelectedModuleId('');
            setSelectedStudentId('');
          }}
        >
          Back To Modules
        </button>
      </div>

      <Feedback text={error} />

      <section className="panel analyze-mode-panel">
        <div>
          <p className="eyebrow">Choose Analysis Type</p>
          <h2>{analyzeMode.label}</h2>
          <p>{analyzeMode.description}</p>
        </div>
        <div className="analyze-mode-options" role="tablist" aria-label="Analysis game type">
          {ANALYZE_GAME_MODES.map((mode) => (
            <button
              className={analyzeGameType === mode.value ? 'analyze-mode-card active' : 'analyze-mode-card'}
              key={mode.value}
              type="button"
              onClick={() => {
                setAnalyzeGameType(mode.value);
                setSelectedStudentId('');
                setTopicBreakdownOpen(false);
                setStudentPerformanceOpen(false);
              }}
            >
              <span>{mode.eyebrow}</span>
              <strong>{mode.label}</strong>
              <small>{mode.description}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="stats-grid analyze-summary-grid">
        <Stat label="Sessions" value={analysis.moduleSessions.length} />
        <Stat label="Students In Module" value={loadingStudents ? '...' : analysis.studentStats.length} />
        <Stat label={analysis.mode.primaryMetric} value={`${analysis.accuracy}%`} />
        <Stat label={analysis.mode.timeMetric} value={formatSeconds(analysis.averageTime)} />
        {analysis.gameType === 'qr_pair_match' && (
          <Stat label="Wrong Scans" value={analysis.totalWrongScans} />
        )}
      </div>

      <section className="panel analyze-section">
        <div className="analyze-section-heading">
          <div>
            <p className="eyebrow">{analysis.mode.eyebrow}</p>
            <h2>{analysis.mode.label} Topic Breakdown</h2>
          </div>
          <div className="analyze-section-actions">
            <div className="analyze-topic-highlight">
              <span>Strongest: {analysis.strongestTopic?.title || '-'}</span>
              <span>Weakest: {analysis.weakestTopic?.title || '-'}</span>
            </div>
            <button
              className="secondary-button compact-button analyze-collapse-button"
              type="button"
              onClick={() => setTopicBreakdownOpen((isOpen) => !isOpen)}
            >
              {topicBreakdownOpen ? 'Hide Breakdown' : 'Show Breakdown'}
            </button>
          </div>
        </div>
        {topicBreakdownOpen && (
          <div className="analyze-topic-list analyze-collapsible-content">
            {analysis.topicStats.map((topic) => (
              <article className="analyze-topic-row" key={getTopicKey(topic.id)}>
                <div>
                  <p className="eyebrow">{topic.code || 'Topic'}</p>
                  <h3>{topic.title}</h3>
                  <p>{topic.sessionCount} sessions · {topic.studentCount} students · {topic.answers} {analysis.mode.attemptLabel}</p>
                </div>
                <div className="analyze-topic-metrics">
                  <strong>{topic.accuracy}%</strong>
                  <AccuracyBar value={topic.accuracy} />
                  <span>{analysis.mode.timeMetric}: {formatSeconds(topic.averageTime)}</span>
                  {analysis.gameType === 'qr_pair_match' && <span>Wrong scans: {topic.wrongScans || 0}</span>}
                </div>
              </article>
            ))}
            {analysis.topicStats.length === 0 && <EmptyState text={analysis.mode.emptyText} />}
          </div>
        )}
      </section>

      <section className="panel analyze-section">
        <div className="analyze-section-heading">
          <div>
            <p className="eyebrow">Student Performance</p>
            <h2>Students In This Module</h2>
          </div>
          <div className="analyze-section-actions">
            {selectedStudent && studentPerformanceOpen && (
              <button className="secondary-button compact-button" type="button" onClick={() => setSelectedStudentId('')}>
                Clear Student View
              </button>
            )}
            <button
              className="secondary-button compact-button analyze-collapse-button"
              type="button"
              onClick={() => setStudentPerformanceOpen((isOpen) => !isOpen)}
            >
              {studentPerformanceOpen ? 'Hide Students' : 'Show Students'}
            </button>
          </div>
        </div>

        {studentPerformanceOpen && (
          <div className="analyze-collapsible-content">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Sessions Joined</th>
                    <th>Top Topic</th>
                    <th>{analysis.mode.studentMetric}</th>
                    <th>{analysis.mode.timeMetric}</th>
                    <th>Score</th>
                    {analysis.gameType === 'qr_pair_match' && <th>Wrong Scans</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.studentStats.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <strong>{student.name}</strong>
                        <br />
                        <span className="muted">{student.studentCode || student.email || '-'}</span>
                      </td>
                      <td>{student.sessionsJoined}</td>
                      <td>{student.topTopic}</td>
                      <td>
                        <div className="analyze-table-accuracy">
                          <span>{student.accuracy}%</span>
                          <AccuracyBar value={student.accuracy} />
                        </div>
                      </td>
                      <td>{formatSeconds(student.averageTime)}</td>
                      <td>{student.score}</td>
                      {analysis.gameType === 'qr_pair_match' && <td>{student.wrongScans || 0}</td>}
                      <td>
                        <button
                          className={selectedStudentId === student.studentId ? 'primary-button compact-button' : 'secondary-button compact-button'}
                          type="button"
                          onClick={() => setSelectedStudentId(student.studentId)}
                        >
                          View Student
                        </button>
                      </td>
                    </tr>
                  ))}
                  {analysis.studentStats.length === 0 && (
                    <tr>
                      <td colSpan={analysis.gameType === 'qr_pair_match' ? '8' : '7'}>
                        No joined students or session participants found for this analysis yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedStudent && (
              <div className="analyze-student-detail">
                <div>
                  <p className="eyebrow">Student Detail</p>
                  <h2>{selectedStudent.name}</h2>
                  <p>
                    {selectedStudent.correct}/{selectedStudent.answers} {analysis.mode.detailText} · {formatSeconds(selectedStudent.averageTime)} average time
                  </p>
                </div>
                <div className="analyze-mini-grid">
                  <Stat label="Sessions Joined" value={selectedStudent.sessionsJoined} />
                  <Stat label={analysis.mode.studentMetric} value={`${selectedStudent.accuracy}%`} />
                  <Stat label="Score In Module" value={selectedStudent.score} />
                  <Stat label="Most Played Topic" value={selectedStudent.topTopic} />
                </div>
                <div className="analyze-attempt-list">
                  {selectedStudent.attempts.slice(0, 12).map((attempt) => (
                    <div className="analyze-attempt-row" key={`${attempt.sessionId}-${attempt.questionId}-${attempt.status}-${attempt.score}`}>
                      <span>{attempt.sessionCode}</span>
                      <span>{attempt.topic.title}</span>
                      <strong className={attempt.correct ? 'success-text' : 'danger-text'}>{attempt.status}</strong>
                      <span>{formatSeconds(attempt.seconds)}</span>
                      <span>{attempt.score} pts</span>
                    </div>
                  ))}
                  {selectedStudent.attempts.length === 0 && <p className="muted">No answer records for this student yet.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

function SessionHistoryTab({ modules, onOpenResults, onReviewSession, sessions }) {
  const [historyFilters, setHistoryFilters] = useState({
    gameType: 'all',
    moduleId: 'all',
    dateRange: 'all',
  });

  const filteredSessions = sessions.filter((session) => {
    const sessionGameType = session.gameType || 'classic_mcq';
    const matchesGameType = historyFilters.gameType === 'all' || sessionGameType === historyFilters.gameType;
    const matchesModule = historyFilters.moduleId === 'all' || String(session.moduleId) === String(historyFilters.moduleId);
    const matchesDate = isSessionInHistoryDateRange(session, historyFilters.dateRange);

    return matchesGameType && matchesModule && matchesDate;
  });

  const activeFilterCount = Object.values(historyFilters).filter((value) => value !== 'all').length;

  function updateHistoryFilter(name, value) {
    setHistoryFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function resetHistoryFilters() {
    setHistoryFilters({
      gameType: 'all',
      moduleId: 'all',
      dateRange: 'all',
    });
  }

  return (
    <section className="teacher-dashboard-panel-in">
      <section className="panel teacher-history-filter-panel">
        <div>
          <p className="eyebrow">History Filters</p>
          <h2>Filter Sessions</h2>
          <p className="muted">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </p>
        </div>
        <div className="teacher-history-filter-grid">
          <label>
            Game Type
            <select
              value={historyFilters.gameType}
              onChange={(event) => updateHistoryFilter('gameType', event.target.value)}
            >
              <option value="all">All game types</option>
              <option value="classic_mcq">Classic MCQ</option>
              <option value="qr_pair_match">QR Pair Match</option>
            </select>
          </label>
          <label>
            Module
            <select
              value={historyFilters.moduleId}
              onChange={(event) => updateHistoryFilter('moduleId', event.target.value)}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <select
              value={historyFilters.dateRange}
              onChange={(event) => updateHistoryFilter('dateRange', event.target.value)}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={resetHistoryFilters}
            disabled={activeFilterCount === 0}
          >
            Reset Filters
          </button>
        </div>
      </section>
      <div className="teacher-history-list">
        {filteredSessions.map((session) => (
          <section className="panel teacher-history-card" key={session.id}>
            <div className="history-card-header">
              <div>
                <p className="eyebrow">{session.status}</p>
                <h3>{session.code}</h3>
                <span
                  className={
                    session.gameType === 'qr_pair_match'
                      ? 'history-game-badge qr-pair'
                      : 'history-game-badge classic'
                  }
                >
                  {getGameTypeLabel(session.gameType)}
                </span>
                <p>
                  <strong>Module:</strong> {getSessionModuleTitle(modules, session)}
                </p>
                <p className="muted">
                  Topic: {getSessionTopicTitle(session)}
                  {session.topicCode ? ` (${session.topicCode})` : ''}
                </p>
                <p className="muted">Questions: {session.questionIds?.length || session.questionCount || 0}</p>
                <p className="muted">{session.createdAt}</p>
              </div>
              <div className="history-card-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onReviewSession(session.id)}
                >
                  View Analysis
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => onOpenResults(session.id)}
                >
                  Open Result
                </button>
              </div>
            </div>
          </section>
        ))}
        {sessions.length === 0 && <EmptyState text="No sessions created yet." />}
        {sessions.length > 0 && filteredSessions.length === 0 && (
          <EmptyState text="No sessions match the selected filters." />
        )}
      </div>
    </section>
  );
}

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
  const teacherInitial = useMemo(() => getInitial(currentUser?.name), [currentUser?.name]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(initialTab === 'results' ? 'history' : initialTab);
  }, [initialTab]);

  useEffect(() => {
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
  }, [modules]);

  useEffect(() => {
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
  }, []);

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
          >
            Modules
          </button>
          <button
            className={activeTab === 'sessions' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
          <button
            className={activeTab === 'history' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button
            className={activeTab === 'analyze' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('analyze')}
          >
            Analyze
          </button>
          <button
            className={activeTab === 'leaderboard' ? 'teacher-tab active' : 'teacher-tab'}
            type="button"
            onClick={() => setActiveTab('leaderboard')}
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

      <section className="teacher-dashboard-content">
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
          <ModulesTab
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
          <QuestionsTab
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
          <SessionsTab
            feedback={feedback}
            modules={modules}
            onCreateSession={onCreateSession}
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
