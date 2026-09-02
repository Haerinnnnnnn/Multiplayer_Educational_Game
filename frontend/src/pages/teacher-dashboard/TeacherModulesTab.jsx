import { EmptyState, Feedback } from '../../components/Common.jsx';

export function TeacherModulesTab({
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
