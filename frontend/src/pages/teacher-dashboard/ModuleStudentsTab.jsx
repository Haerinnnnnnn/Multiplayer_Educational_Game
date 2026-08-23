import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState, Feedback } from '../../components/Common.jsx';
import {
  addStudentToModule,
  fetchModuleInviteCandidates,
  fetchModuleStudentAccess,
  inviteStudentToModule,
  removeStudentFromModule,
  reviewModuleJoinRequest,
} from '../../services/moduleAccessService.js';

export function ModuleStudentsTab({ currentUser, module, onBack }) {
  const [studentRows, setStudentRows] = useState([]);
  const [inviteText, setInviteText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidatePanelOpen, setCandidatePanelOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [kickConfirmMember, setKickConfirmMember] = useState(null);
  const [kickingStudentId, setKickingStudentId] = useState(null);

  const joinedStudents = studentRows.filter((row) => row.accessType === 'member');
  const pendingRequests = studentRows.filter(
    (row) => row.accessType === 'request' && row.status === 'pending',
  );
  const reviewedRequests = studentRows.filter(
    (row) => row.accessType === 'request' && row.status !== 'pending',
  );

  async function loadStudents({ quiet = false } = {}) {
    if (!module?.id) {
      return;
    }

    if (!quiet) {
      setLoading(true);
      setFeedback('');
    }

    try {
      const data = await fetchModuleStudentAccess(module.id);
      setStudentRows(data);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }

  async function loadCandidates(searchText = candidateSearch, { quiet = false } = {}) {
    if (!module?.id) {
      return;
    }

    if (!quiet) {
      setLoadingCandidates(true);
      setFeedback('');
    }

    try {
      const data = await fetchModuleInviteCandidates(module.id, searchText);
      setCandidates(data);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      if (!quiet) {
        setLoadingCandidates(false);
      }
    }
  }

  useEffect(() => {
    loadStudents();
  }, [module?.id]);

  useEffect(() => {
    if (!module?.id) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadStudents({ quiet: true });
      if (candidatePanelOpen) {
        loadCandidates(candidateSearch, { quiet: true });
      }
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [candidatePanelOpen, candidateSearch, module?.id]);

  useEffect(() => {
    if (!candidatePanelOpen) {
      return;
    }

    loadCandidates('');
  }, [candidatePanelOpen, module?.id]);

  async function submitInvite(event) {
    event.preventDefault();

    if (!inviteText.trim()) {
      setFeedback('Please enter a student ID or email.');
      return;
    }

    setBusy(true);
    setFeedback('');

    try {
      await inviteStudentToModule({
        moduleId: module.id,
        searchText: inviteText,
        teacherId: currentUser?.id,
      });
      setInviteText('');
      setFeedback('Student added to this module.');
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function addCandidate(candidate) {
    setBusy(true);
    setFeedback('');

    try {
      await addStudentToModule({
        moduleId: module.id,
        studentId: candidate.studentId,
        teacherId: currentUser?.id,
      });
      setFeedback(`${candidate.studentCode} added to this module.`);
      await loadStudents();
      await loadCandidates();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(requestId, status) {
    setBusy(true);
    setFeedback('');

    try {
      await reviewModuleJoinRequest({ requestId, status });
      setFeedback(status === 'approved' ? 'Student request approved.' : 'Student request rejected.');
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function kickStudent(member) {
    setKickingStudentId(member.studentId);
    setBusy(true);
    setFeedback('');

    try {
      await removeStudentFromModule({
        moduleId: module.id,
        studentId: member.studentId,
      });
      setFeedback(`${member.studentCode || member.name} removed from this module.`);
      await loadStudents();
      if (candidatePanelOpen) {
        await loadCandidates();
      }
      setKickConfirmMember(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setKickingStudentId(null);
      setBusy(false);
    }
  }

  if (!module) {
    return <EmptyState text="Select a module first." />;
  }

  return (
    <section className="teacher-dashboard-panel-in module-students-view">
      <section className="panel module-students-header">
        <div>
          <p className="eyebrow">Manage Students</p>
          <h2>{module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}</h2>
          <p className="muted">
            {module.visibility === 'public'
              ? 'Public module: students can join directly, and teacher can still add students.'
              : 'Private module: students must request access or be added by the teacher.'}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back To Modules
        </button>
      </section>

      <form className="panel form-grid" onSubmit={submitInvite}>
        <h2>Invite Student</h2>
        <label>
          Student ID or Email
          <input
            value={inviteText}
            onChange={(event) => setInviteText(event.target.value)}
            placeholder="Example: S001 or student@gmail.com"
          />
        </label>
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? 'Adding...' : 'Add Student To Module'}
        </button>
      </form>

      <section className="panel invite-browser-panel">
        <div className="invite-browser-header">
          <div>
            <h2>Registered Students</h2>
            <p className="muted">Open this list to find students already registered in the system.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setCandidatePanelOpen((open) => !open)}
          >
            {candidatePanelOpen ? 'Hide Students' : 'Show Students'}
          </button>
        </div>

        {candidatePanelOpen && (
          <div className="invite-browser-body">
            <form
              className="invite-search-row"
              onSubmit={(event) => {
                event.preventDefault();
                loadCandidates(candidateSearch);
              }}
            >
              <input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder="Search name, S001, email, or school"
              />
              <button className="secondary-button" type="submit">
                Search
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setCandidateSearch('');
                  loadCandidates('');
                }}
              >
                Clear
              </button>
            </form>

            {loadingCandidates && <p className="muted">Loading registered students...</p>}

            <div className="table-panel nested-table-panel invite-candidate-table">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.studentId}>
                      <td>{candidate.studentCode}</td>
                      <td>{candidate.name}</td>
                      <td>{candidate.email}</td>
                      <td>{candidate.schoolName}</td>
                      <td>{candidate.course || '-'}</td>
                      <td>
                        {candidate.isMember ? (
                          <span className="visibility-badge public">Joined</span>
                        ) : candidate.requestStatus ? (
                          <span className={`review-badge ${candidate.requestStatus}`}>
                            {candidate.requestStatus}
                          </span>
                        ) : (
                          <span className="visibility-badge private">Available</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="link-button"
                          disabled={busy || candidate.isMember}
                          type="button"
                          onClick={() => addCandidate(candidate)}
                        >
                          {candidate.isMember ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingCandidates && !candidates.length && (
                <EmptyState text="No registered students found." />
              )}
            </div>
          </div>
        )}
      </section>

      <Feedback text={feedback} />

      {loading && <section className="panel">Loading students...</section>}

      <section className="panel">
        <div className="module-section-heading">
          <div>
            <h2>Pending Requests</h2>
            <p className="muted">Auto refreshes every 5 seconds while this page is open.</p>
          </div>
          <button className="secondary-button" disabled={loading} type="button" onClick={loadStudents}>
            {loading ? 'Refreshing...' : 'Refresh Requests'}
          </button>
        </div>
        <div className="table-panel nested-table-panel">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.studentCode}</td>
                  <td>{request.name}</td>
                  <td>{request.email}</td>
                  <td>{request.requestMessage || '-'}</td>
                  <td>
                    <div className="table-action-row">
                      <button
                        className="link-button"
                        disabled={busy}
                        type="button"
                        onClick={() => reviewRequest(request.requestId, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="link-button danger-link"
                        disabled={busy}
                        type="button"
                        onClick={() => reviewRequest(request.requestId, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pendingRequests.length && <EmptyState text="No pending requests." />}
        </div>
      </section>

      <section className="panel">
        <h2>Joined Students</h2>
        <div className="table-panel nested-table-panel">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>School</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {joinedStudents.map((member) => (
                <tr key={member.studentId}>
                  <td>{member.studentCode}</td>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.schoolName}</td>
                  <td>
                    <span className="visibility-badge public">Joined</span>
                  </td>
                  <td>
                    <button
                      className="link-button danger-link"
                      disabled={busy}
                      type="button"
                      onClick={() => setKickConfirmMember(member)}
                    >
                      Kick
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!joinedStudents.length && <EmptyState text="No students joined yet." />}
        </div>
      </section>

      {reviewedRequests.length > 0 && (
        <section className="panel">
          <h2>Reviewed Requests</h2>
          <div className="table-panel nested-table-panel">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewedRequests.map((request) => (
                  <tr key={request.requestId}>
                    <td>{request.studentCode}</td>
                    <td>{request.name}</td>
                    <td>
                      <span className={`review-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {kickConfirmMember &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop module-kick-backdrop"
            role="presentation"
            onClick={() => {
              if (!kickingStudentId) {
                setKickConfirmMember(null);
              }
            }}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal module-kick-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Remove Student</p>
              <h2>Kick {kickConfirmMember.studentCode || kickConfirmMember.name} from this module?</h2>
              <p>
                This student will lose access to {module.moduleCode || module.title}. They can request to join
                again later if the module is private.
              </p>
              <div className="module-kick-student-summary">
                <strong>{kickConfirmMember.name}</strong>
                <span>{kickConfirmMember.email}</span>
              </div>
              <div className="button-row">
                <button
                  className="secondary-button danger-button"
                  disabled={Boolean(kickingStudentId)}
                  type="button"
                  onClick={() => kickStudent(kickConfirmMember)}
                >
                  {kickingStudentId ? 'Removing...' : 'Yes, Kick Student'}
                </button>
                <button
                  className="secondary-button"
                  disabled={Boolean(kickingStudentId)}
                  type="button"
                  onClick={() => setKickConfirmMember(null)}
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
