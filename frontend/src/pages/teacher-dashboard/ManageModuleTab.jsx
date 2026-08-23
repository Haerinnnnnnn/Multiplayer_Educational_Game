import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState, Feedback } from '../../components/Common.jsx';
import {
  createModuleChapter,
  deleteModuleChapter,
  updateModuleChapter,
} from '../../services/chapterService.js';
import { getReviewStatusLabel } from './teacherDashboardHelpers.js';

export function ManageModuleTab({
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
