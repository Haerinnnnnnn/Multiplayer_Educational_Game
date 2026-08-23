import React from 'react';
import { getLevelProgress } from '../../services/experienceService.js';

export function StudentLevelCard({ student }) {
  const progress = getLevelProgress(student?.totalExp || 0);
  return (
    <section className="student-level-card">
      <div className="student-level-card-header">
        <div><p className="eyebrow">Student Level</p><h2>Level {student?.level || progress.level}</h2></div>
        <span className="level-badge">LV {student?.level || progress.level}</span>
      </div>
      <div className="level-progress-track" aria-label={`Level progress ${progress.percent}%`}>
        <div className="level-progress-fill" style={{ '--level-progress': `${progress.percent}%` }} />
      </div>
      <div className="student-level-meta">
        <span>{progress.totalExp} EXP</span>
        {progress.nextThreshold ? <span>{progress.remainingExp} EXP to Level {progress.level + 1}</span> : <span>Max tracked level reached</span>}
      </div>
    </section>
  );
}
