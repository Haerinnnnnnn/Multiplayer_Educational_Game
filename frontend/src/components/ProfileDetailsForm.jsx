import React, { useEffect, useState } from 'react';
import { Feedback } from './Common.jsx';

export function ProfileDetailsForm({ user, onUpdateProfile }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    schoolName: user?.schoolName || '',
  });
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      schoolName: user?.schoolName || '',
    });
  }, [user?.name, user?.schoolName]);

  async function submitProfile(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.schoolName.trim()) {
      setFeedback('Please enter name and school.');
      return;
    }

    setSaving(true);
    setFeedback('');

    try {
      await onUpdateProfile?.({
        name: form.name,
        schoolName: form.schoolName,
      });
      setFeedback('Profile updated successfully.');
    } catch (error) {
      setFeedback(error.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-details-form form-grid" onSubmit={submitProfile}>
      <h3>Edit Profile</h3>
      <label>
        Name
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Enter your name"
        />
      </label>
      <label>
        School
        <input
          value={form.schoolName}
          onChange={(event) => setForm({ ...form, schoolName: event.target.value })}
          placeholder="Enter your school"
        />
      </label>
      <button className="primary-button" disabled={saving} type="submit">
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
      <Feedback text={feedback} />
    </form>
  );
}
