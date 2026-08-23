import { ScoreLogic } from './ScoreLogic.js';

export class ClassicMcqScoreLogic extends ScoreLogic {
  constructor({
    baseScore = 10,
    fastBonus = 2,
    fastAnswerRatio = 0.15,
    penaltyStartRatio = 0.2,
    maximumTimePenalty = 6,
    minimumCorrectScore = 4,
  } = {}) {
    super();
    this.baseScore = baseScore;
    this.fastBonus = fastBonus;
    this.fastAnswerRatio = fastAnswerRatio;
    this.penaltyStartRatio = penaltyStartRatio;
    this.maximumTimePenalty = maximumTimePenalty;
    this.minimumCorrectScore = minimumCorrectScore;
  }

  calculate({ elapsedSeconds, isCorrect, roundSeconds, timerEnabled }) {
    if (!isCorrect) {
      return 0;
    }

    if (!timerEnabled) {
      return this.baseScore;
    }

    if (elapsedSeconds >= roundSeconds) {
      return 0;
    }

    const elapsedRatio = elapsedSeconds / roundSeconds;
    const fastBonus = elapsedRatio <= this.fastAnswerRatio ? this.fastBonus : 0;
    const timePenalty = this.calculateTimePenalty(elapsedRatio);

    return Math.max(
      this.baseScore + fastBonus - timePenalty,
      this.minimumCorrectScore,
    );
  }

  calculateTimePenalty(elapsedRatio) {
    if (elapsedRatio <= this.penaltyStartRatio) {
      return 0;
    }

    const penaltyRange = 1 - this.penaltyStartRatio;
    return Math.min(
      Math.ceil(((elapsedRatio - this.penaltyStartRatio) / penaltyRange) * this.maximumTimePenalty),
      this.maximumTimePenalty,
    );
  }
}

export const classicMcqScoreLogic = new ClassicMcqScoreLogic();
