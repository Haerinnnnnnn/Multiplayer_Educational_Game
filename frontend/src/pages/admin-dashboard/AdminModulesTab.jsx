import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState, Feedback, Stat } from '../../components/Common.jsx';
import { fetchAdminModuleInfo } from '../../services/adminService.js';
import { formatDateTime, formatGameType } from './adminDashboardHelpers.js';

function ModuleInfoModal({ info, loading, error, module, onClose }) {
  const [selectedInfoTopicId, setSelectedInfoTopicId] = useState('');
  const displayModule = info?.module || module;
  const teacher = info?.teacher || {
    code: displayModule?.teacherCode,
    name: displayModule?.teacherName,
    email: displayModule?.teacherEmail,
  };
  const topics = info?.topics || [];
  const selectedTopic = topics.find((topic) => String(topic.id) === String(selectedInfoTopicId)) || topics[0];

  useEffect(() => {
    if (topics.length) {
      setSelectedInfoTopicId(String(topics[0].id));
    } else {
      setSelectedInfoTopicId('');
    }
  }, [displayModule?.id, topics.length]);

  return createPortal(
    <div className="modal-backdrop admin-module-info-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="module-info-title"
        aria-modal="true"
        className="review-message-modal module-info-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-message-header">
          <div>
            <p className="eyebrow">{displayModule?.moduleCode || 'Module'}</p>
            <h2 id="module-info-title">Module Information</h2>
            <p className="muted">{displayModule?.title}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <section className="panel">Loading module information...</section>}
        <Feedback text={error} />

        {info && (
          <div className="module-info-content">
            <div className="stats-grid module-info-stats">
              <Stat label="Topics" value={info.totals.topics} />
              <Stat label="Questions" value={info.totals.questions} />
              <Stat label="Joined Students" value={info.totals.joinedStudents} />
              <Stat label="Sessions" value={info.totals.sessions} />
              <Stat label="Rounds Played" value={info.totals.rounds} />
            </div>

            <section className="review-message-block module-info-block">
              <div className="module-info-heading-row">
                <div>
                  <strong>Module Status</strong>
                  <p>
                    Visibility: {displayModule.visibility || 'private'} | Created:{' '}
                    {formatDateTime(displayModule.createdAt)}
                  </p>
                </div>
                <div className="module-info-badge-row">
                  {displayModule.isDeleted ? (
                    <span className="lock-badge deleted">Deleted</span>
                  ) : (
                    <span className={displayModule.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                      {displayModule.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  )}
                </div>
              </div>
              <p>{displayModule.description}</p>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Created By Teacher</strong>
              <dl className="module-info-definition-list">
                <div>
                  <dt>Teacher ID</dt>
                  <dd>{teacher.code || '-'}</dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>{teacher.name || '-'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{teacher.email || '-'}</dd>
                </div>
              </dl>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Game Type Usage</strong>
              {info.gameTypeSummary.length ? (
                <div className="module-info-game-grid">
                  {info.gameTypeSummary.map((summary) => (
                    <div className="module-info-mini-card" key={summary.gameType}>
                      <span>{formatGameType(summary.gameType)}</span>
                      <strong>{summary.sessions} sessions</strong>
                      <p>{summary.rounds} rounds played</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No sessions used this module yet.</p>
              )}
            </section>

            <section className="review-message-block module-info-block">
              <div className="module-info-heading-row">
                <div>
                  <strong>Topics And Questions</strong>
                  <p>Choose a topic to view the questions inside this module.</p>
                </div>
                {info.totals.deletedTopics > 0 && (
                  <span className="lock-badge deleted">{info.totals.deletedTopics} deleted topics</span>
                )}
              </div>

              {topics.length > 0 ? (
                <div className="admin-topic-viewer">
                  <div className="admin-topic-list">
                    {topics.map((topic) => (
                      <button
                        className={
                          String(selectedTopic?.id) === String(topic.id)
                            ? 'admin-topic-button active'
                            : 'admin-topic-button'
                        }
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedInfoTopicId(String(topic.id))}
                      >
                        <span>
                          <strong>{topic.chapterCode || 'Topic'}</strong>
                          {topic.isDeleted && <em>Deleted</em>}
                        </span>
                        <b>{topic.title}</b>
                        <small>{topic.questionCount || topic.questions?.length || 0} questions</small>
                      </button>
                    ))}
                  </div>

                  <div className="admin-topic-question-panel">
                    <div className="admin-topic-question-header">
                      <div>
                        <p className="eyebrow">{selectedTopic?.chapterCode || 'Topic'}</p>
                        <h3>{selectedTopic?.title || 'No topic selected'}</h3>
                        <p>{selectedTopic?.description || 'No topic description.'}</p>
                      </div>
                      {selectedTopic?.isDeleted && <span className="lock-badge deleted">Deleted Topic</span>}
                    </div>

                    <div className="table-panel module-info-table admin-topic-question-table">
                      <table>
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>ID</th>
                            <th>Question</th>
                            <th>Answer</th>
                            <th>Explanation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedTopic?.questions || []).map((question, index) => (
                            <tr key={question.id}>
                              <td>{index + 1}</td>
                              <td>{question.questionCode || `Q${String(question.id).padStart(3, '0')}`}</td>
                              <td>{question.question}</td>
                              <td>{question.correctAnswer}</td>
                              <td>{question.explanation || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(selectedTopic?.questions || []).length === 0 && (
                        <EmptyState text="No questions inside this topic yet." />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p>No topics created for this module yet.</p>
              )}
            </section>

            <section className="review-message-block module-info-block">
              <strong>Joined Students</strong>
              <div className="table-panel module-info-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>School</th>
                      <th>Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.joinedStudents.map((student) => (
                      <tr key={student.studentId}>
                        <td>{student.studentCode}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.schoolName}</td>
                        <td>{formatDateTime(student.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {info.joinedStudents.length === 0 && (
                  <EmptyState text="No students joined this module yet." />
                )}
              </div>
            </section>

            <section className="review-message-block module-info-block">
              <strong>Session Usage</strong>
              <div className="table-panel module-info-table">
                <table>
                  <thead>
                    <tr>
                      <th>Session Code</th>
                      <th>Game Type</th>
                      <th>Status</th>
                      <th>Questions</th>
                      <th>Rounds</th>
                      <th>Students</th>
                      <th>Created</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.code}</td>
                        <td>{formatGameType(session.gameType)}</td>
                        <td>{session.status}</td>
                        <td>{session.questionCount}</td>
                        <td>{session.roundCount}</td>
                        <td>{session.participantCount}</td>
                        <td>{formatDateTime(session.createdAt)}</td>
                        <td>{formatDateTime(session.endedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {info.sessions.length === 0 && <EmptyState text="No sessions for this module yet." />}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

export function AdminModulesTab({ error, loading, modules, onRefresh, onReviewRequest, onToggleLock }) {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [messageModuleId, setMessageModuleId] = useState(null);
  const [infoModuleId, setInfoModuleId] = useState(null);
  const [moduleInfo, setModuleInfo] = useState(null);
  const [moduleInfoError, setModuleInfoError] = useState('');
  const [loadingModuleInfo, setLoadingModuleInfo] = useState(false);
  const [adminFeedbackByRequest, setAdminFeedbackByRequest] = useState({});
  const selectedModule = modules.find((module) => module.id === selectedModuleId);
  const messageModule = modules.find((module) => module.id === messageModuleId);
  const messageReview = messageModule?.latestReviewRequest;
  const infoModule = modules.find((module) => module.id === infoModuleId);

  useEffect(() => {
    if (selectedModuleId && !modules.some((module) => module.id === selectedModuleId)) {
      setSelectedModuleId(null);
    }
  }, [modules, selectedModuleId]);

  async function handleReviewRequest(reviewRequest, decision, adminFeedback) {
    const success = await onReviewRequest(reviewRequest, decision, adminFeedback);

    if (success) {
      setMessageModuleId(null);
    }
  }

  async function openModuleInfo(module) {
    setInfoModuleId(module.id);
    setModuleInfo(null);
    setModuleInfoError('');
    setLoadingModuleInfo(true);

    try {
      const nextInfo = await fetchAdminModuleInfo(module);
      setModuleInfo(nextInfo);
    } catch (detailError) {
      setModuleInfoError(detailError.message);
    } finally {
      setLoadingModuleInfo(false);
    }
  }

  function closeModuleInfo() {
    setInfoModuleId(null);
    setModuleInfo(null);
    setModuleInfoError('');
  }

  return (
    <section className="admin-dashboard-panel-in admin-glass-section">
      <div className="button-row admin-user-actions">
        <div>
          <h2>Database Modules</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          Refresh Modules
        </button>
      </div>

      <Feedback text={error} />

      {loading && <section className="panel">Loading modules...</section>}

      <div className="table-panel admin-section-table">
        <table>
          <thead>
            <tr>
              <th>Module ID</th>
              <th>Module</th>
              <th>Teacher</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <td>{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</td>
                <td>
                  <button
                    className="link-button module-title-button"
                    type="button"
                    onClick={() =>
                      setSelectedModuleId((currentId) =>
                        currentId === module.id ? null : module.id,
                      )
                    }
                  >
                    {module.title}
                  </button>
                  <p className="muted table-subtext">{module.description}</p>
                </td>
                <td>
                  <strong>{module.teacherName}</strong>
                  <p className="muted table-subtext">{module.teacherCode}</p>
                </td>
                <td>{module.questionCount}</td>
                <td>
                  {module.isDeleted ? (
                    <span className="lock-badge deleted">Deleted</span>
                  ) : (
                    <span className={module.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                      {module.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  )}
                  {module.latestReviewRequest && (
                    <span className={`review-badge table-review-badge ${module.latestReviewRequest.status}`}>
                      {module.latestReviewRequest.status}
                    </span>
                  )}
                  {module.isDeleted && module.deletedAt && (
                    <p className="muted table-subtext">
                      Deleted {new Date(module.deletedAt).toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td>{module.createdAt ? new Date(module.createdAt).toLocaleDateString() : '-'}</td>
                <td>
                  <div className="table-action-row">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openModuleInfo(module)}
                    >
                      View Info
                    </button>
                    {module.latestReviewRequest && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setMessageModuleId(module.id)}
                      >
                        View Message
                      </button>
                    )}
                    <button
                      className={module.isLocked ? 'secondary-button' : 'primary-button'}
                      disabled={module.isDeleted}
                      type="button"
                      onClick={() => onToggleLock(module)}
                    >
                      {module.isDeleted ? 'Deleted' : module.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && modules.length === 0 && <EmptyState text="No modules created yet." />}
      </div>

      {selectedModule && (
        <section className="panel admin-question-detail">
          <div className="admin-question-detail-header">
            <div>
              <p className="eyebrow">{selectedModule.moduleCode}</p>
              <h2>{selectedModule.title} Questions</h2>
              <p className="muted">
                Teacher: {selectedModule.teacherName} ({selectedModule.teacherCode})
              </p>
            </div>
            {selectedModule.isDeleted ? (
              <span className="lock-badge deleted">Deleted</span>
            ) : (
              <span className={selectedModule.isLocked ? 'lock-badge locked' : 'lock-badge unlocked'}>
                {selectedModule.isLocked ? 'Locked' : 'Unlocked'}
              </span>
            )}
          </div>

          {selectedModule.latestReviewRequest && (
            <div className="admin-review-panel admin-review-summary">
              <div>
                <span className={`review-badge ${selectedModule.latestReviewRequest.status}`}>
                  {selectedModule.latestReviewRequest.status}
                </span>
                <p>Teacher review message available.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMessageModuleId(selectedModule.id)}
              >
                View Message
              </button>
            </div>
          )}

          <div className="table-panel admin-question-table">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Option A</th>
                  <th>Option B</th>
                  <th>Option C</th>
                  <th>Option D</th>
                  <th>Answer</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {selectedModule.questions.map((question, index) => (
                  <tr key={question.id}>
                    <td>{index + 1}</td>
                    <td>{question.questionCode || `Q${String(question.id).padStart(3, '0')}`}</td>
                    <td>{question.question}</td>
                    <td>{question.optionA}</td>
                    <td>{question.optionB}</td>
                    <td>{question.optionC}</td>
                    <td>{question.optionD}</td>
                    <td>{question.correctOption}</td>
                    <td>{question.explanation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedModule.questions.length === 0 && (
              <EmptyState text="No questions in this module yet." />
            )}
          </div>
        </section>
      )}

      {messageReview && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setMessageModuleId(null)}
        >
          <section
            aria-labelledby="review-message-title"
            aria-modal="true"
            className="review-message-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="review-message-header">
              <div>
                <p className="eyebrow">{messageModule.moduleCode}</p>
                <h2 id="review-message-title">Review Message</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMessageModuleId(null)}
              >
                Close
              </button>
            </div>

            <div className="review-message-meta">
              <span className={`review-badge ${messageReview.status}`}>{messageReview.status}</span>
              <span>{messageModule.title}</span>
              <span>{messageModule.teacherName}</span>
            </div>

            <div className="review-message-block">
              <strong>Teacher Message</strong>
              <p>{messageReview.message}</p>
            </div>

            {messageReview.adminFeedback && (
              <div className="review-message-block">
                <strong>Admin Feedback</strong>
                <p>{messageReview.adminFeedback}</p>
              </div>
            )}

            {messageReview.status === 'pending' && (
              <form className="review-request-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Admin Feedback
                  <textarea
                    value={adminFeedbackByRequest[messageReview.id] || ''}
                    onChange={(event) =>
                      setAdminFeedbackByRequest((currentFeedback) => ({
                        ...currentFeedback,
                        [messageReview.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional feedback for teacher"
                  />
                </label>
                <div className="button-row">
                  <button
                    className="primary-button"
                    disabled={loading}
                    type="button"
                    onClick={() =>
                        handleReviewRequest(
                          messageReview,
                          'approved',
                          adminFeedbackByRequest[messageReview.id] || '',
                      )
                    }
                  >
                    Approve And Unlock
                  </button>
                  <button
                    className="secondary-button"
                    disabled={loading}
                    type="button"
                    onClick={() =>
                        handleReviewRequest(
                          messageReview,
                          'rejected',
                          adminFeedbackByRequest[messageReview.id] || '',
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {infoModule && (
        <ModuleInfoModal
          error={moduleInfoError}
          info={moduleInfo}
          loading={loadingModuleInfo}
          module={infoModule}
          onClose={closeModuleInfo}
        />
      )}
    </section>
  );
}
