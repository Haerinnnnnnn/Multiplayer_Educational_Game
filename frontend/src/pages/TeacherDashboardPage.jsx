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
  addStudentToModule,
  fetchModuleInviteCandidates,
  fetchModuleStudentAccess,
  inviteStudentToModule,
  removeStudentFromModule,
  reviewModuleJoinRequest,
} from '../services/moduleAccessService.js';
import {
  normalizeEditedQuestionImportRow,
  readExcelQuestionFile,
  validateQuestionImportRow,
} from '../services/questionImportService.js';
import { fetchTeacherJoinRequestNotifications } from '../services/teacherNotificationService.js';

function getInitial(name) {
  return (name || 'T').trim().charAt(0).toUpperCase() || 'T';
}

function getIndicatorStyle(activeTab) {
  const tabOrder = ['home', 'modules', 'sessions', 'history'];
  const index = tabOrder.indexOf(activeTab);

  if (index < 0) {
    return { display: 'none' };
  }

  return {
    transform: `translateX(${index * 112}px)`,
  };
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
  onManageQuestions,
  onManageStudents,
  onModuleFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onToggleModuleVisibility,
}) {
  const [reviewModuleId, setReviewModuleId] = useState(null);
  const [reviewMessages, setReviewMessages] = useState({});
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleForm, setEditingModuleForm] = useState({ title: '', description: '' });

  function getReviewMessage(module) {
    return (
      reviewMessages[module.id] ??
      `I have updated ${module.moduleCode || module.title}. Please check again.`
    );
  }

  async function submitReviewRequest(event, module) {
    event.preventDefault();
    setReviewBusyId(module.id);

    const success = await onRequestModuleReview(module.id, getReviewMessage(module));
    setReviewBusyId(null);

    if (success) {
      setReviewModuleId(null);
    }
  }

  function startEditModule(module) {
    setReviewModuleId(null);
    setEditingModuleId(module.id);
    setEditingModuleForm({
      title: module.title || '',
      description: module.description === 'No description yet.' ? '' : module.description || '',
    });
  }

  async function submitModuleEdit(event) {
    event.preventDefault();

    const success = await onEditModule(editingModuleId, editingModuleForm);

    if (success) {
      setEditingModuleId(null);
      setEditingModuleForm({ title: '', description: '' });
    }
  }

  function cancelEditModule() {
    setEditingModuleId(null);
    setEditingModuleForm({ title: '', description: '' });
  }

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
            <label className="module-access-switch">
              <span>
                <strong>Module Access</strong>
                <small>{module.visibility === 'public' ? 'Students can join directly.' : 'Students need teacher approval.'}</small>
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
                This module is locked by admin. This module cannot be used in any session unless it gets unlocked by admin.
              </p>
            )}
            {module.latestReviewRequest && (
              <div
                className={
                  module.latestReviewRequest.status === 'approved'
                    ? 'review-status-inline'
                    : 'review-status-panel'
                }
              >
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
              </div>
            )}
            {editingModuleId === module.id ? (
              <form className="review-request-form module-edit-form" onSubmit={submitModuleEdit}>
                <label>
                  Module Name
                  <input
                    value={editingModuleForm.title}
                    onChange={(event) =>
                      setEditingModuleForm((currentForm) => ({
                        ...currentForm,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Module name"
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={editingModuleForm.description}
                    onChange={(event) =>
                      setEditingModuleForm((currentForm) => ({
                        ...currentForm,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short module description"
                  />
                </label>
                <div className="button-row">
                  <button className="primary-button" type="submit">
                    Save Changes
                  </button>
                  <button className="secondary-button" type="button" onClick={cancelEditModule}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p>{module.description}</p>
            )}
            <p className="muted">{module.questions?.length || 0} questions</p>
            {module.isLocked && reviewModuleId === module.id && (
              <form className="review-request-form" onSubmit={(event) => submitReviewRequest(event, module)}>
                <label>
                  Message To Admin
                  <textarea
                    value={getReviewMessage(module)}
                    onChange={(event) =>
                      setReviewMessages((currentMessages) => ({
                        ...currentMessages,
                        [module.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="button-row">
                  <button className="primary-button" disabled={reviewBusyId === module.id} type="submit">
                    {reviewBusyId === module.id ? 'Sending...' : 'Send Review Request'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setReviewModuleId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => onManageQuestions(module.id)}
              >
                Manage Questions
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onManageStudents(module.id)}
              >
                Manage Students
              </button>
              {editingModuleId !== module.id && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => startEditModule(module)}
                >
                  Edit Details
                </button>
              )}
              {module.isLocked && reviewModuleId !== module.id && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setReviewModuleId(module.id)}
                >
                  Request Admin Review
                </button>
              )}
              <button
                className="secondary-button"
                type="button"
                onClick={() => onDeleteModule(module.id)}
              >
                Delete
              </button>
            </div>
          </section>
        ))}
        {!loadingModules && modules.length === 0 && <EmptyState text="No modules created yet." />}
      </div>
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
  onQuestionFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onSelectedModuleChange,
  questionForm,
  selectedModule,
  selectedModuleId,
}) {
  const [importRows, setImportRows] = useState([]);
  const [selectedImportRowIds, setSelectedImportRowIds] = useState([]);
  const [showImportDeleteConfirm, setShowImportDeleteConfirm] = useState(false);
  const [deletingSelectedImportRows, setDeletingSelectedImportRows] = useState(false);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  if (!modules.length) {
    return <EmptyState text="Create a module before adding questions." />;
  }

  const validImportRows = importRows.filter((row) => row.errors.length === 0);
  const invalidImportRows = importRows.length - validImportRows.length;
  const selectedImportRowCount = selectedImportRowIds.length;
  const allImportRowsSelected =
    importRows.length > 0 && selectedImportRowCount === importRows.length;

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    setImportRows([]);
    setSelectedImportRowIds([]);
    setShowImportDeleteConfirm(false);
    setImportError('');

    if (!file) {
      return;
    }

    try {
      const rows = await readExcelQuestionFile(file);
      setImportRows(rows);
    } catch (error) {
      setImportError(error.message);
    } finally {
      event.target.value = '';
    }
  }

  async function confirmImport() {
    if (!validImportRows.length) {
      setImportError('No valid rows to import.');
      return;
    }

    setImporting(true);
    const success = await onImportQuestions(validImportRows.map(normalizeEditedQuestionImportRow));
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
        <label className="field-label">
          Select Module
          <select
            value={selectedModuleId}
            onChange={(event) => onSelectedModuleChange(Number(event.target.value))}
          >
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
              </option>
            ))}
          </select>
        </label>
        {selectedModule && (
          <p className="muted module-context-text">
            Questions added here will be linked to {selectedModule.moduleCode || 'this module'} and
            the current teacher account.
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
          <a
            className="secondary-button template-download-link"
            href="/templates/Question%20Template.xlsx"
            download="Question Template.xlsx"
          >
            Download Template
          </a>
        </div>
        <label>
          Excel File
          <input
            accept=".xlsx,.xls,.csv"
            type="file"
            onChange={handleImportFile}
          />
        </label>

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
            {selectedModule?.questions?.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.questionCode || `Q${String(item.id).padStart(3, '0')}`}</td>
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
        {selectedModule?.questions?.length === 0 && <EmptyState text="No questions in this module yet." />}
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

  const selectedModule = modules.find((module) => module.id === Number(sessionForm.moduleId));
  const sessionBlocked = Boolean(selectedModule?.isLocked);
  const availableQuestions = selectedModule?.questions || [];
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
    sessionBlocked || availableQuestionCount === 0 ||
    Boolean(ongoingSession) ||
    (isManualMode && selectedQuestionIds.length === 0) ||
    (isQrPairMatch && effectiveQuestionCount < 2);

  function updateSelectedModule(moduleId) {
    const nextModule = modules.find((module) => module.id === Number(moduleId));
    const nextQuestionCount = Math.min(
      Number(sessionForm.questionCount) || (isQrPairMatch ? 2 : 1),
      Math.max(nextModule?.questions?.length || 1, 1),
    );

    onSessionFormChange({
      ...sessionForm,
      moduleId: Number(moduleId),
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
              Module
              <select
                value={sessionForm.moduleId}
                onChange={(event) =>
                  updateSelectedModule(event.target.value)
                }
              >
                {modules.map((module) => (
                  <option disabled={module.isLocked} key={module.id} value={module.id}>
                    {module.title}{module.isLocked ? ' (Locked)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {sessionBlocked && (
              <p className="lock-warning">
                This module is locked by admin and cannot be used to create a game session.
              </p>
            )}
            <p className="muted session-question-count">
              This module has <strong>{availableQuestionCount}</strong> questions available.
              {isQrPairMatch ? ' QR Pair Match needs at least 2 questions.' : ''}
            </p>

            <fieldset className="session-mode-field">
              <legend>Question Selection</legend>
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
                    <small>System randomly chooses questions from this module.</small>
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
                  {availableQuestionCount === 0 && <EmptyState text="No questions in this module yet." />}
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

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function SessionHistoryTab({ modules, onOpenResults, onReviewSession, sessions }) {
  return (
    <section className="teacher-dashboard-panel-in">
      <div className="teacher-history-list">
        {sessions.map((session) => (
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
                <p>{getSessionModule(modules, session)?.title || '-'}</p>
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

  function openQuestionsForModule(moduleId) {
    onSelectedModuleChange(moduleId);
    setActiveTab('questions');
  }

  function openStudentsForModule(moduleId) {
    onSelectedModuleChange(moduleId);
    setActiveTab('module-students');
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
            onManageQuestions={openQuestionsForModule}
            onManageStudents={openStudentsForModule}
            onModuleFormChange={onModuleFormChange}
            onRefreshModules={onRefreshModules}
            onRequestModuleReview={onRequestModuleReview}
            onToggleModuleVisibility={onToggleModuleVisibility}
          />
        )}

        {activeTab === 'module-students' && (
          <ModuleStudentsTab
            currentUser={currentUser}
            module={selectedModule}
            onBack={() => setActiveTab('modules')}
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
            questionForm={questionForm}
            selectedModule={selectedModule}
            selectedModuleId={selectedModuleId}
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
