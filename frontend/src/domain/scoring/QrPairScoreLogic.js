import { ScoreLogic } from './ScoreLogic.js';

export class QrPairScoreLogic extends ScoreLogic {
  constructor({
    baseScore = 10,
    fastBonus = 2,
    fastAnswerRatio = 0.15,
    penaltyStartRatio = 0.2,
    maximumWrongScanPenalty = 4,
    maximumTimePenalty = 4,
    minimumScore = 0,
  } = {}) {
    super();
    this.baseScore = baseScore;
    this.fastBonus = fastBonus;
    this.fastAnswerRatio = fastAnswerRatio;
    this.penaltyStartRatio = penaltyStartRatio;
    this.maximumWrongScanPenalty = maximumWrongScanPenalty;
    this.maximumTimePenalty = maximumTimePenalty;
    this.minimumScore = minimumScore;
  }

  calculate({ elapsedSeconds, roundSeconds, wrongScanCount }) {
    if (elapsedSeconds >= roundSeconds) {
      return 0;
    }

    const elapsedRatio = elapsedSeconds / roundSeconds;
    const fastBonus = elapsedRatio <= this.fastAnswerRatio ? this.fastBonus : 0;
    const wrongPenalty = this.calculateWrongScanPenalty(wrongScanCount);
    const timePenalty = this.calculateTimePenalty(elapsedRatio);

    return Math.max(
      this.baseScore + fastBonus - wrongPenalty - timePenalty,
      this.minimumScore,
    );
  }

  calculateWrongScanPenalty(wrongScanCount) {
    return Math.min(wrongScanCount, this.maximumWrongScanPenalty);
  }

  calculateTimePenalty(elapsedRatio) {
    if (elapsedRatio <= this.penaltyStartRatio) {
      return 0;
    }

    const penaltyRange = 1 - this.penaltyStartRatio;
    return Math.min(
      Math.ceil(
        ((elapsedRatio - this.penaltyStartRatio) / penaltyRange)
          * this.maximumTimePenalty,
      ),
      this.maximumTimePenalty,
    );
  }
}

export const qrPairScoreLogic = new QrPairScoreLogic();

export default QrPairScoreLogic;
