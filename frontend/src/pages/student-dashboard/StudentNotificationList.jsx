import React from 'react';

export function StudentNotificationList({ compact = false, notifications, onDismiss, onJoin }) {
  if (!notifications.length) {
    return <div className={compact ? 'student-notification-empty compact' : 'student-notification-empty'}>No live session notifications now.</div>;
  }
  return (
    <div className={compact ? 'student-notification-list compact' : 'student-notification-list'}>
      {notifications.map((notification) => (
        <article className="student-notification-card" key={notification.id}>
          <div>
            <p className="eyebrow">{notification.moduleCode} · {notification.gameTypeLabel}</p>
            <h3>{notification.moduleTitle}</h3>
            <p>Topic: {notification.topicTitle || 'Unassigned'}</p>
            <small>Session {notification.sessionCode}</small>
          </div>
          <div className="student-notification-actions">
            <button className="primary-button" type="button" onClick={() => onJoin(notification)}>Join</button>
            <button className="secondary-button" type="button" onClick={() => onDismiss(notification.id)}>Dismiss</button>
          </div>
        </article>
      ))}
    </div>
  );
}
