import { supabase } from './supabaseClient.js';
import {
  DEFAULT_EXP_LEVEL_THRESHOLDS,
  expCalculator,
} from '../domain/experience/EXPCalculator.js';
import { leaderboardRanker } from '../domain/leaderboard/LeaderboardRanker.js';

export const LEVEL_THRESHOLDS = DEFAULT_EXP_LEVEL_THRESHOLDS;

export function getLevelFromExp(totalExp = 0) {
  return expCalculator.getLevel(totalExp);
}

export function getLevelProgress(totalExp = 0) {
  return expCalculator.getProgress(totalExp);
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

export async function fetchStudentExperienceLeaderboard(limit = 10) {
  const { data, error } = await supabase.rpc('get_student_exp_leaderboard', {
    limit_count: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  const students = (data || []).map((student) => ({
    id: student.student_id,
    studentCode: student.student_code,
    name: student.student_name || 'Student',
    totalExp: student.total_exp || 0,
    level: student.level || 1,
  }));

  return leaderboardRanker
    .rankByScoreAndName(students, {
      scoreSelector: (student) => student.totalExp,
    })
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
}
