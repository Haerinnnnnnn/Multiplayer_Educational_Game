import { RoundPlanner } from './RoundPlanner.js';

function defaultShuffle(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item);
}

function defaultTokenFactory() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export class QrPairRoundPlanner extends RoundPlanner {
  constructor({ shuffle = defaultShuffle, tokenFactory = defaultTokenFactory } = {}) {
    super();
    this.shuffle = shuffle;
    this.tokenFactory = tokenFactory;
  }

  createPlan({ questionIds = [], participants = [], previousAssignments = [] }) {
    const completedQuestionMap = this.getCompletedQuestionMap(previousAssignments);
    const participantsWithRemaining = participants
      .map((participant) => {
        const completedQuestions = completedQuestionMap.get(participant.participantId) || new Set();
        const remainingQuestionIds = questionIds.filter(
          (questionId) => !completedQuestions.has(questionId),
        );

        return { ...participant, remainingQuestionIds };
      })
      .filter((participant) => participant.remainingQuestionIds.length > 0);

    if (participantsWithRemaining.length === 0) {
      return { complete: true, pairs: [], decoys: [] };
    }

    const questionHolderCount = this.getQuestionHolderCount({
      participantCount: participants.length,
      questionCount: questionIds.length,
      availableHolderCount: participantsWithRemaining.length,
    });
    const questionHolders = this.shuffle(participantsWithRemaining)
      .sort((left, right) => right.remainingQuestionIds.length - left.remainingQuestionIds.length)
      .slice(0, questionHolderCount);
    const questionHolderIds = new Set(
      questionHolders.map((participant) => participant.participantId),
    );
    const answerHolders = this.shuffle(
      participants.filter((participant) => !questionHolderIds.has(participant.participantId)),
    );
    const correctAnswerHolders = answerHolders.slice(0, questionHolders.length);
    const decoyAnswerHolders = answerHolders.slice(questionHolders.length);
    const usedQuestionIds = new Set();

    const pairs = questionHolders.map((questionHolder, index) => {
      const uniqueRemainingQuestionIds = questionHolder.remainingQuestionIds.filter(
        (questionId) => !usedQuestionIds.has(questionId),
      );
      const questionId = this.shuffle(
        uniqueRemainingQuestionIds.length
          ? uniqueRemainingQuestionIds
          : questionHolder.remainingQuestionIds,
      )[0];

      usedQuestionIds.add(questionId);

      return {
        questionId,
        questionHolderParticipantId: questionHolder.participantId,
        answerHolderParticipantId: correctAnswerHolders[index].participantId,
        answerQrToken: this.tokenFactory(),
      };
    });

    const decoyQuestionIds = questionIds.filter((questionId) => !usedQuestionIds.has(questionId));
    const decoys = decoyQuestionIds.length
      ? decoyAnswerHolders.map((answerHolder, index) => ({
          targetPairIndex: index % pairs.length,
          questionId: this.shuffle(decoyQuestionIds)[0],
          answerHolderParticipantId: answerHolder.participantId,
          answerQrToken: this.tokenFactory(),
        }))
      : [];

    return { complete: false, pairs, decoys };
  }

  getCompletedQuestionMap(assignments) {
    return assignments.reduce((collection, assignment) => {
      if ((assignment.assignment_type || 'pair') !== 'pair') {
        return collection;
      }

      if (assignment.status !== 'correct' && assignment.status !== 'timeout') {
        return collection;
      }

      const completedQuestions = collection.get(assignment.question_holder_participant_id)
        || new Set();
      completedQuestions.add(assignment.question_id);
      collection.set(assignment.question_holder_participant_id, completedQuestions);
      return collection;
    }, new Map());
  }

  getQuestionHolderCount({ participantCount, questionCount, availableHolderCount }) {
    const isOddStudentCount = participantCount % 2 !== 0;
    const maxQuestionHoldersByStudents = Math.floor(participantCount / 2);
    const maxQuestionHoldersByQuestions = isOddStudentCount
      ? Math.max(questionCount - 1, 1)
      : questionCount;

    return Math.min(
      maxQuestionHoldersByStudents,
      maxQuestionHoldersByQuestions,
      availableHolderCount,
    );
  }
}

export const qrPairRoundPlanner = new QrPairRoundPlanner();

export default qrPairRoundPlanner;
