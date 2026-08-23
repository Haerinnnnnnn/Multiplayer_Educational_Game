import React, { useState } from 'react';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function AdminTeacherRequestsTab({ error, loading, onReview, requests }) {
  const [rejectingTeacherId, setRejectingTeacherId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  async function submitRejection(teacher) {
    const reason = rejectionReason.trim();

    if (!reason) {
      return;
    }

    const completed = await onReview(teacher, 'rejected', reason);

    if (completed) {
      setRejectingTeacherId('');
      setRejectionReason('');
    }
  }

  return (
    <div className="admin-teacher-requests-layout admin-dashboard-panel-in">
      <section className="admin-teacher-requests-hero">
        <div>
          <p className="eyebrow">Verified Teacher Accounts</p>
          <h1>Teacher Requests</h1>
          <p>
            Only teachers who confirmed their registration email appear here. Review each account
            before teacher features are enabled.
          </p>
        </div>
        <span>{requests.length} pending</span>
      </section>

      {error && <p className="admin-request-feedback error">{error}</p>}
      {loading && requests.length === 0 && <p className="admin-request-feedback">Loading requests...</p>}

      {!loading && !error && requests.length === 0 && (
        <section className="admin-teacher-request-empty">
          <p className="eyebrow">All Clear</p>
          <h2>No verified teacher requests are waiting.</h2>
          <p>New requests will appear after a teacher confirms their email address.</p>
        </section>
      )}

      <div className="admin-teacher-request-list">
        {requests.map((teacher) => {
          const isRejecting = rejectingTeacherId === teacher.id;

          return (
            <article className="admin-teacher-request-card" key={teacher.id}>
              <div className="admin-teacher-request-heading">
                <div>
                  <p className="eyebrow">{teacher.userCode || 'Teacher Request'}</p>
                  <h2>{teacher.name}</h2>
                  <p>{teacher.email}</p>
                </div>
                <span>Email Verified</span>
              </div>

              <dl className="admin-teacher-request-details">
                <div>
                  <dt>School</dt>
                  <dd>{teacher.schoolName || '-'}</dd>
                </div>
                <div>
                  <dt>Birthday</dt>
                  <dd>{teacher.birthday || '-'}</dd>
                </div>
                <div>
                  <dt>Registered At</dt>
                  <dd>{formatDateTime(teacher.createdAt)}</dd>
                </div>
              </dl>

              <section className="admin-teacher-request-message">
                <p className="eyebrow">Request Message</p>
                <p>
                  {teacher.approvalMessage ||
                    'No request message was provided. Review the teacher profile details before approving.'}
                </p>
              </section>

              {isRejecting && (
                <div className="admin-teacher-rejection-form">
                  <label htmlFor={`teacher-rejection-${teacher.id}`}>Rejection reason</label>
                  <textarea
                    id={`teacher-rejection-${teacher.id}`}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Explain why this teacher account was not approved."
                  />
                </div>
              )}

              <div className="button-row admin-teacher-request-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={loading}
                  onClick={() => onReview(teacher, 'approved')}
                >
                  Approve
                </button>
                {!isRejecting ? (
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setRejectingTeacherId(teacher.id);
                      setRejectionReason('');
                    }}
                  >
                    Reject
                  </button>
                ) : (
                  <>
                    <button
                      className="secondary-button danger-button"
                      type="button"
                      disabled={loading || !rejectionReason.trim()}
                      onClick={() => submitRejection(teacher)}
                    >
                      Confirm Rejection
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setRejectingTeacherId('');
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
