import React, { useEffect, useState } from 'react';
import { EmptyState, Feedback, Stat } from '../../components/Common.jsx';
import { ClassicMcqAnalysis } from '../../domain/analytics/ClassicMcqAnalysis.js';
import { QrPairAnalysis } from '../../domain/analytics/QrPairAnalysis.js';
import { fetchModuleStudentAccess } from '../../services/moduleAccessService.js';

const ANALYSIS_STRATEGIES = [new ClassicMcqAnalysis(), new QrPairAnalysis()];
const ANALYZE_GAME_MODES = ANALYSIS_STRATEGIES.map((strategy) => strategy.mode);

function getAnalysisStrategy(gameType) {
  return ANALYSIS_STRATEGIES.find((strategy) => strategy.gameType === gameType)
    || ANALYSIS_STRATEGIES[0];
}

function formatPercent(correct, total) {
  if (!total) {
    return '0%';
  }

  return `${Math.round((correct / total) * 100)}%`;
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) {
    return '-';
  }

  return `${Number(seconds).toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function getTopicKey(topicId) {
  return topicId ? String(topicId) : 'unassigned';
}

function AccuracyBar({ value }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div className="analyze-accuracy-bar" aria-label={`Accuracy ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function TeacherAnalyzeTab({ modules, sessions }) {
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [analyzeGameType, setAnalyzeGameType] = useState('classic_mcq');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topicBreakdownOpen, setTopicBreakdownOpen] = useState(false);
  const [studentPerformanceOpen, setStudentPerformanceOpen] = useState(false);
  const [studentRows, setStudentRows] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const selectedModule = modules.find((module) => String(module.id) === String(selectedModuleId));
  const analysisStrategy = getAnalysisStrategy(analyzeGameType);
  const analysis = selectedModule
    ? analysisStrategy.analyze(selectedModule, sessions, studentRows)
    : null;
  const analyzeMode = analysisStrategy.mode;
  const selectedStudent = analysis?.studentStats.find(
    (student) => String(student.studentId) === String(selectedStudentId),
  );
  const selectedModuleDescription = selectedModule?.description || 'No description yet.';

  useEffect(() => {
    if (!selectedModule?.id) {
      setStudentRows([]);
      return undefined;
    }

    let isMounted = true;

    async function loadStudents() {
      setLoadingStudents(true);
      setError('');

      try {
        const rows = await fetchModuleStudentAccess(selectedModule.id);

        if (isMounted) {
          setStudentRows(rows);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setLoadingStudents(false);
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [selectedModule?.id]);

  if (!selectedModule) {
    return (
      <section className="teacher-dashboard-panel-in analyze-page">
        <div className="analyze-hero panel">
          <div>
            <p className="eyebrow">Learning Analytics</p>
            <h1>Analyze Modules</h1>
            <p>Choose a module to review participation, topic performance, and student learning progress.</p>
          </div>
          <span>{modules.length} modules</span>
        </div>

        <div className="analyze-module-grid">
          {modules.map((module) => {
            const moduleSessions = sessions.filter((session) => Number(session.moduleId) === Number(module.id));
            const uniqueStudents = new Set(
              moduleSessions.flatMap((session) => (session.participants || []).map((participant) => participant.studentId || participant.id)),
            );
            const attempts = moduleSessions.flatMap((session) =>
              getAnalysisStrategy(session.gameType || 'classic_mcq').getAttempts(session, module),
            );
            const correct = attempts.filter((attempt) => attempt.correct).length;
            const description = module.description || 'No description yet.';

            return (
              <article className="panel analyze-module-card" key={module.id}>
                <div className="analyze-module-card-head">
                  <p className="eyebrow">{module.moduleCode}</p>
                  <h2>{module.title}</h2>
                </div>
                <div className="analyze-description-hover">
                  <button className="description-toggle" type="button">
                    Show Description
                  </button>
                  <div className="analyze-description-popover" role="tooltip">
                    <p>{description}</p>
                  </div>
                </div>
                <div className="analyze-mini-grid">
                  <Stat label="Sessions" value={moduleSessions.length} />
                  <Stat label="Students Played" value={uniqueStudents.size} />
                  <Stat label="Topics" value={module.chapters?.length || 0} />
                  <Stat label="Correct Avg" value={formatPercent(correct, attempts.length)} />
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('');
                    setSelectedModuleId(module.id);
                  }}
                >
                  View Analysis
                </button>
              </article>
            );
          })}
          {modules.length === 0 && <EmptyState text="Create a module first before viewing analysis." />}
        </div>
      </section>
    );
  }

  return (
    <section className="teacher-dashboard-panel-in analyze-page">
      <div className="analyze-hero panel">
        <div>
          <p className="eyebrow">{selectedModule.moduleCode}</p>
          <div className="analyze-selected-title-wrap">
            <h1 tabIndex="0">{selectedModule.title}</h1>
            <div className="analyze-selected-description-popover" role="tooltip">
              <p>{selectedModuleDescription}</p>
            </div>
          </div>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setSelectedModuleId('');
            setSelectedStudentId('');
          }}
        >
          Back To Modules
        </button>
      </div>

      <Feedback text={error} />

      <section className="panel analyze-mode-panel">
        <div>
          <p className="eyebrow">Choose Analysis Type</p>
          <h2>{analyzeMode.label}</h2>
          <p>{analyzeMode.description}</p>
        </div>
        <div className="analyze-mode-options" role="tablist" aria-label="Analysis game type">
          {ANALYZE_GAME_MODES.map((mode) => (
            <button
              className={analyzeGameType === mode.value ? 'analyze-mode-card active' : 'analyze-mode-card'}
              key={mode.value}
              type="button"
              onClick={() => {
                setAnalyzeGameType(mode.value);
                setSelectedStudentId('');
                setTopicBreakdownOpen(false);
                setStudentPerformanceOpen(false);
              }}
            >
              <span>{mode.eyebrow}</span>
              <strong>{mode.label}</strong>
              <small>{mode.description}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="stats-grid analyze-summary-grid">
        <Stat label="Sessions" value={analysis.moduleSessions.length} />
        <Stat label="Students In Module" value={loadingStudents ? '...' : analysis.studentStats.length} />
        <Stat label={analysis.mode.primaryMetric} value={`${analysis.accuracy}%`} />
        <Stat label={analysis.mode.timeMetric} value={formatSeconds(analysis.averageTime)} />
        {analysis.gameType === 'qr_pair_match' && (
          <Stat label="Wrong Scans" value={analysis.totalWrongScans} />
        )}
      </div>

      <section className="panel analyze-section">
        <div className="analyze-section-heading">
          <div>
            <p className="eyebrow">{analysis.mode.eyebrow}</p>
            <h2>{analysis.mode.label} Topic Breakdown</h2>
          </div>
          <div className="analyze-section-actions">
            <div className="analyze-topic-highlight">
              <span>Strongest: {analysis.strongestTopic?.title || '-'}</span>
              <span>Weakest: {analysis.weakestTopic?.title || '-'}</span>
            </div>
            <button
              className="secondary-button compact-button analyze-collapse-button"
              type="button"
              onClick={() => setTopicBreakdownOpen((isOpen) => !isOpen)}
            >
              {topicBreakdownOpen ? 'Hide Breakdown' : 'Show Breakdown'}
            </button>
          </div>
        </div>
        {topicBreakdownOpen && (
          <div className="analyze-topic-list analyze-collapsible-content">
            {analysis.topicStats.map((topic) => (
              <article className="analyze-topic-row" key={getTopicKey(topic.id)}>
                <div>
                  <p className="eyebrow">{topic.code || 'Topic'}</p>
                  <h3>{topic.title}</h3>
                  <p>{topic.sessionCount} sessions · {topic.studentCount} students · {topic.answers} {analysis.mode.attemptLabel}</p>
                </div>
                <div className="analyze-topic-metrics">
                  <strong>{topic.accuracy}%</strong>
                  <AccuracyBar value={topic.accuracy} />
                  <span>{analysis.mode.timeMetric}: {formatSeconds(topic.averageTime)}</span>
                  {analysis.gameType === 'qr_pair_match' && <span>Wrong scans: {topic.wrongScans || 0}</span>}
                </div>
              </article>
            ))}
            {analysis.topicStats.length === 0 && <EmptyState text={analysis.mode.emptyText} />}
          </div>
        )}
      </section>

      <section className="panel analyze-section">
        <div className="analyze-section-heading">
          <div>
            <p className="eyebrow">Student Performance</p>
            <h2>Students In This Module</h2>
          </div>
          <div className="analyze-section-actions">
            {selectedStudent && studentPerformanceOpen && (
              <button className="secondary-button compact-button" type="button" onClick={() => setSelectedStudentId('')}>
                Clear Student View
              </button>
            )}
            <button
              className="secondary-button compact-button analyze-collapse-button"
              type="button"
              onClick={() => setStudentPerformanceOpen((isOpen) => !isOpen)}
            >
              {studentPerformanceOpen ? 'Hide Students' : 'Show Students'}
            </button>
          </div>
        </div>

        {studentPerformanceOpen && (
          <div className="analyze-collapsible-content">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Sessions Joined</th>
                    <th>Top Topic</th>
                    <th>{analysis.mode.studentMetric}</th>
                    <th>{analysis.mode.timeMetric}</th>
                    <th>Score</th>
                    {analysis.gameType === 'qr_pair_match' && <th>Wrong Scans</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.studentStats.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <strong>{student.name}</strong>
                        <br />
                        <span className="muted">{student.studentCode || student.email || '-'}</span>
                      </td>
                      <td>{student.sessionsJoined}</td>
                      <td>{student.topTopic}</td>
                      <td>
                        <div className="analyze-table-accuracy">
                          <span>{student.accuracy}%</span>
                          <AccuracyBar value={student.accuracy} />
                        </div>
                      </td>
                      <td>{formatSeconds(student.averageTime)}</td>
                      <td>{student.score}</td>
                      {analysis.gameType === 'qr_pair_match' && <td>{student.wrongScans || 0}</td>}
                      <td>
                        <button
                          className={selectedStudentId === student.studentId ? 'primary-button compact-button' : 'secondary-button compact-button'}
                          type="button"
                          onClick={() => setSelectedStudentId(student.studentId)}
                        >
                          View Student
                        </button>
                      </td>
                    </tr>
                  ))}
                  {analysis.studentStats.length === 0 && (
                    <tr>
                      <td colSpan={analysis.gameType === 'qr_pair_match' ? '8' : '7'}>
                        No joined students or session participants found for this analysis yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedStudent && (
              <div className="analyze-student-detail">
                <div>
                  <p className="eyebrow">Student Detail</p>
                  <h2>{selectedStudent.name}</h2>
                  <p>
                    {selectedStudent.correct}/{selectedStudent.answers} {analysis.mode.detailText} · {formatSeconds(selectedStudent.averageTime)} average time
                  </p>
                </div>
                <div className="analyze-mini-grid">
                  <Stat label="Sessions Joined" value={selectedStudent.sessionsJoined} />
                  <Stat label={analysis.mode.studentMetric} value={`${selectedStudent.accuracy}%`} />
                  <Stat label="Score In Module" value={selectedStudent.score} />
                  <Stat label="Most Played Topic" value={selectedStudent.topTopic} />
                </div>
                <div className="analyze-attempt-list">
                  {selectedStudent.attempts.slice(0, 12).map((attempt) => (
                    <div className="analyze-attempt-row" key={`${attempt.sessionId}-${attempt.questionId}-${attempt.status}-${attempt.score}`}>
                      <span>{attempt.sessionCode}</span>
                      <span>{attempt.topic.title}</span>
                      <strong className={attempt.correct ? 'success-text' : 'danger-text'}>{attempt.status}</strong>
                      <span>{formatSeconds(attempt.seconds)}</span>
                      <span>{attempt.score} pts</span>
                    </div>
                  ))}
                  {selectedStudent.attempts.length === 0 && <p className="muted">No answer records for this student yet.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
