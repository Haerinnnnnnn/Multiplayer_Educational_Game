import React, { useEffect, useState } from 'react';
import { ParticipantList, SessionGuard } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';
import { backendUrl } from '../services/apiConfig.js';
import {
  fetchModuleStudentAccess,
  reviewModuleJoinRequest,
} from '../services/moduleAccessService.js';

function getJoinUrl(sessionCode) {
  if (!sessionCode) {
    return '';
  }

  const backendHost = new URL(backendUrl).hostname;
  const localHostnames = ['localhost', '127.0.0.1'];
  const hostname = localHostnames.includes(window.location.hostname)
    ? backendHost
    : window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${window.location.protocol}//${hostname}${port}/?join=${encodeURIComponent(sessionCode)}`;
}

export function LiveLobbyPage({
  activeModule,
  activeSession,
  onBack,
  onCloseSession,
  onKickStudent,
  onRefreshSession,
  onStartGame,
}) {
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessFeedback, setAccessFeedback] = useState('');
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closingRoom, setClosingRoom] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [kickConfirmParticipant, setKickConfirmParticipant] = useState(null);
  const [kickSuccessMessage, setKickSuccessMessage] = useState('');
  const [kickingParticipantId, setKickingParticipantId] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const joinUrl = getJoinUrl(activeSession?.code);
  const qrImageUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinUrl)}`
    : '';
  const participantCount = activeSession?.participants.length || 0;
  const questionCount = activeSession?.questionIds?.length || activeSession?.questionCount || 0;
  const maxQrPairStudents = questionCount * 2;
  const startGameError = participantCount < 1
    ? 'At least 1 student must join before starting the game.'
    : activeSession?.gameType === 'qr_pair_match' && participantCount < 2
    ? 'QR Pair Match requires at least 2 students.'
    : activeSession?.gameType === 'qr_pair_match' && questionCount < 2
      ? 'QR Pair Match requires at least 2 selected questions.'
      : activeSession?.gameType === 'qr_pair_match' && maxQrPairStudents > 0 && participantCount > maxQrPairStudents
        ? `This session supports up to ${maxQrPairStudents} students based on ${questionCount} selected questions.`
      : '';
  const pendingRequests = accessRequests.filter((request) => request.status === 'pending');

  async function loadAccessRequests({ quiet = false } = {}) {
    if (!activeModule?.id || activeModule.visibility !== 'private') {
      setAccessRequests([]);
      return;
    }

    if (!quiet) {
      setLoadingRequests(true);
      setAccessFeedback('');
    }

    try {
      const data = await fetchModuleStudentAccess(activeModule.id);
      setAccessRequests(data.filter((item) => item.accessType === 'request'));
    } catch (error) {
      setAccessFeedback(error.message);
    } finally {
      if (!quiet) {
        setLoadingRequests(false);
      }
    }
  }

  useEffect(() => {
    onRefreshSession?.();
  }, [activeSession?.id]);

  useEffect(() => {
    loadAccessRequests();

    if (!activeModule?.id || activeModule.visibility !== 'private') {
      return undefined;
    }

    const requestTimer = window.setInterval(() => loadAccessRequests({ quiet: true }), 3000);

    return () => window.clearInterval(requestTimer);
  }, [activeModule?.id, activeModule?.visibility]);

  async function reviewAccessRequest(requestId, status) {
    setReviewBusyId(requestId);
    setAccessFeedback('');

    try {
      await reviewModuleJoinRequest({ requestId, status });
      setAccessFeedback(status === 'approved' ? 'Student approved. Waiting for their device to enter lobby.' : 'Request rejected.');
      await loadAccessRequests();
      await onRefreshSession?.();
      window.setTimeout(() => onRefreshSession?.(), 1800);
      window.setTimeout(() => onRefreshSession?.(), 3800);
    } catch (error) {
      setAccessFeedback(error.message);
    } finally {
      setReviewBusyId(null);
    }
  }

  async function confirmCloseRoom() {
    setClosingRoom(true);

    try {
      await onCloseSession?.();
    } finally {
      setClosingRoom(false);
      setCloseConfirmOpen(false);
    }
  }

  async function copySessionCode() {
    const code = activeSession?.code;
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const input = document.createElement('textarea');
      input.value = code;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1400);
  }

  async function confirmKickParticipant() {
    const participant = kickConfirmParticipant;

    if (!participant) {
      return;
    }

    setKickingParticipantId(participant.id);

    try {
      await onKickStudent?.(participant);
      setKickConfirmParticipant(null);
      setKickSuccessMessage(`${participant.name} has been kicked from this session.`);
    } finally {
      setKickingParticipantId(null);
    }
  }

  return (
    <AppFrame title="Live Lobby" onHome={onBack}>
      <SessionGuard session={activeSession}>
        <div className="split-grid">
          <section className="panel">
            <p className="eyebrow">Session Code</p>
            <div className="session-code-row">
              <h2 className="session-code">{activeSession?.code}</h2>
              <button
                aria-label="Copy session code"
                className={`session-copy-button ${copiedCode ? 'copied' : ''}`}
                title={copiedCode ? 'Copied' : 'Copy session code'}
                type="button"
                onClick={copySessionCode}
              >
                <span aria-hidden="true">{copiedCode ? '✓' : '⧉'}</span>
              </button>
            </div>
            {activeModule && (
              <div className="lobby-module-access">
                <span className={`visibility-badge ${activeModule.visibility === 'public' ? 'public' : 'private'}`}>
                  {activeModule.visibility === 'public' ? 'Public Module' : 'Private Module'}
                </span>
                <p className="muted">
                  {activeModule.visibility === 'public'
                    ? 'Students can join this module directly before entering the session.'
                    : 'Students must be approved in Manage Students before entering this session.'}
                </p>
              </div>
            )}
            <div className="lobby-qr-action-row">
              {qrImageUrl && (
                <img className="qr-code-image" src={qrImageUrl} alt={`Join session ${activeSession?.code}`} />
              )}
              <div className="lobby-action-stack">
                <button
                  className="primary-button"
                  disabled={Boolean(startGameError)}
                  type="button"
                  onClick={onStartGame}
                >
                  Start Game
                </button>
                <button className="secondary-button danger-button" type="button" onClick={() => setCloseConfirmOpen(true)}>
                  Close Room
                </button>
              </div>
            </div>
            <p className="muted">Students can scan the QR code or enter this code on the Join Session page.</p>
          </section>
          <section className="panel">
            <div className="module-section-heading">
              <div>
                <h2>Joined Students</h2>
                <p className="muted">{participantCount} student{participantCount === 1 ? '' : 's'} joined</p>
              </div>
            </div>
            {activeSession?.gameType === 'qr_pair_match' && (
              <p className="muted">
                Game Type: QR Pair Match. Students joined: {participantCount} / {maxQrPairStudents || '-'}.
                Odd or even student counts can start from 2 students.
              </p>
            )}
            {startGameError && <p className="lock-warning lobby-start-warning">{startGameError}</p>}
            <div className="lobby-participant-scroll">
              <ParticipantList
                kickingParticipantId={kickingParticipantId}
                session={activeSession}
                onKickParticipant={setKickConfirmParticipant}
              />
            </div>
          </section>
          {activeModule?.visibility === 'private' && (
            <section className="panel teacher-assignment-panel">
              <div className="module-section-heading">
                <div>
                  <h2>Private Module Join Requests</h2>
                  <p className="muted">Students who scan this QR can request access here.</p>
                </div>
              </div>

              {accessFeedback && <p className="feedback">{accessFeedback}</p>}

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
                              disabled={reviewBusyId === request.requestId}
                              type="button"
                              onClick={() => reviewAccessRequest(request.requestId, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="link-button danger-link"
                              disabled={reviewBusyId === request.requestId}
                              type="button"
                              onClick={() => reviewAccessRequest(request.requestId, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!pendingRequests.length && (
                  <p className="muted">No pending join requests for this session module.</p>
                )}
              </div>
            </section>
          )}
        </div>

        {closeConfirmOpen && (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => {
              if (!closingRoom) {
                setCloseConfirmOpen(false);
              }
            }}
          >
            <section
              aria-modal="true"
              className="review-message-modal close-room-modal"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="review-message-header">
                <div>
                  <p className="eyebrow">Close Room</p>
                  <h2>Are you really want to close this room ?</h2>
                </div>
              </div>
              <p className="muted">
                Students in the waiting room will be sent back to their dashboard and this lobby room will be removed.
              </p>
              <div className="button-row">
                <button
                  className="secondary-button"
                  disabled={closingRoom}
                  type="button"
                  onClick={() => setCloseConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="secondary-button danger-button"
                  disabled={closingRoom}
                  type="button"
                  onClick={confirmCloseRoom}
                >
                  {closingRoom ? 'Closing...' : 'Close Room'}
                </button>
              </div>
            </section>
          </div>
        )}

        {kickConfirmParticipant && (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => {
              if (!kickingParticipantId) {
                setKickConfirmParticipant(null);
              }
            }}
          >
            <section
              aria-modal="true"
              className="review-message-modal close-room-modal"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="review-message-header">
                <div>
                  <p className="eyebrow">Kick Student</p>
                  <h2>Kick {kickConfirmParticipant.name} from this session?</h2>
                </div>
              </div>
              <p className="muted">
                This student will be removed from the current lobby and sent back to their dashboard.
              </p>
              <div className="button-row">
                <button
                  className="secondary-button"
                  disabled={Boolean(kickingParticipantId)}
                  type="button"
                  onClick={() => setKickConfirmParticipant(null)}
                >
                  Cancel
                </button>
                <button
                  className="secondary-button danger-button"
                  disabled={Boolean(kickingParticipantId)}
                  type="button"
                  onClick={confirmKickParticipant}
                >
                  {kickingParticipantId ? 'Kicking...' : 'Kick Student'}
                </button>
              </div>
            </section>
          </div>
        )}

        {kickSuccessMessage && (
          <div className="modal-backdrop" role="presentation" onClick={() => setKickSuccessMessage('')}>
            <section
              aria-modal="true"
              className="review-message-modal close-room-modal"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="review-message-header">
                <div>
                  <p className="eyebrow">Student Removed</p>
                  <h2>Kick completed</h2>
                </div>
              </div>
              <p className="muted">{kickSuccessMessage}</p>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={() => setKickSuccessMessage('')}>
                  OK
                </button>
              </div>
            </section>
          </div>
        )}
      </SessionGuard>
    </AppFrame>
  );
}
