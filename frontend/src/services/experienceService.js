import { supabase } from './supabaseClient.js';

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];

export function getLevelFromExp(totalExp = 0) {
  const safeTotal = Math.max(Number(totalExp) || 0, 0);
  return LEVEL_THRESHOLDS.reduce(
    (level, threshold, index) => (safeTotal >= threshold ? index + 1 : level),
    1,
  );
}

export function getLevelProgress(totalExp = 0) {
  const safeTotal = Math.max(Number(totalExp) || 0, 0);
  const level = getLevelFromExp(safeTotal);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

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

function toExperienceLog(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    expGained: row.exp_gained || 0,
    sessionScore: row.session_score || 0,
    completionBonus: row.completion_bonus || 0,
    rankingBonus: row.ranking_bonus || 0,
    rank: row.rank,
    oldLevel: row.old_level || 1,
    newLevel: row.new_level || 1,
    createdAt: row.created_at,
  };
}

export async function settleSessionExperience(sessionId) {
  if (!sessionId) {
    return [];
  }

  const { data, error } = await supabase.rpc('settle_session_experience', {
    target_session_id: sessionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(toExperienceLog);
}

export async function fetchStudentExperience(studentId) {
  if (!studentId) {
    return { level: 1, totalExp: 0 };
  }

  const { data, error } = await supabase
    .from('students')
    .select('level, total_exp')
    .eq('id', studentId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    level: data?.level || 1,
    totalExp: data?.total_exp || 0,
  };
}
