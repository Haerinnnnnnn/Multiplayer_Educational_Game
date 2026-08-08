import React from 'react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { AnimatedGradient } from '../components/ui/AnimatedGradient.jsx';

export function StartPage({ onStart }) {
  return (
    <main className="start-landing">
      <div className="start-background" aria-hidden="true">
        <AnimatedGradient
          className="start-gradient-layer"
          config={{
            preset: 'custom',
            color1: '#020617',
            color2: '#11104a',
            color3: '#4c1d95',
            distortion: 24,
            proportion: 58,
            rotation: -32,
            scale: 0.56,
            shape: 'Edge',
            shapeSize: 48,
            speed: 10,
            swirl: 68,
          }}
          noise={{ opacity: 0.28, scale: 0.8 }}
        />
        <div className="start-pattern-layer" />
      </div>

      <BrandLogo className="start-brand-logo start-corner-brand" subtitle="Multiplayer Gamified Learning" />

      <section className="start-hero">
        <div className="start-hero-copy">
          <h1>Play, scan, answer, and learn with O bitz.</h1>
          <p className="start-lead">
            A multiplayer classroom game where teachers host live sessions and students learn
            through Classic MCQ challenges or QR Pair Match teamwork.
          </p>

          <div className="start-mode-row" aria-label="Available game modes">
            <span>Classic MCQ</span>
            <span>QR Pair Match</span>
            <span>Live Results</span>
          </div>

          <button className="start-primary-button" type="button" onClick={onStart}>
            Start
          </button>
        </div>
      </section>

      <section className="start-showcase" aria-label="O bitz game preview">
        <div className="start-game-preview" aria-label="Game preview">
          <div className="preview-topbar">
            <span>Live session</span>
            <strong>QRMATCH</strong>
          </div>

          <div className="preview-question">
            <p>Which answer matches the question?</p>
            <div className="preview-answer-grid">
              <span className="answer-tile blue">A</span>
              <span className="answer-tile yellow">B</span>
              <span className="answer-tile red">C</span>
              <span className="answer-tile green">D</span>
            </div>
          </div>

          <div className="preview-bottom">
            <div className="preview-qr">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-rank">
              <p>Ranking</p>
              <div className="rank-bar rank-one">
                <span>1</span>
                <strong>34 pts</strong>
              </div>
              <div className="rank-bar rank-two">
                <span>2</span>
                <strong>29 pts</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="start-explain-strip" aria-label="Game flow explanation">
        <article>
          <span>1</span>
          <h2>Teacher creates a session</h2>
          <p>Choose a module, select questions, set timer rules, and generate a room code.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Students join live</h2>
          <p>Students enter the code or scan the QR, then wait together in the lobby.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Results update instantly</h2>
          <p>Scores, ranking, answer timing, and explanations are saved for review.</p>
        </article>
      </section>

      <section className="start-info-section start-game-modes" aria-label="Game mode details">
        <div className="start-section-heading">
          <p className="start-section-kicker">Game Modes</p>
          <h2>Two ways to turn questions into live classroom play.</h2>
        </div>

        <div className="start-mode-detail-grid">
          <article className="start-mode-detail-card">
            <div className="mode-card-number">01</div>
            <h3>Classic MCQ</h3>
            <p>
              Students answer selected multiple-choice questions on their own device. Faster
              correct answers earn more points, and every question ends with the explanation.
            </p>
            <ul>
              <li>Optional countdown timer</li>
              <li>Speed-based scoring</li>
              <li>Live leaderboard updates</li>
            </ul>
          </article>

          <article className="start-mode-detail-card featured">
            <div className="mode-card-number">02</div>
            <h3>QR Pair Match</h3>
            <p>
              Students work around the room as question holders and answer holders. The question
              holder scans the correct answer QR to complete the round.
            </p>
            <ul>
              <li>Supports even and odd student counts</li>
              <li>Wrong scan penalty timer</li>
              <li>Teamwork and movement-based gameplay</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="start-info-section start-role-section" aria-label="Role features">
        <div className="start-section-heading">
          <p className="start-section-kicker">Built For Class Flow</p>
          <h2>Teacher, student, and admin tools stay connected.</h2>
        </div>

        <div className="start-role-grid">
          <article>
            <strong>Teachers</strong>
            <p>Create modules, import MCQ questions from Excel, control live lobbies, and review session analytics.</p>
          </article>
          <article>
            <strong>Students</strong>
            <p>Join modules, enter live sessions, scan QR answers, gain EXP, and track their activity history.</p>
          </article>
          <article>
            <strong>Admins</strong>
            <p>Monitor users, lock modules, view sessions from all teachers, and check module review requests.</p>
          </article>
          <article>
            <strong>Results</strong>
            <p>Leaderboard, score, correct rate, answer timing, and question explanations are saved for evidence.</p>
          </article>
        </div>
      </section>

      <section className="start-info-section start-analytics-preview" aria-label="Results preview">
        <div>
          <p className="start-section-kicker">After The Game</p>
          <h2>Every session becomes useful feedback.</h2>
          <p>
            O bitz stores the session result so teachers can review who joined, how many questions
            were answered, correct percentage, fastest time, slowest time, and full question
            explanations.
          </p>
        </div>

        <div className="analytics-preview-card">
          <div className="analytics-preview-row">
            <span>Correct Avg</span>
            <strong>82%</strong>
          </div>
          <div className="analytics-preview-bar">
            <span style={{ width: '82%' }} />
          </div>
          <div className="analytics-preview-metrics">
            <div>
              <small>Fastest</small>
              <strong>4s</strong>
            </div>
            <div>
              <small>Students</small>
              <strong>24</strong>
            </div>
            <div>
              <small>Questions</small>
              <strong>12</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
