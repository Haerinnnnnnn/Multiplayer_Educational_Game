import React, { useState } from 'react';
import { EmptyState, Feedback, Stat } from '../../components/Common.jsx';

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

const APPROVAL_STATUS_OPTIONS = [
  { value: '', label: 'All approval statuses' },
  { value: 'awaiting_email', label: 'Awaiting Email' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getApprovalStatusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'awaiting_email') return 'Awaiting Email';
  if (status === 'pending') return 'Pending Review';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Not Required';
}

function getApprovalStatusClass(status) {
  if (status === 'verified') return 'approved';
  if (status === 'awaiting_email') return 'awaiting-email';
  if (status === 'pending') return 'pending';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'not-required';
}

export function AdminUsersTab({
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
  const [userFilters, setUserFilters] = useState({
    name: '',
    email: '',
    school: '',
    approvalStatus: '',
  });
  const students = users.filter((user) => user.role?.toLowerCase() === 'student');
  const teachers = users.filter((user) => user.role?.toLowerCase() === 'teacher');
  const visibleUsers = activeRole === 'student' ? students : teachers;
  const filteredUsers = visibleUsers.filter((user) => {
    const nameMatch = (user.name || '').toLowerCase().includes(userFilters.name.trim().toLowerCase());
    const emailMatch = (user.email || '').toLowerCase().includes(userFilters.email.trim().toLowerCase());
    const schoolMatch = (user.schoolName || '').toLowerCase().includes(userFilters.school.trim().toLowerCase());
    const approvalMatch =
      activeRole !== 'teacher' ||
      !userFilters.approvalStatus ||
      (user.approvalStatus || 'awaiting_email') === userFilters.approvalStatus;

    return nameMatch && emailMatch && schoolMatch && approvalMatch;
  });
  const onlineUsers = users.filter((user) => user.presenceStatus === 'online');
  const hasUserFilter =
    [userFilters.name, userFilters.email, userFilters.school].some((value) => value.trim()) ||
    (activeRole === 'teacher' && userFilters.approvalStatus);

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

      <section className="panel admin-user-filter-panel">
        <div>
          <p className="eyebrow">User Search</p>
          <h2>Filter {activeRole === 'student' ? 'Students' : 'Teachers'}</h2>
          <p className="muted">
            Showing {filteredUsers.length} of {visibleUsers.length} {activeRole === 'student' ? 'students' : 'teachers'}.
          </p>
        </div>
        <div className="admin-user-filter-grid">
          <label>
            Name
            <input
              value={userFilters.name}
              onChange={(event) => setUserFilters({ ...userFilters, name: event.target.value })}
              placeholder="Search by name"
            />
          </label>
          <label>
            Email
            <input
              value={userFilters.email}
              onChange={(event) => setUserFilters({ ...userFilters, email: event.target.value })}
              placeholder="Search by email"
            />
          </label>
          <label>
            School
            <input
              value={userFilters.school}
              onChange={(event) => setUserFilters({ ...userFilters, school: event.target.value })}
              placeholder="Search by school"
            />
          </label>
          {activeRole === 'teacher' && (
            <label>
              Approval Status
              <select
                value={userFilters.approvalStatus}
                onChange={(event) =>
                  setUserFilters({ ...userFilters, approvalStatus: event.target.value })
                }
              >
                {APPROVAL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="secondary-button"
            disabled={!hasUserFilter}
            type="button"
            onClick={() => setUserFilters({ name: '', email: '', school: '', approvalStatus: '' })}
          >
            Clear Filter
          </button>
        </div>
      </section>

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Approval</th>
              <th>School</th>
              {activeRole === 'student' && <th>Grade</th>}
              {activeRole === 'student' && <th>Course</th>}
              {activeRole === 'student' && <th>Level</th>}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
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
                <td>
                  <span
                    className={`admin-approval-badge ${getApprovalStatusClass(
                      user.role === 'teacher' ? user.approvalStatus : user.emailStatus,
                    )}`}
                  >
                    {user.role === 'teacher'
                      ? getApprovalStatusLabel(user.approvalStatus)
                      : getApprovalStatusLabel(user.emailStatus)}
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
        {!loading && filteredUsers.length === 0 && (
          <EmptyState
            text={
              hasUserFilter
                ? `No ${activeRole === 'student' ? 'students' : 'teachers'} match this filter.`
                : activeRole === 'student'
                  ? 'No students found yet.'
                  : 'No teachers found yet.'
            }
          />
        )}
      </div>
    </section>
  );
}
