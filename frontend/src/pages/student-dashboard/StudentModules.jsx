import React, { useState } from 'react';
import { Feedback } from '../../components/Common.jsx';

function ModuleAccessBadge({ module }) {
  if (module.memberStatus === 'joined') return <span className="visibility-badge public">Joined</span>;
  if (module.requestStatus === 'pending') return <span className="review-badge pending">Pending</span>;
  if (module.requestStatus === 'rejected') return <span className="review-badge rejected">Rejected</span>;
  return <span className={`visibility-badge ${module.visibility === 'public' ? 'public' : 'private'}`}>{module.visibility === 'public' ? 'Public' : 'Private'}</span>;
}

export function StudentModules({ modules, onJoinPublic, onRequestPrivate, loading, error }) {
  const [requestMessages, setRequestMessages] = useState({});
  if (loading) return <section className="panel student-dashboard-panel-in">Loading modules...</section>;
  if (error) return <Feedback text={error} />;

  return (
    <section className="student-module-list student-dashboard-panel-in">
      {modules.map((module) => {
        const isJoined = module.memberStatus === 'joined';
        const isPending = module.requestStatus === 'pending';
        const isPrivate = module.visibility !== 'public';
        return (
          <article className={module.isLocked ? 'student-module-card locked-module-card' : 'student-module-card'} key={module.id}>
            <div className="student-module-card-header">
              <div><p className="eyebrow">{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</p><h2 className={module.isLocked ? 'locked-module-title' : ''}>{module.title}</h2></div>
              <ModuleAccessBadge module={module} />
            </div>
            <p>{module.description}</p>
            {module.isLocked && <p className="module-lock-message">This module is locked by admin and cannot be used in sessions now.</p>}
            {module.requestStatus === 'rejected' && module.teacherResponse && <p className="lock-warning">Teacher response: {module.teacherResponse}</p>}
            {!isJoined && !module.isLocked && isPrivate && (
              <label className="student-request-message">Request Message
                <textarea value={requestMessages[module.id] || ''} onChange={(event) => setRequestMessages((current) => ({ ...current, [module.id]: event.target.value }))} placeholder="Optional message to teacher" />
              </label>
            )}
            <div className="button-row">
              {isJoined && <button className="secondary-button" disabled type="button">Already Joined</button>}
              {!isJoined && !module.isLocked && module.visibility === 'public' && <button className="primary-button" type="button" onClick={() => onJoinPublic(module.id)}>Join Module</button>}
              {!isJoined && !module.isLocked && isPrivate && <button className="primary-button" disabled={isPending} type="button" onClick={() => onRequestPrivate(module.id, requestMessages[module.id] || '')}>{isPending ? 'Request Sent' : 'Request Join'}</button>}
            </div>
          </article>
        );
      })}
      {!modules.length && <section className="panel empty-state">No modules available yet.</section>}
    </section>
  );
}
