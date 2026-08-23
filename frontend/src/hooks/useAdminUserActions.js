import { useState } from 'react';

const initialUserForm = {
  name: '',
  email: '',
  role: 'Teacher',
};

export function useAdminUserActions({ setFeedback, setUsers }) {
  const [userForm, setUserForm] = useState(initialUserForm);

  function addUser(event) {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim()) {
      setFeedback('Please enter name and email.');
      return;
    }

    setUsers((currentUsers) => [
      ...currentUsers,
      {
        id: Date.now(),
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
      },
    ]);
    setUserForm(initialUserForm);
    setFeedback('User added.');
  }

  function deleteUser(userId) {
    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    setFeedback('User deleted.');
  }

  return {
    addUser,
    deleteUser,
    setUserForm,
    userForm,
  };
}
