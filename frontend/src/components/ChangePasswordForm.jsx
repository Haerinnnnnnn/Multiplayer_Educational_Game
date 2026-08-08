import React, { useState } from 'react';
import { Feedback } from './Common.jsx';
import { updatePassword } from '../services/authService.js';

export function ChangePasswordForm() {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitPassword(event) {
    event.preventDefault();

    if (form.newPassword.length < 8) {
      setFeedback('Password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setFeedback('Password confirmation does not match.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await updatePassword(form.newPassword);
      setForm({ newPassword: '', confirmPassword: '' });
      setFeedback('Password updated successfully.');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="change-password-form form-grid" onSubmit={submitPassword}>
      <h3>Change Password</h3>
      <label>
        New Password
        <input
          type="password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          placeholder="Enter new password"
        />
      </label>
      <label>
        Confirm Password
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          placeholder="Confirm new password"
        />
      </label>
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? 'Updating...' : 'Update Password'}
      </button>
      <Feedback text={feedback} />
    </form>
  );
}
