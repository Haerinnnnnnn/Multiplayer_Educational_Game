import React, { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { DashboardBackground } from '../components/DashboardBackground.jsx';
import { EmptyState, Feedback, Stat } from '../components/Common.jsx';
import {
  cleanupAdminUserEmail,
  createAdminUser,
  deleteAdminUser,
  fetchAdminModuleInfo,
  fetchAdminModules,
  fetchAdminSessions,
  fetchAdminUsers,
  reviewAdminModuleRequest,
  updateAdminModuleLock,
  updateAdminUser,
} from '../services/adminService.js';

function getInitial(name) {
  return (name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function getIndicatorStyle(activeTab) {
  const tabOrder = ['home', 'users', 'modules', 'sessions'];
  const index = tabOrder.indexOf(activeTab);

  if (index < 0) {
    return { display: 'none' };
  }

  return {
    transform: `translateX(${index * 112}px)`,
  };
}

function AdminHome({ modules, sessions, users }) {
  const lockedModules = modules.filter((module) => module.isLocked).length;
  const deletedModules = modules.filter((module) => module.isDeleted).length;
  const activeRoomList = sessions.filter((session) =>
    ['lobby', 'live', 'active'].includes(String(session.status || '').toLowerCase()),
  );
  const createdRoomList = sessions.filter((session) => String(session.status || '').toLowerCase() === 'lobby');
  const liveRoomList = sessions.filter((session) =>
    ['live', 'active'].includes(String(session.status || '').toLowerCase()),
  );
  const ongoingSessions = activeRoomList.length;
  const createdSessions = createdRoomList.length;
  const liveSessions = liveRoomList.length;
  const students = users.filter((user) => user.role?.toLowerCase() === 'student').length;
  const teachers = users.filter((user) => user.role?.toLowerCase() === 'teacher').length;
  const onlineUserList = users.filter((user) => user.presenceStatus === 'online');
  const onlineUsers = onlineUserList.length;
  const latestSession = activeRoomList[0] || sessions[0];
  const overviewStats = [
    { label: 'Users', value: users.length, note: `${students} students / ${teachers} teachers` },
    { label: 'Modules', value: modules.length, note: `${lockedModules} locked / ${deletedModules} deleted` },
    { label: 'Ongoing Sessions', value: ongoingSessions, note: `${createdSessions} created / ${liveSessions} live` },
    { label: 'Online Now', value: onlineUsers, note: 'Live account status' },
  ];

  return (
    <div className="admin-home-layout admin-dashboard-panel-in">
      <section className="admin-hero-panel">
        <div className="admin-hero-copy">
          <p className="eyebrow">Admin Home</p>
          <h1>System Overview</h1>
          <p>
            Monitor users, learning modules, live rooms, and review activity from one O bitz
            control space.
          </p>

          <div className="admin-hero-tags" aria-label="Admin focus areas">
            <span>User Status</span>
            <span>Module Control</span>
            <span>Session Review</span>
          </div>
        </div>

        <div className="admin-live-card" aria-label="Admin live status">
          <div className="admin-live-card-header">
            <span>Live Monitor</span>
            <strong>{ongoingSessions} ongoing</strong>
          </div>

          <div className="admin-live-status-grid">
            <div>
              <span>Online Users</span>
              <strong>{onlineUsers}</strong>
            </div>
            <div>
              <span>Ongoing Sessions</span>
              <strong>{ongoingSessions}</strong>
            </div>
          </div>

          <div className="admin-live-radar">
            <span />
            <span />
            <span />
          </div>
          <dl>
            <div>
              <dt>{ongoingSessions ? 'Current Room' : 'Latest Session'}</dt>
              <dd>{latestSession?.code || 'No session yet'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{latestSession?.status || 'Connected'}</dd>
            </div>
          </dl>

          <div className="admin-active-room-list">
            <p>Ongoing Room Codes</p>
            {activeRoomList.length ? (
              activeRoomList.slice(0, 3).map((session) => (
                <span key={session.id}>
                  <i aria-hidden="true" />
                  <strong>{session.code}</strong>
                  <em>{session.status}</em>
                </span>
              ))
            ) : (
              <span className="admin-active-room-empty">No ongoing sessions</span>
            )}
          </div>
        </div>
      </section>

      <div className="admin-overview-grid" aria-label="Admin overview statistics">
        {overviewStats.map((item, index) => (
          <section className="admin-overview-card" key={item.label} style={{ '--delay': `${index * 0.06}s` }}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </section>
        ))}
      </div>

      <section className="admin-home-summary">
        <div>
          <p className="eyebrow">Quick Health</p>
          <h2>Everything important is one click away.</h2>
        </div>
        <div className="admin-summary-metrics">
          <span>{lockedModules} locked modules</span>
          <span>{deletedModules} deleted modules kept for audit</span>
          <span>{ongoingSessions} ongoing sessions</span>
          <span>{onlineUsers} users online</span>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatGameType(gameType) {
  if (gameType === 'qr_pair_match') {
    return 'QR Pair Match';
  }

  if (gameType === 'classic_mcq') {
    return 'Classic MCQ';
  }

  return gameType || '-';
}

function getEmptyCreateUserForm() {
  return {
    role: 'student',
    name: '',
    email: '',
    password: '',
    birthday: '',
    schoolName: '',
    grade: '',
    course: '',
  };
}

function UsersTab({
  error,
  loading,
  onCleanupEmail,
  onCreateUser,
  onDeleteUser,
  onEditUser,
  onRefresh,
  users,
}) {
  const [activeRole, setActiveRole] = useState('student');
  const [editingUser, setEditingUser] = useState(null);
  const [cleanupEmail, setCleanupEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState(getEmptyCreateUserForm);
  const students = users.filter((user) => user.role?.toLowerCase() === 'student');
  const teachers = users.filter((user) => user.role?.toLowerCase() === 'teacher');
  const visibleUsers = activeRole === 'student' ? students : teachers;
  const onlineUsers = users.filter((user) => user.presenceStatus === 'online');

  function startEdit(user) {
    setEditingUser({ ...user });
  }

  async function submitEdit(event) {
    event.preventDefault();
    await onEditUser(editingUser);
    setEditingUser(null);
  }

  async function submitCleanup(event) {
    event.preventDefault();
    await onCleanupEmail(cleanupEmail);
    setCleanupEmail('');
  }

  async function submitCreateUser(event) {
    event.preventDefault();
    const createdUser = await onCreateUser(createForm);
    setCreateForm(getEmptyCreateUserForm());
    setCreatingUser(false);
    setActiveRole(createdUser.role);
  }

  return (
    <section className="admin-dashboard-panel-in admin-glass-section">
      <div className="stats-grid">
        <Stat label="Students" value={students.length} />
        <Stat label="Teachers" value={teachers.length} />
        <Stat label="All Users" value={users.length} />
        <Stat label="Online" value={onlineUsers.length} />
      </div>

      <Feedback text={error} />

      <section className="panel admin-create-user-panel">
        <div className="admin-create-user-header">
          <div>
            <p className="eyebrow">Admin Create Account</p>
            <h2>Add Student Or Teacher</h2>
            <p className="muted">
              Create a login account and matching database profile for the selected role.
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setCreatingUser((open) => !open)}
          >
            {creatingUser ? 'Hide Form' : 'Create Account'}
          </button>
        </div>

        {creatingUser && (
          <form className="form-grid admin-create-user-form" onSubmit={submitCreateUser}>
            <label>
              Role
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    role: event.target.value,
                    grade: event.target.value === 'student' ? createForm.grade : '',
                    course: event.target.value === 'student' ? createForm.course : '',
                  })
                }
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
            <label>
              Name
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                placeholder="Enter full name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                placeholder="student@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                placeholder="At least 8 characters"
              />
            </label>
            <label>
              Birthday
              <input
                type="date"
                value={createForm.birthday}
                onChange={(event) => setCreateForm({ ...createForm, birthday: event.target.value })}
              />
            </label>
            <label>
              School
              <input
                value={createForm.schoolName}
                onChange={(event) =>
                  setCreateForm({ ...createForm, schoolName: event.target.value })
                }
                placeholder="Enter school name"
              />
            </label>
            {createForm.role === 'student' && (
              <label>
                Grade
                <input
                  value={createForm.grade}
                  onChange={(event) => setCreateForm({ ...createForm, grade: event.target.value })}
                  placeholder="Example: Year 3"
                />
              </label>
            )}
            {createForm.role === 'student' && (
              <label>
                Course
                <input
                  value={createForm.course}
                  onChange={(event) => setCreateForm({ ...createForm, course: event.target.value })}
                  placeholder="Example: Software Engineering"
                />
              </label>
            )}
            <div className="button-row">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? 'Creating...' : 'Create User'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setCreateForm(getEmptyCreateUserForm());
                  setCreatingUser(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <form className="panel form-grid admin-edit-form" onSubmit={submitCleanup}>
        <h2>Clean Deleted Account Email</h2>
        <p className="muted">
          Use this only when an account was removed from the table but the same email still cannot register.
        </p>
        <label>
          Email
          <input
            type="email"
            value={cleanupEmail}
            onChange={(event) => setCleanupEmail(event.target.value)}
            placeholder="student@example.com"
          />
        </label>
        <button className="secondary-button" disabled={loading || !cleanupEmail.trim()} type="submit">
          Clean Email
        </button>
      </form>

      {editingUser && (
        <form className="panel form-grid admin-edit-form" onSubmit={submitEdit}>
          <h2>Edit {editingUser.role === 'student' ? 'Student' : 'Teacher'}</h2>
          <label>
            Name
            <input
              value={editingUser.name}
              onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              value={editingUser.email}
              onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })}
            />
          </label>
          <label>
            Birthday
            <input
              type="date"
              value={editingUser.birthday}
              onChange={(event) => setEditingUser({ ...editingUser, birthday: event.target.value })}
            />
          </label>
          <label>
            School
            <input
              value={editingUser.schoolName}
              onChange={(event) =>
                setEditingUser({ ...editingUser, schoolName: event.target.value })
              }
            />
          </label>
          {editingUser.role === 'student' && (
            <label>
              Grade
              <input
                value={editingUser.grade}
                onChange={(event) => setEditingUser({ ...editingUser, grade: event.target.value })}
              />
            </label>
          )}
          {editingUser.role === 'student' && (
            <label>
              Course
              <input
                value={editingUser.course}
                onChange={(event) =>
                  setEditingUser({ ...editingUser, course: event.target.value })
                }
              />
            </label>
          )}
          <div className="button-row">
            <button className="primary-button" type="submit">
              Save Changes
            </button>
            <button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="button-row admin-user-actions">
        <div className="admin-user-role-toggle" aria-label="Choose user role">
          <button
            className={activeRole === 'student' ? 'active' : ''}
            type="button"
            onClick={() => setActiveRole('student')}
          >
            Students Only
          </button>
          <button
            className={activeRole === 'teacher' ? 'active' : ''}
            type="button"
            onClick={() => setActiveRole('teacher')}
          >
            Teachers Only
          </button>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Users
        </button>
      </div>

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>School</th>
              {activeRole === 'student' && <th>Grade</th>}
              {activeRole === 'student' && <th>Course</th>}
              {activeRole === 'student' && <th>Level</th>}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.userCode}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span
                    className={
                      user.presenceStatus === 'online'
                        ? 'presence-badge online'
                        : 'presence-badge offline'
                    }
                  >
                    {user.presenceStatus === 'online' ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td>{user.schoolName}</td>
                {activeRole === 'student' && <td>{user.grade}</td>}
                {activeRole === 'student' && <td>{user.course}</td>}
                {activeRole === 'student' && (
                  <td>
                    <strong>Level {user.level || 1}</strong>
                    <p className="muted table-subtext">{user.totalExp || 0} EXP</p>
                  </td>
                )}
                <td>
                  <div className="table-action-row">
                    <button className="link-button" type="button" onClick={() => startEdit(user)}>
                      Edit
                    </button>
                    <button
                      className="link-button danger-link"
                      type="button"
                      onClick={() => onDeleteUser(user)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && visibleUsers.length === 0 && (
          <EmptyState
            text={activeRole === 'student' ? 'No students found yet.' : 'No teachers found yet.'}
          />
        )}
      </div>
    </section>
  );
}

function ModuleInfoModal({ info, loading, error, module, onClose }) {
  const displayModule = info?.module || module;
  const teacher = info?.teacher || {
    code: displayModule?.teacherCode,
    name: displayModule?.teacherName,
    email: displayModule?.teacherEmail,
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="module-info-title"
        aria-modal="true"
        className="review-message-modal module-info-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-message-header">
          <div>
            <p className="eyebrow">{displayModule?.moduleCode || 'Module'}</p>
            <h2 id="module-info-title">Module Information</h2>
            <p className="muted">{displayModule?.title}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <section className="panel">Loading module information...</section>}
        <Feedback text={error} />

        {info && (
          <div className="module-info-content">
            <div className="stats-grid module-info-stats">
              <Stat label="Questions" value={info.totals.questions} />
              <Stat label="Joined Students" value={info.totals.joinedStudents} />
              <Stat label="Sessions" value={info.totals.sessions} />
              <Stat label="Rounds Played" value={info.totals.rounds} />
            </div>

            <section className="review-message-block module-info-block">
              <div className="module-info-heading-row">
                <div>
                  <strong>Module Status</strong>
                  <p>
                    Visibility: {displayModule.visibility || 'private'} | Created:{' '}
                    {formatDateTime(displayModule.createdAt)}
                  </p>
                </div>
                <div className="module-info-badge-row">
                  {displayModule.isDeleted ? (
                    <span className="lock-badge deleted">Deleted</span>
                  ) : (
                    <span className={displayModule.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                      {displayModule.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  )}
                </div>
              </div>
              <p>{displayModule.description}</p>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Created By Teacher</strong>
              <dl className="module-info-definition-list">
                <div>
                  <dt>Teacher ID</dt>
                  <dd>{teacher.code || '-'}</dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>{teacher.name || '-'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{teacher.email || '-'}</dd>
                </div>
              </dl>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Game Type Usage</strong>
              {info.gameTypeSummary.length ? (
                <div className="module-info-game-grid">
                  {info.gameTypeSummary.map((summary) => (
                    <div className="module-info-mini-card" key={summary.gameType}>
                      <span>{formatGameType(summary.gameType)}</span>
                      <strong>{summary.sessions} sessions</strong>
                      <p>{summary.rounds} rounds played</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No sessions used this module yet.</p>
              )}
            </section>

            <section className="review-message-block module-info-block">
              <strong>Joined Students</strong>
              <div className="table-panel module-info-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>School</th>
                      <th>Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.joinedStudents.map((student) => (
                      <tr key={student.studentId}>
                        <td>{student.studentCode}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.schoolName}</td>
                        <td>{formatDateTime(student.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {info.joinedStudents.length === 0 && (
                  <EmptyState text="No students joined this module yet." />
                )}
              </div>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Session Usage</strong>
              <div className="table-panel module-info-table">
                <table>
                  <thead>
                    <tr>
                      <th>Session Code</th>
                      <th>Game Type</th>
                      <th>Status</th>
                      <th>Questions</th>
                      <th>Rounds</th>
                      <th>Students</th>
                      <th>Created</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.code}</td>
                        <td>{formatGameType(session.gameType)}</td>
                        <td>{session.status}</td>
                        <td>{session.questionCount}</td>
                        <td>{session.roundCount}</td>
                        <td>{session.participantCount}</td>
                        <td>{formatDateTime(session.createdAt)}</td>
                        <td>{formatDateTime(session.endedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {info.sessions.length === 0 && <EmptyState text="No sessions for this module yet." />}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function ModulesTab({ error, loading, modules, onRefresh, onReviewRequest, onToggleLock }) {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [messageModuleId, setMessageModuleId] = useState(null);
  const [infoModuleId, setInfoModuleId] = useState(null);
  const [moduleInfo, setModuleInfo] = useState(null);
  const [moduleInfoError, setModuleInfoError] = useState('');
  const [loadingModuleInfo, setLoadingModuleInfo] = useState(false);
  const [adminFeedbackByRequest, setAdminFeedbackByRequest] = useState({});
  const selectedModule = modules.find((module) => module.id === selectedModuleId);
  const messageModule = modules.find((module) => module.id === messageModuleId);
  const messageReview = messageModule?.latestReviewRequest;
  const infoModule = modules.find((module) => module.id === infoModuleId);

  useEffect(() => {
    if (selectedModuleId && !modules.some((module) => module.id === selectedModuleId)) {
      setSelectedModuleId(null);
    }
  }, [modules, selectedModuleId]);

  async function handleReviewRequest(reviewRequest, decision, adminFeedback) {
    const success = await onReviewRequest(reviewRequest, decision, adminFeedback);

    if (success) {
      setMessageModuleId(null);
    }
  }

  async function openModuleInfo(module) {
    setInfoModuleId(module.id);
    setModuleInfo(null);
    setModuleInfoError('');
    setLoadingModuleInfo(true);

    try {
      const nextInfo = await fetchAdminModuleInfo(module);
      setModuleInfo(nextInfo);
    } catch (detailError) {
      setModuleInfoError(detailError.message);
    } finally {
      setLoadingModuleInfo(false);
    }
  }

  function closeModuleInfo() {
    setInfoModuleId(null);
    setModuleInfo(null);
    setModuleInfoError('');
  }

  return (
    <section className="admin-dashboard-panel-in admin-glass-section">
      <div className="button-row admin-user-actions">
        <div>
          <h2>Database Modules</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Modules
        </button>
      </div>

      <Feedback text={error} />

      {loading && <section className="panel">Loading modules...</section>}

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>Module ID</th>
              <th>Module</th>
              <th>Teacher</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <td>{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</td>
                <td>
                  <button
                    className="link-button module-title-button"
                    type="button"
                    onClick={() =>
                      setSelectedModuleId((currentId) =>
                        currentId === module.id ? null : module.id,
                      )
                    }
                  >
                    {module.title}
                  </button>
                  <p className="muted table-subtext">{module.description}</p>
                </td>
                <td>
                  <strong>{module.teacherName}</strong>
                  <p className="muted table-subtext">{module.teacherCode}</p>
                </td>
                <td>{module.questionCount}</td>
                <td>
                  {module.isDeleted ? (
                    <span className="lock-badge deleted">Deleted</span>
                  ) : (
                    <span className={module.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                      {module.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  )}
                  {module.latestReviewRequest && (
                    <span className={`review-badge table-review-badge ${module.latestReviewRequest.status}`}>
                      {module.latestReviewRequest.status}
                    </span>
                  )}
                  {module.isDeleted && module.deletedAt && (
                    <p className="muted table-subtext">
                      Deleted {new Date(module.deletedAt).toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td>{module.createdAt ? new Date(module.createdAt).toLocaleDateString() : '-'}</td>
                <td>
                  <div className="table-action-row">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openModuleInfo(module)}
                    >
                      View Info
                    </button>
                    {module.latestReviewRequest && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setMessageModuleId(module.id)}
                      >
                        View Message
                      </button>
                    )}
                    <button
                      className={module.isLocked ? 'secondary-button' : 'primary-button'}
                      disabled={module.isDeleted}
                      type="button"
                      onClick={() => onToggleLock(module)}
                    >
                      {module.isDeleted ? 'Deleted' : module.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && modules.length === 0 && <EmptyState text="No modules created yet." />}
      </div>

      {selectedModule && (
        <section className="panel admin-question-detail">
          <div className="admin-question-detail-header">
            <div>
              <p className="eyebrow">{selectedModule.moduleCode}</p>
              <h2>{selectedModule.title} Questions</h2>
              <p className="muted">
                Teacher: {selectedModule.teacherName} ({selectedModule.teacherCode})
              </p>
            </div>
            {selectedModule.isDeleted ? (
              <span className="lock-badge deleted">Deleted</span>
            ) : (
              <span className={selectedModule.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                {selectedModule.isLocked ? 'Locked' : 'Unlocked'}
              </span>
            )}
          </div>

          {selectedModule.latestReviewRequest && (
            <div className="admin-review-panel admin-review-summary">
              <div>
                <span className={`review-badge ${selectedModule.latestReviewRequest.status}`}>
                  {selectedModule.latestReviewRequest.status}
                </span>
                <p>Teacher review message available.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMessageModuleId(selectedModule.id)}
              >
                View Message
              </button>
            </div>
          )}

          <div className="table-panel admin-question-table">
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
                </tr>
              </thead>
              <tbody>
                {selectedModule.questions.map((question, index) => (
                  <tr key={question.id}>
                    <td>{index + 1}</td>
                    <td>{question.questionCode || `Q${String(question.id).padStart(3, '0')}`}</td>
                    <td>{question.question}</td>
                    <td>{question.optionA}</td>
                    <td>{question.optionB}</td>
                    <td>{question.optionC}</td>
                    <td>{question.optionD}</td>
                    <td>{question.correctOption}</td>
                    <td>{question.explanation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedModule.questions.length === 0 && (
              <EmptyState text="No questions in this module yet." />
            )}
          </div>
        </section>
      )}

      {messageReview && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setMessageModuleId(null)}
        >
          <section
            aria-labelledby="review-message-title"
            aria-modal="true"
            className="review-message-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="review-message-header">
              <div>
                <p className="eyebrow">{messageModule.moduleCode}</p>
                <h2 id="review-message-title">Review Message</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMessageModuleId(null)}
              >
                Close
              </button>
            </div>

            <div className="review-message-meta">
              <span className={`review-badge ${messageReview.status}`}>{messageReview.status}</span>
              <span>{messageModule.title}</span>
              <span>{messageModule.teacherName}</span>
            </div>

            <div className="review-message-block">
              <strong>Teacher Message</strong>
              <p>{messageReview.message}</p>
            </div>

            {messageReview.adminFeedback && (
              <div className="review-message-block">
                <strong>Admin Feedback</strong>
                <p>{messageReview.adminFeedback}</p>
              </div>
            )}

            {messageReview.status === 'pending' && (
              <form className="review-request-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Admin Feedback
                  <textarea
                    value={adminFeedbackByRequest[messageReview.id] || ''}
                    onChange={(event) =>
                      setAdminFeedbackByRequest((currentFeedback) => ({
                        ...currentFeedback,
                        [messageReview.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional feedback for teacher"
                  />
                </label>
                <div className="button-row">
                  <button
                    className="primary-button"
                    disabled={loading}
                    type="button"
                    onClick={() =>
                        handleReviewRequest(
                          messageReview,
                          'approved',
                          adminFeedbackByRequest[messageReview.id] || '',
                      )
                    }
                  >
                    Approve And Unlock
                  </button>
                  <button
                    className="secondary-button"
                    disabled={loading}
                    type="button"
                    onClick={() =>
                        handleReviewRequest(
                          messageReview,
                          'rejected',
                          adminFeedbackByRequest[messageReview.id] || '',
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {infoModule && (
        <ModuleInfoModal
          error={moduleInfoError}
          info={moduleInfo}
          loading={loadingModuleInfo}
          module={infoModule}
          onClose={closeModuleInfo}
        />
      )}
    </section>
  );
}

function SessionsTab({ error, loading, onRefresh, sessions }) {
  return (
    <section className="admin-dashboard-panel-in admin-glass-section">
      <div className="button-row admin-user-actions">
        <div>
          <h2>All Sessions</h2>
          <p className="muted admin-refresh-note">Sessions created by every teacher in the database.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Sessions
        </button>
      </div>

      <Feedback text={error} />
      {loading && <section className="panel">Loading sessions...</section>}

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>Session Code</th>
              <th>Module</th>
              <th>Teacher</th>
              <th>Game Type</th>
              <th>Status</th>
              <th>Questions</th>
              <th>Students</th>
              <th>Rounds</th>
              <th>Created</th>
              <th>Ended</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <strong>{session.code}</strong>
                </td>
                <td>
                  {session.moduleTitle}
                  <p className="muted table-subtext">{session.moduleCode}</p>
                </td>
                <td>
                  {session.teacherName}
                  <p className="muted table-subtext">{session.teacherCode}</p>
                </td>
                <td>{formatGameType(session.gameType)}</td>
                <td>
                  <span className={`review-badge ${session.status}`}>{session.status}</span>
                </td>
                <td>{session.questionCount}</td>
                <td>{session.participantCount}</td>
                <td>{session.roundCount}</td>
                <td>{formatDateTime(session.createdAt)}</td>
                <td>{formatDateTime(session.endedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sessions.length === 0 && <EmptyState text="No sessions created yet." />}
      </div>
    </section>
  );
}

function SettingsTab({ currentUser }) {
  return (
    <section className="admin-settings-layout admin-dashboard-panel-in">
      <div className="admin-settings-hero">
        <div className="admin-settings-avatar" aria-hidden="true">
          {getInitial(currentUser?.name)}
        </div>
        <div>
          <p className="eyebrow">Admin Settings</p>
          <h2>{currentUser?.name || 'System Admin'}</h2>
          <p>Manage your O bitz admin profile and review your access level.</p>
        </div>
        <span className="admin-settings-role-pill">Administrator</span>
      </div>

      <div className="admin-settings-grid">
        <section className="admin-profile-panel">
          <h3>Profile Details</h3>
          <dl className="profile-list">
            <div>
              <dt>Name</dt>
              <dd>{currentUser?.name || '-'}</dd>
            </div>
            <div>
              <dt>Admin ID</dt>
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
        </section>

        <section className="admin-profile-panel admin-access-panel">
          <h3>Access Summary</h3>
          <div className="admin-access-list">
            <div>
              <span>User Control</span>
              <strong>Enabled</strong>
            </div>
            <div>
              <span>Module Review</span>
              <strong>Enabled</strong>
            </div>
            <div>
              <span>Session Monitor</span>
              <strong>Enabled</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

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
  const [usersError, setUsersError] = useState('');
  const [modulesError, setModulesError] = useState('');
  const [sessionsError, setSessionsError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
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

  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Delete ${user.name}? This permanently removes the ${user.role} login account and profile.`,
    );

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
    const confirmed = window.confirm(
      `${nextLocked ? 'Lock' : 'Unlock'} ${module.moduleCode || module.title}?`,
    );

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
    const confirmed = window.confirm(
      `${decision === 'approved' ? 'Approve and unlock' : 'Reject'} this module review request?`,
    );

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

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
      loadModules();
      loadSessions();
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
          <span className="admin-tab-indicator" style={getIndicatorStyle(activeTab)} />
        </nav>

        <div className="admin-avatar-area">
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
          <UsersTab
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
          <ModulesTab
            error={modulesError}
            loading={loadingModules}
            modules={databaseModules}
            onRefresh={loadModules}
            onReviewRequest={reviewModuleRequest}
            onToggleLock={toggleModuleLock}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab
            error={sessionsError}
            loading={loadingSessions}
            onRefresh={loadSessions}
            sessions={databaseSessions}
          />
        )}
        {activeTab === 'settings' && <SettingsTab currentUser={currentUser} />}
      </section>
    </main>
  );
}
