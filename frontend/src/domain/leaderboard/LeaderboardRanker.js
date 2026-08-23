function getDefaultScore(entry) {
  return entry?.score || 0;
}

function getDefaultName(entry) {
  return entry?.name || '';
}

export class LeaderboardRanker {
  rankByScore(entries = [], { scoreSelector = getDefaultScore } = {}) {
    return this.rank(entries, { scoreSelector });
  }

  rankByScoreAndName(
    entries = [],
    {
      nameSelector = getDefaultName,
      scoreSelector = getDefaultScore,
    } = {},
  ) {
    return this.rank(entries, {
      nameSelector,
      scoreSelector,
      useNameTieBreak: true,
    });
  }

  rankByScoreTimeAndName(
    entries = [],
    {
      nameSelector = getDefaultName,
      scoreSelector = getDefaultScore,
      timeSelector = () => null,
    } = {},
  ) {
    return this.rank(entries, {
      nameSelector,
      scoreSelector,
      timeSelector,
      useNameTieBreak: true,
      useTimeTieBreak: true,
    });
  }

  withRanks(entries = [], options = {}) {
    return this.rank(entries, options).map((entry, index) => ({
      entry,
      rank: index + 1,
    }));
  }

  rank(
    entries = [],
    {
      nameSelector = getDefaultName,
      scoreSelector = getDefaultScore,
      timeSelector = () => null,
      useNameTieBreak = false,
      useTimeTieBreak = false,
    } = {},
  ) {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry, originalIndex) => ({
        entry,
        name: String(nameSelector(entry) || ''),
        originalIndex,
        score: Number(scoreSelector(entry)) || 0,
        time: this.normalizeTime(timeSelector(entry)),
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (useTimeTieBreak && left.time !== right.time) {
          return left.time - right.time;
        }

        if (useNameTieBreak) {
          const nameComparison = left.name.localeCompare(right.name);

          if (nameComparison !== 0) {
            return nameComparison;
          }
        }

        return left.originalIndex - right.originalIndex;
      })
      .map(({ entry }) => entry);
  }

  normalizeTime(value) {
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }
}

export const leaderboardRanker = new LeaderboardRanker();

export default leaderboardRanker;
