import React, { useState } from 'react';
import { StudentLevelCard } from './StudentLevelCard.jsx';

export function StudentHome({ joinedModules, student, onJoinSession }) {
  const [showJoinedModules, setShowJoinedModules] = useState(false);
  const joinedModuleCount = joinedModules.length;

  return (
    <section className="student-dashboard-grid student-dashboard-panel-in">
      <div className="student-hero-panel">
        <p className="eyebrow">Student Home</p>
        <h1>Welcome back, {student?.name || 'Student'}</h1>
        <p>Student ID: <strong>{student?.userCode || student?.systemId || '-'}</strong></p>
        <button className="primary-button large-button" type="button" onClick={onJoinSession}>Join Session</button>
        <div className="student-home-modules">
          <div className="student-home-modules-header">
            <strong>My Joined Modules</strong>
            <button
              className="student-home-modules-toggle"
              type="button"
              aria-expanded={showJoinedModules}
              aria-controls="student-home-joined-modules"
              onClick={() => setShowJoinedModules((current) => !current)}
            >
              {showJoinedModules ? 'Hide' : 'Show'}
              <span>{joinedModuleCount}</span>
            </button>
          </div>
          <div
            id="student-home-joined-modules"
            className={`student-home-modules-body ${showJoinedModules ? 'open' : ''}`}
            aria-hidden={!showJoinedModules}
          >
            {joinedModuleCount ? joinedModules.map((module) => (
              <div className="student-home-module-row" key={module.id}>
                <span>{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</span>
                <strong>{module.title}</strong>
              </div>
            )) : <p className="student-home-modules-empty">No joined modules yet.</p>}
          </div>
        </div>
      </div>
      <div className="student-profile-card">
        <StudentLevelCard student={student} />
        <h2>Profile</h2>
        <dl className="profile-list">
          <div><dt>Email</dt><dd>{student?.email || '-'}</dd></div>
          <div><dt>School</dt><dd>{student?.schoolName || '-'}</dd></div>
          <div><dt>Grade</dt><dd>{student?.grade || '-'}</dd></div>
          <div><dt>Course</dt><dd>{student?.course || '-'}</dd></div>
        </dl>
      </div>
    </section>
  );
}
