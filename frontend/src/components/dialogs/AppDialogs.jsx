export function DashboardBackLogoutPrompt({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop import-delete-backdrop dashboard-back-backdrop" role="presentation">
      <section
        className="review-message-modal import-delete-modal dashboard-back-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-back-title"
      >
        <p className="eyebrow">Leave Dashboard</p>
        <h2 id="dashboard-back-title">Logout and return to main page?</h2>
        <p>
          You are currently signed in. Going back from the dashboard will logout your account and return you to the
          Obits main page.
        </p>
        <div className="dashboard-back-actions">
          <button className="secondary-button danger-button" type="button" onClick={onConfirm}>
            Yes, Logout
          </button>
          <button className="primary-button" type="button" onClick={onCancel}>
            Stay Here
          </button>
        </div>
      </section>
    </div>
  );
}

export function ModuleDeleteConfirmDialog({ isBusy, module, onCancel, onConfirm }) {
  if (!module) {
    return null;
  }

  const moduleLabel = `${module.moduleCode || 'Module'} - ${module.title || 'Untitled module'}`;

  return (
    <div
      className="modal-backdrop import-delete-backdrop module-delete-confirm-backdrop"
      role="presentation"
      onClick={isBusy ? undefined : onCancel}
    >
      <section
        aria-labelledby="module-delete-confirm-title"
        aria-modal="true"
        className="review-message-modal import-delete-modal module-delete-confirm-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Delete Module</p>
        <h2 id="module-delete-confirm-title">Move this module to deleted modules?</h2>
        <p>
          {moduleLabel} will be hidden from the teacher module list. Its questions, topics, students, and result
          history will still be kept for admin review.
        </p>
        {isBusy && (
          <div className="import-delete-loading" aria-live="polite">
            <span className="loading-spinner" />
            <strong>Moving module...</strong>
          </div>
        )}
        <div className="dashboard-back-actions">
          <button
            className="secondary-button danger-button"
            disabled={isBusy}
            type="button"
            onClick={onConfirm}
          >
            Yes, Delete
          </button>
          <button className="primary-button" disabled={isBusy} type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

export function QuestionDeleteConfirmDialog({ isBusy, onCancel, onConfirm, target }) {
  if (!target?.question) {
    return null;
  }

  const question = target.question;

  return (
    <div
      className="modal-backdrop import-delete-backdrop question-delete-confirm-backdrop"
      role="presentation"
      onClick={isBusy ? undefined : onCancel}
    >
      <section
        aria-labelledby="question-delete-confirm-title"
        aria-modal="true"
        className="review-message-modal import-delete-modal question-delete-confirm-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Delete Question</p>
        <h2 id="question-delete-confirm-title">Delete {question.questionCode || 'this question'}?</h2>
        <p>
          This question will be removed from the question bank. Existing session history and result records will stay
          available for review.
        </p>
        <div className="question-delete-preview">
          <strong>{question.question || 'No question text'}</strong>
        </div>
        {isBusy && (
          <div className="import-delete-loading" aria-live="polite">
            <span className="loading-spinner" />
            <strong>Deleting question...</strong>
          </div>
        )}
        <div className="dashboard-back-actions">
          <button
            className="secondary-button danger-button"
            disabled={isBusy}
            type="button"
            onClick={onConfirm}
          >
            Yes, Delete
          </button>
          <button className="primary-button" disabled={isBusy} type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
