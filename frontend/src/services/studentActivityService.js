import { supabase } from './supabaseClient.js';

function firstRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export async function fetchStudentActivity(studentId) {
  if (!studentId) {
    return [];
  }

  const { data, error } = await supabase
    .from('participants')
    .select(`
      id,
      score,
      joined_at,
      student_name,
      sessions:session_id (
        id,
        session_code,
        game_type,
        status,
        created_at,
        ended_at,
        modules:module_id (
          title
        )
      ),
      responses (
        id,
        submitted_answer,
        is_correct,
        score_awarded,
        submitted_at,
        questions:question_id (
          question_text,
          answer_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation
        )
      )
    `)
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const participantIds = (data || []).map((participant) => participant.id);
  const { data: qrRows, error: qrError } = participantIds.length
    ? await supabase
      .from('qr_pair_assignments')
      .select(`
        id,
        question_holder_participant_id,
        question_id,
        status,
        wrong_scan_count,
        score_awarded,
        answered_seconds,
        completed_at,
        questions:question_id (
          question_text,
          answer_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation
        )
      `)
      .in('question_holder_participant_id', participantIds)
      .eq('assignment_type', 'pair')
      .neq('status', 'pending')
    : { data: [], error: null };

  if (qrError) {
    throw new Error(qrError.message);
  }

  const { data: expRows, error: expError } = participantIds.length
    ? await supabase
      .from('student_exp_logs')
      .select('*')
      .eq('student_id', studentId)
      .in('participant_id', participantIds)
    : { data: [], error: null };

  if (expError) {
    throw new Error(expError.message);
  }

  const expLogByParticipantId = (expRows || []).reduce((collection, log) => {
    collection.set(log.participant_id, {
      expGained: log.exp_gained || 0,
      completionBonus: log.completion_bonus || 0,
      rankingBonus: log.ranking_bonus || 0,
      oldLevel: log.old_level || 1,
      newLevel: log.new_level || 1,
      rank: log.rank,
    });
    return collection;
  }, new Map());

  const qrAttemptsByParticipantId = (qrRows || []).reduce((collection, attempt) => {
    const attempts = collection.get(attempt.question_holder_participant_id) || [];
    attempts.push(attempt);
    collection.set(attempt.question_holder_participant_id, attempts);
    return collection;
  }, new Map());

  return (data || []).map((participant) => {
    const session = firstRelation(participant.sessions);
    const module = firstRelation(session?.modules);
    const responses = participant.responses || [];
    const qrAttempts = qrAttemptsByParticipantId.get(participant.id) || [];
    const correctClassicCount = responses.filter((response) => response.is_correct).length;
    const correctQrCount = qrAttempts.filter((attempt) => attempt.status === 'correct').length;
    const correctCount = correctClassicCount + correctQrCount;
    const totalAnswerCount = responses.length + qrAttempts.length;
    const wrongCount = totalAnswerCount - correctCount;
    const expLog = expLogByParticipantId.get(participant.id) || null;

    return {
      id: participant.id,
      sessionId: session?.id,
      score: participant.score,
      expGained: expLog?.expGained || 0,
      levelAfter: expLog?.newLevel,
      levelBefore: expLog?.oldLevel,
      rankingBonus: expLog?.rankingBonus || 0,
      completionBonus: expLog?.completionBonus || 0,
      joinedAt: participant.joined_at,
      sessionCode: session?.session_code || 'Unknown',
      gameType: session?.game_type || 'classic_mcq',
      sessionStatus: session?.status || 'unknown',
      moduleTitle: module?.title || 'Unknown module',
      totalAnswers: totalAnswerCount,
      correctCount,
      wrongCount,
      answers: responses
        .map((response) => {
          const question = firstRelation(response.questions);
          const optionMap = {
            A: question?.option_a,
            B: question?.option_b,
            C: question?.option_c,
            D: question?.option_d,
          };

          return {
            id: response.id,
            questionText: question?.question_text || 'Question unavailable',
            correctAnswer:
              optionMap[question?.correct_option] || question?.answer_text || question?.correct_option || '-',
            explanation: question?.explanation || '',
            submittedAnswer: response.submitted_answer,
            isCorrect: response.is_correct,
            scoreAwarded: response.score_awarded,
            submittedAt: response.submitted_at,
          };
        })
        .sort((left, right) => new Date(left.submittedAt) - new Date(right.submittedAt)),
      qrAttempts: qrAttempts
        .map((attempt) => {
          const question = firstRelation(attempt.questions);
          const optionMap = {
            A: question?.option_a,
            B: question?.option_b,
            C: question?.option_c,
            D: question?.option_d,
          };

          return {
            id: attempt.id,
            questionText: question?.question_text || 'Question unavailable',
            correctAnswer:
              optionMap[question?.correct_option] || question?.answer_text || question?.correct_option || '-',
            explanation: question?.explanation || '',
            status: attempt.status,
            isCorrect: attempt.status === 'correct',
            wrongScanCount: attempt.wrong_scan_count || 0,
            scoreAwarded: attempt.score_awarded || 0,
            answeredSeconds: attempt.answered_seconds,
            completedAt: attempt.completed_at,
          };
        })
        .sort((left, right) => new Date(left.completedAt || 0) - new Date(right.completedAt || 0)),
    };
  });
}
