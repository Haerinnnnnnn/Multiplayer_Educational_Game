import { SessionState } from './SessionState.js';

export class GameSession {
  constructor(session = {}) {
    this.session = session || {};
    this.state = SessionState.from(this.session.status);
  }

  static from(session) {
    return session instanceof GameSession ? session : new GameSession(session);
  }

  get status() {
    return this.state.value;
  }

  isLobby() {
    return this.state.isLobby();
  }

  isLive() {
    return this.state.isLive();
  }

  isPaused() {
    return this.state.isPaused();
  }

  isEnded() {
    return this.state.isEnded();
  }

  isPlayable() {
    return this.state.isPlayable();
  }

  isOngoing() {
    return this.state.isOngoing();
  }

  hasParticipants() {
    return (this.session.participants?.length || 0) > 0;
  }

  canStart() {
    return this.isLobby() && this.hasParticipants();
  }

  start(overrides = {}) {
    return this.transitionTo(SessionState.LIVE, overrides);
  }

  pause(overrides = {}) {
    return this.transitionTo(SessionState.PAUSED, overrides);
  }

  resume(overrides = {}) {
    return this.transitionTo(SessionState.LIVE, overrides);
  }

  end(overrides = {}) {
    return this.transitionTo(SessionState.ENDED, overrides);
  }

  transitionTo(nextState, overrides = {}) {
    const next = this.state.assertTransitionTo(nextState);

    return {
      ...this.session,
      ...overrides,
      status: next.value,
    };
  }

  getTeacherPage() {
    return this.isLobby() ? 'live-lobby' : 'teacher-control';
  }

  getStudentPage() {
    if (this.isEnded()) {
      return 'session-results';
    }

    return this.isPlayable() ? 'student-game' : 'student-waiting';
  }
}

export default GameSession;
