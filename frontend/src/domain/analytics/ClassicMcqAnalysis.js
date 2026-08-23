import { AnalysisStrategy } from './AnalysisStrategy.js';

const CLASSIC_MCQ_MODE = {
  value: 'classic_mcq',
  label: 'Classic MCQ',
  eyebrow: 'MCQ Analysis',
  description: 'Review answer correctness, response speed, and scores from normal MCQ sessions.',
  primaryMetric: 'Correct Average',
  topicMetric: 'Correct Avg',
  attemptLabel: 'answers',
  studentMetric: 'Correct Avg',
  timeMetric: 'Avg Answer Time',
  detailText: 'correct answers',
  emptyText: 'No Classic MCQ sessions found for this module yet.',
};

export class ClassicMcqAnalysis extends AnalysisStrategy {
  constructor() {
    super(CLASSIC_MCQ_MODE);
  }

  getAttempts(session, module) {
    return (session.responses || []).map((response) => ({
      sessionId: session.id,
      sessionCode: session.code,
      gameType: session.gameType,
      studentId: response.studentId || '',
      studentName: response.studentName || '-',
      questionId: response.questionId,
      topic: this.getQuestionTopic(module, response.questionId, session),
      correct: Boolean(response.correct),
      status: response.responseStatus || (response.correct ? 'correct' : 'wrong'),
      seconds: Number.isFinite(response.answeredSeconds) ? response.answeredSeconds : null,
      score: response.scoreAwarded || 0,
      wrongScans: Number(response.wrongScans || 0),
    }));
  }
}

export default ClassicMcqAnalysis;
