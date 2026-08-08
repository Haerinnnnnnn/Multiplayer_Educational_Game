import React from 'react';
import { Feedback } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

export function ModuleManagementPage({
  feedback,
  moduleForm,
  modules,
  onAddModule,
  onBack,
  onDeleteModule,
  onLogout,
  onModuleFormChange,
}) {
  return (
    <AppFrame title="Module Management" onHome={onBack} onLogout={onLogout}>
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
        <button className="primary-button" type="submit">
          Add Module
        </button>
      </form>
      <Feedback text={feedback} />
      <div className="list-grid">
        {modules.map((module) => (
          <section className="panel" key={module.id}>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <p className="muted">{module.questions.length} questions</p>
            <button className="secondary-button" type="button" onClick={() => onDeleteModule(module.id)}>
              Delete
            </button>
          </section>
        ))}
      </div>
    </AppFrame>
  );
}
