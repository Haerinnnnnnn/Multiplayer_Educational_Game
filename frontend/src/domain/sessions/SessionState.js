const SESSION_STATUS = Object.freeze({
  ENDED: 'ended',
  LIVE: 'live',
  LOBBY: 'lobby',
  PAUSED: 'paused',
});

const TRANSITIONS = Object.freeze({
  [SESSION_STATUS.LOBBY]: [SESSION_STATUS.LIVE, SESSION_STATUS.ENDED],
  [SESSION_STATUS.LIVE]: [SESSION_STATUS.PAUSED, SESSION_STATUS.ENDED],
  [SESSION_STATUS.PAUSED]: [SESSION_STATUS.LIVE, SESSION_STATUS.ENDED],
  [SESSION_STATUS.ENDED]: [],
});

export class SessionState {
  static ENDED = SESSION_STATUS.ENDED;

  static LIVE = SESSION_STATUS.LIVE;

  static LOBBY = SESSION_STATUS.LOBBY;

  static PAUSED = SESSION_STATUS.PAUSED;

  constructor(value = SESSION_STATUS.LOBBY) {
    this.value = SessionState.normalize(value);
  }

  static from(value) {
    return value instanceof SessionState ? value : new SessionState(value);
  }

  static normalize(value) {
    const normalized = String(value || SESSION_STATUS.LOBBY).toLowerCase();

    // Older session rows used "active" for the same state now called "live".
    if (normalized === 'active') {
      return SESSION_STATUS.LIVE;
    }

    return Object.values(SESSION_STATUS).includes(normalized)
      ? normalized
      : SESSION_STATUS.LOBBY;
  }

  equals(value) {
    return this.value === SessionState.from(value).value;
  }

  isLobby() {
    return this.equals(SESSION_STATUS.LOBBY);
  }

  isLive() {
    return this.equals(SESSION_STATUS.LIVE);
  }

  isPaused() {
    return this.equals(SESSION_STATUS.PAUSED);
  }

  isEnded() {
    return this.equals(SESSION_STATUS.ENDED);
  }

  isPlayable() {
    return this.isLive() || this.isPaused();
  }

  isOngoing() {
    return !this.isEnded();
  }

  canTransitionTo(nextState) {
    const next = SessionState.from(nextState);

    return this.equals(next) || TRANSITIONS[this.value].includes(next.value);
  }

  assertTransitionTo(nextState) {
    const next = SessionState.from(nextState);

    if (!this.canTransitionTo(next)) {
      throw new Error(`Cannot change session status from ${this.value} to ${next.value}.`);
    }

    return next;
  }

  toString() {
    return this.value;
  }
}

export default SessionState;
