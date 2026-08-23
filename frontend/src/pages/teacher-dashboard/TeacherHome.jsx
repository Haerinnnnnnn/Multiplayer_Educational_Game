import { Stat } from '../../components/Common.jsx';
import { getSessionModule } from './teacherDashboardHelpers.js';
import { GameSession } from '../../domain/sessions/GameSession.js';

export function TeacherHome({
  currentUser,
  modules,
  onCreateSession,
  onModules,
  onOpenActiveSession,
  sessions,
  stats,
}) {
  const activeSessions = sessions.filter((session) => GameSession.from(session).isOngoing());

  return (
    <>
      <section className="teacher-hero-panel teacher-dashboard-panel-in">
        <div>
          <p className="eyebrow">Teacher Home</p>
          <h1>Welcome back, {currentUser?.name || 'Teacher'}</h1>
          <p>
            Teacher ID: <strong>{currentUser?.userCode || '-'}</strong>
          </p>
        </div>
        <button className="primary-button large-button" type="button" onClick={onCreateSession}>
          Create Session
        </button>
      </section>

      <div className="stats-grid teacher-dashboard-panel-in">
        <Stat label="Modules" value={stats.modules} />
        <Stat label="Questions" value={stats.questions} />
        <Stat label="Active Sessions" value={stats.active} />
        <Stat label="Past Sessions" value={stats.past} />
      </div>

      <section className="teacher-profile-panel teacher-dashboard-panel-in">
        <h2>Next Step</h2>
        <p className="muted">
          Create a module first, then manage the questions inside that module.
        </p>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={onModules}>
            Create Module
          </button>
          <button className="secondary-button" type="button" onClick={onCreateSession}>
            Create Session
          </button>
        </div>
      </section>

      {activeSessions.length > 0 && (
        <section className="teacher-profile-panel teacher-dashboard-panel-in active-session-panel">
          <div className="active-session-heading">
            <div>
              <h2>Active Session</h2>
              <p className="muted">You have a session still in progress.</p>
            </div>
            <span className="visibility-badge public">{activeSessions.length}</span>
          </div>

          <div className="active-session-list">
            {activeSessions.map((session) => {
              const module = getSessionModule(modules, session);

              return (
                <article className="active-session-card" key={session.id}>
                  <div>
                    <p className="eyebrow">
                      {GameSession.from(session).isLobby() ? 'Waiting Lobby' : 'Live Game'}
                    </p>
                    <h3>{session.code}</h3>
                    <p>{module?.title || '-'}</p>
                    <p className="muted">
                      {session.participants?.length || 0} students joined
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onOpenActiveSession(session.id)}
                  >
                    Return To Session
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
