import { AnalysisStrategy } from './AnalysisStrategy.js';

const QR_PAIR_MODE = {
  value: 'qr_pair_match',
  label: 'QR Pair Match',
  eyebrow: 'QR Analysis',
  description: 'Review successful matches, solve speed, wrong scans, and teamwork performance.',
  primaryMetric: 'Match Success',
  topicMetric: 'Success Rate',
  attemptLabel: 'matches',
  studentMetric: 'Match Success',
  timeMetric: 'Avg Solve Time',
  detailText: 'successful matches',
  emptyText: 'No QR Pair Match sessions found for this module yet.',
};

export class QrPairAnalysis extends AnalysisStrategy {
  constructor() {
    super(QR_PAIR_MODE);
  }

  getAttempts(session, module) {
    return (session?.qrPair?.turns || [])
      .flatMap((turn) =>
        (turn.assignments || []).map((assignment) => ({
          ...assignment,
          turnNumber: turn.turnNumber,
        })),
      )
      .filter((assignment) => assignment.assignmentType === 'pair' && assignment.status !== 'pending')
      .map((assignment) => {
        const participant = (session.participants || []).find(
          (item) => Number(item.participantId) === Number(assignment.questionHolderParticipantId),
        );

        return {
          sessionId: session.id,
          sessionCode: session.code,
          gameType: session.gameType,
          studentId: participant?.studentId || participant?.id || '',
          studentName: participant?.name || '-',
          questionId: assignment.questionId,
          topic: this.getQuestionTopic(module, assignment.questionId, session),
          correct: assignment.status === 'correct',
          status: assignment.status,
          seconds: Number.isFinite(assignment.answeredSeconds) ? assignment.answeredSeconds : null,
          score: assignment.scoreAwarded || 0,
          wrongScans: Number(assignment.wrongScans || assignment.wrong_scan_count || 0),
        };
      });
  }
}

export default QrPairAnalysis;
