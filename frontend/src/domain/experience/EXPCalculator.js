export const DEFAULT_EXP_LEVEL_THRESHOLDS = [
  0,
  100,
  250,
  500,
  800,
  1200,
  1700,
  2300,
  3000,
  4000,
];

export class EXPCalculator {
  constructor({ levelThresholds = DEFAULT_EXP_LEVEL_THRESHOLDS } = {}) {
    if (!Array.isArray(levelThresholds) || levelThresholds.length === 0) {
      throw new TypeError('levelThresholds must be a non-empty array.');
    }

    const normalizedThresholds = levelThresholds.map((threshold) => Number(threshold));
    const hasInvalidThreshold = normalizedThresholds.some(
      (threshold, index) =>
        !Number.isFinite(threshold) ||
        threshold < 0 ||
        (index > 0 && threshold <= normalizedThresholds[index - 1]),
    );

    if (hasInvalidThreshold) {
      throw new TypeError('levelThresholds must contain increasing non-negative numbers.');
    }

    this.levelThresholds = Object.freeze([...normalizedThresholds]);
  }

  normalize(totalExp = 0) {
    return Math.max(Number(totalExp) || 0, 0);
  }

  getLevel(totalExp = 0) {
    const safeTotal = this.normalize(totalExp);

    return this.levelThresholds.reduce(
      (level, threshold, index) => (safeTotal >= threshold ? index + 1 : level),
      1,
    );
  }

  getProgress(totalExp = 0) {
    const safeTotal = this.normalize(totalExp);
    const level = this.getLevel(safeTotal);
    const currentThreshold =
      this.levelThresholds[level - 1] ??
      this.levelThresholds[this.levelThresholds.length - 1];
    const nextThreshold = this.levelThresholds[level] ?? null;

    if (!nextThreshold) {
      return {
        currentThreshold,
        expIntoLevel: safeTotal - currentThreshold,
        level,
        nextThreshold: null,
        percent: 100,
        remainingExp: 0,
        totalExp: safeTotal,
      };
    }

    const expIntoLevel = safeTotal - currentThreshold;
    const expNeeded = nextThreshold - currentThreshold;

    return {
      currentThreshold,
      expIntoLevel,
      level,
      nextThreshold,
      percent: Math.max(0, Math.min(Math.round((expIntoLevel / expNeeded) * 100), 100)),
      remainingExp: Math.max(nextThreshold - safeTotal, 0),
      totalExp: safeTotal,
    };
  }
}

export const expCalculator = new EXPCalculator();

export default expCalculator;
