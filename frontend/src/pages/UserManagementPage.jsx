import React from 'react';
import { Feedback } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

export function UserManagementPage({
  feedback,
  onAddUser,
  onBack,
  onDeleteUser,
  onLogout,
  onUserFormChange,
  userForm,
  users,
}) {
  return (
    <AppFrame title="User Management" onHome={onBack} onLogout={onLogout}>
      <form className="panel form-grid" onSubmit={onAddUser}>
        <h2>Add User</h2>
        <label>
          Name
          <input
            value={userForm.name}
            onChange={(event) => onUserFormChange({ ...userForm, name: event.target.value })}
            placeholder="Enter name"
          />
        </label>
        <label>
          Email
          <input
            value={userForm.email}
            onChange={(event) => onUserFormChange({ ...userForm, email: event.target.value })}
            placeholder="Enter email"
          />
        </label>
        <label>
          Role
          <select
            value={userForm.role}
            onChange={(event) => onUserFormChange({ ...userForm, role: event.target.value })}
          >
            <option>Teacher</option>
            <option>Student</option>
            <option>Admin</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          Add User
        </button>
      </form>
      <Feedback text={feedback} />
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button className="link-button" type="button" onClick={() => onDeleteUser(user.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppFrame>
  );
}
