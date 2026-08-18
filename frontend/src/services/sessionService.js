import { supabase } from './supabaseClient.js';
import { makeSessionCode } from '../utils/sessionHelpers.js';
import { toQuestion } from './questionService.js';

function toParticipant(row) {
  return {
    id: row.student_id || row.id,
    participantId: row.id,
    studentId: row.student_id,
    name: row.student_name,
    score: row.score || 0,
    status: row.status || 'active',
    joinedAt: row.joined_at,
    leftAt: row.left_at,
  };
}

function toModule(row, questions = []) {
  return {
    id: row.id,
    moduleCode: row.module_code,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description || 'No description yet.',
    visibility: row.visibility || 'private',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    isLocked: Boolean(row.is_locked),
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    questions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSession(row, participants = [], questionIds = []) {
  const storedQuestionIds = Array.isArray(row.question_ids)
    ? row.question_ids.map((questionId) => Number(questionId))
    : [];

  return {
    id: row.id,
    code: row.session_code,
    moduleId: row.module_id,
    teacherId: row.teacher_id,
    questionCount: row.question_count,
    questionIds: storedQuestionIds.length ? storedQuestionIds : questionIds,
    questionSelectionMode: row.question_selection_mode || 'random',
    gameType: row.game_type || 'classic_mcq',
    timerEnabled: row.timer_enabled !== false,
    roundSeconds: row.round_seconds || 60,
    wrongScanPenaltySeconds: row.wrong_scan_penalty_seconds || 10,
    status: row.status,
    currentQuestionIndex: row.current_question_index || 0,
    pausedAt: row.paused_at,
    totalPausedSeconds: row.total_paused_seconds || 0,
    participants,
    responses: [],
    qrPair: null,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
    createdAtRaw: row.created_at,
    endedAt: row.ended_at,
  };
}

function toResponse(row, participants = []) {
  const participant = participants.find((item) => item.participantId === row.participant_id);

  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    studentId: participant?.studentId || participant?.id,
    studentName: participant?.name || '-',
    questionId: row.question_id,
    answer: row.submitted_answer,
    correct: Boolean(row.is_correct),
    scoreAwarded: row.score_awarded || 0,
    answeredSeconds: row.answered_seconds,
    responseStatus: row.response_status || (row.is_correct ? 'correct' : 'wrong'),
    submittedAt: row.submitted_at,
  };
}

function getQuestionIds(module, questionCount) {
  return (module?.questions || []).slice(0, questionCount).map((question) => question.id);
}

function shuffleQuestions(questions) {
  return [...questions]
    .map((question) => ({ question, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ question }) => question);
}

function getSessionQuestionIds({ module, questionCount, questionSelectionMode, selectedQuestionIds }) {
  if (questionSelectionMode === 'manual') {
    return (selectedQuestionIds || []).map((questionId) => Number(questionId));
  }

  const safeQuestionCount = Math.min(Number(questionCount), module.questions.length);
  return shuffleQuestions(module.questions)
    .slice(0, safeQuestionCount)
    .map((question) => question.id);
}

function isMissingSchemaColumnError(error, columns = []) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const combinedMessage = `${message} ${details}`;

  return (
    error?.code === 'PGRST204' ||
    combinedMessage.includes('schema cache') ||
    columns.some((column) => combinedMessage.includes(String(column).toLowerCase()))
  );
}

function isResponseStatusConstraintError(error) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === '23514' &&
    message.includes('responses_response_status_check')
  );
}

export async function fetchSessionParticipants(sessionId) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (error) {
    const detail = [error.code, error.message].filter(Boolean).join(' ');
    const sessionError = new Error(detail || 'Session not found.');
    sessionError.code = error.code;
    sessionError.status = error.status;
    throw sessionError;
  }

  return (data || []).map(toParticipant);
}

async function fetchSessionResponses(sessionId, participants = []) {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((response) => toResponse(response, participants));
}

export async function fetchModuleWithQuestions(moduleId) {
  const [{ data: moduleRow, error: moduleError }, { data: questionRows, error: questionError }] =
    await Promise.all([
      supabase.from('modules').select('*').eq('id', moduleId).single(),
      supabase
        .from('questions')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false }),
    ]);

  if (moduleError) {
    throw new Error(moduleError.message);
  }

  if (questionError) {
    throw new Error(questionError.message);
  }

  return toModule(moduleRow, (questionRows || []).map(toQuestion));
}

export async function createDatabaseSession({
  gameType = 'classic_mcq',
  module,
  questionCount,
  questionSelectionMode = 'random',
  roundSeconds = 60,
  selectedQuestionIds = [],
  teacherId,
  timerEnabled = true,
  wrongScanPenaltySeconds = 10,
}) {
  const sessionQuestionIds = getSessionQuestionIds({
    module,
    questionCount,
    questionSelectionMode,
    selectedQuestionIds,
  });
  const safeQuestionCount = sessionQuestionIds.length;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        module_id: module.id,
        teacher_id: teacherId,
        session_code: makeSessionCode(),
        question_count: safeQuestionCount,
        question_ids: sessionQuestionIds,
        question_selection_mode: questionSelectionMode,
        game_type: gameType,
        timer_enabled: Boolean(timerEnabled),
        round_seconds: Number(roundSeconds) || 60,
        wrong_scan_penalty_seconds: Number(wrongScanPenaltySeconds) || 10,
        status: 'lobby',
        current_question_index: 0,
      })
      .select('*')
      .single();

    if (!error) {
      return toSession(data, [], sessionQuestionIds);
    }

    if (error.code !== '23505' || attempt === 2) {
      throw new Error(error.message);
    }
  }

  throw new Error('Unable to generate a unique session code.');
}

function toQrPairTurn(row, assignmentRows = []) {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnNumber: row.turn_number,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    assignments: assignmentRows.map((assignment) => ({
      id: assignment.id,
      sessionId: assignment.session_id,
      turnId: assignment.turn_id,
      questionId: assignment.question_id,
      questionHolderParticipantId: assignment.question_holder_participant_id,
      answerHolderParticipantId: assignment.answer_holder_participant_id,
      answerQrToken: assignment.answer_qr_token,
      assignmentType: assignment.assignment_type || 'pair',
      decoyForAssignmentId: assignment.decoy_for_assignment_id,
      status: assignment.status,
      wrongScanCount: assignment.wrong_scan_count || 0,
      scoreAwarded: assignment.score_awarded || 0,
      answeredSeconds: assignment.answered_seconds,
      questionHolderReady: Boolean(assignment.question_holder_ready),
      answerHolderReady: Boolean(assignment.answer_holder_ready),
      completedAt: assignment.completed_at,
    })),
  };
}

async function fetchQrPairState(sessionId) {
  const [{ data: turnRows, error: turnError }, { data: assignmentRows, error: assignmentError }] =
    await Promise.all([
      supabase
        .from('qr_pair_turns')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn_number', { ascending: true }),
      supabase
        .from('qr_pair_assignments')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true }),
    ]);

  if (turnError) {
    throw new Error(turnError.message);
  }

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const assignmentsByTurn = (assignmentRows || []).reduce((collection, assignment) => {
    const turnAssignments = collection.get(assignment.turn_id) || [];
    turnAssignments.push(assignment);
    collection.set(assignment.turn_id, turnAssignments);
    return collection;
  }, new Map());
  const turns = (turnRows || []).map((turn) => toQrPairTurn(turn, assignmentsByTurn.get(turn.id) || []));
  const currentTurn = turns.find((turn) => turn.status === 'active') || turns.at(-1) || null;

  return { currentTurn, turns };
}

export async function fetchSessionDetails(sessionId, module) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    const detail = [error.code, error.message].filter(Boolean).join(' ');
    const sessionError = new Error(detail || 'Session not found.');
    sessionError.code = error.code;
    sessionError.status = error.status;
    throw sessionError;
  }

  const participants = await fetchSessionParticipants(sessionId);
  const session = toSession(data, participants, getQuestionIds(module, data.question_count));
  session.responses = await fetchSessionResponses(sessionId, participants);

  if (session.gameType === 'qr_pair_match') {
    session.qrPair = await fetchQrPairState(sessionId);
  }

  return session;
}

export async function fetchOpenStudentSession(studentId) {
  if (!studentId) {
    return null;
  }

  let { data, error } = await supabase
    .from('participants')
    .select(`
      id,
      session_id,
      status,
      joined_at,
      sessions:session_id (*)
    `)
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false });

  if (error && isMissingSchemaColumnError(error, ['status'])) {
    const fallbackResult = await supabase
      .from('participants')
      .select(`
        id,
        session_id,
        joined_at,
        sessions:session_id (*)
      `)
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false });

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const openParticipant = (data || []).find((participant) => {
    if (participant.status && participant.status !== 'active') {
      return false;
    }

    const joinedSession = Array.isArray(participant.sessions)
      ? participant.sessions[0]
      : participant.sessions;
    return joinedSession && joinedSession.status !== 'ended';
  });

  if (!openParticipant) {
    return null;
  }

  const sessionRow = Array.isArray(openParticipant.sessions)
    ? openParticipant.sessions[0]
    : openParticipant.sessions;
  const module = await fetchModuleWithQuestions(sessionRow.module_id);
  const session = await fetchSessionDetails(sessionRow.id, module);

  if (session.gameType === 'classic_mcq') {
    const participant = session.participants.find((item) => item.studentId === studentId);
    const studentLeftSession = session.responses.some(
      (response) =>
        response.participantId === participant?.participantId &&
        (response.responseStatus === 'left' || response.answer === 'LEFT_SESSION'),
    );

    if (studentLeftSession) {
      return null;
    }
  }

  return { module, session };
}

export async function fetchTeacherSessions(teacherId, modules = []) {
  if (!teacherId) {
    return [];
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const sessionRows = data || [];
  const participantsBySession = new Map();
  const responsesBySession = new Map();

  if (sessionRows.length) {
    const { data: participantRows, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .in(
        'session_id',
        sessionRows.map((session) => session.id),
      )
      .order('joined_at', { ascending: true });

    if (participantError) {
      throw new Error(participantError.message);
    }

    (participantRows || []).forEach((participant) => {
      const sessionParticipants = participantsBySession.get(participant.session_id) || [];
      sessionParticipants.push(toParticipant(participant));
      participantsBySession.set(participant.session_id, sessionParticipants);
    });

    const { data: responseRows, error: responseError } = await supabase
      .from('responses')
      .select('*')
      .in(
        'session_id',
        sessionRows.map((session) => session.id),
      )
      .order('submitted_at', { ascending: true });

    if (responseError) {
      throw new Error(responseError.message);
    }

    (responseRows || []).forEach((response) => {
      const sessionResponses = responsesBySession.get(response.session_id) || [];
      sessionResponses.push(response);
      responsesBySession.set(response.session_id, sessionResponses);
    });
  }

  const mappedSessions = sessionRows.map((session) => {
    const module = modules.find((item) => item.id === session.module_id);
    const participants = participantsBySession.get(session.id) || [];
    const mappedSession = toSession(
      session,
      participants,
      getQuestionIds(module, session.question_count),
    );
    mappedSession.responses = (responsesBySession.get(session.id) || []).map((response) =>
      toResponse(response, participants),
    );
    return mappedSession;
  });

  return Promise.all(
    mappedSessions.map(async (session) => {
      if (session.gameType !== 'qr_pair_match') {
        return session;
      }

      return {
        ...session,
        qrPair: await fetchQrPairState(session.id),
      };
    }),
  );
}

export async function cleanupStaleLobbySessions(teacherId, keepSessionId = null) {
  if (!teacherId) {
    return [];
  }

  const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from('sessions')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('status', 'lobby')
    .lt('created_at', staleBefore);

  if (keepSessionId) {
    query = query.neq('id', keepSessionId);
  }

  const { data: staleSessions, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const staleSessionIds = (staleSessions || []).map((session) => session.id);

  if (!staleSessionIds.length) {
    return [];
  }

  const { data: participantRows, error: participantError } = await supabase
    .from('participants')
    .select('session_id')
    .in('session_id', staleSessionIds);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const sessionIdsWithParticipants = new Set((participantRows || []).map((row) => row.session_id));
  const deletableSessionIds = staleSessionIds.filter((sessionId) => !sessionIdsWithParticipants.has(sessionId));

  if (!deletableSessionIds.length) {
    return [];
  }

  const { data: deletedRows, error: deleteError } = await supabase
    .from('sessions')
    .delete()
    .in('id', deletableSessionIds)
    .select('id');

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return (deletedRows || []).map((session) => session.id);
}

export async function joinDatabaseSession({ code, student, studentName }) {
  const normalizedCode = code.trim().toUpperCase();

  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_code', normalizedCode)
    .neq('status', 'ended')
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!sessionRow) {
    throw new Error('Session not found or already ended.');
  }

  const module = await fetchModuleWithQuestions(sessionRow.module_id);

  if (module.isLocked) {
    throw new Error('This module is locked by admin and cannot be joined.');
  }

  if (module.isDeleted) {
    throw new Error('This module has been deleted and cannot be joined.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('module_members')
    .select('id')
    .eq('module_id', module.id)
    .eq('student_id', student.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    if (module.visibility === 'public') {
      throw new Error('You need to join this public module first. Open Student Dashboard > Modules and click Join Module.');
    }

    throw new Error('This is a private module. Please request access from the teacher before joining this session.');
  }

  const { data: existingParticipant, error: existingError } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionRow.id)
    .eq('student_id', student.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existingParticipant) {
    const { error: insertError } = await supabase.from('participants').insert({
      session_id: sessionRow.id,
      student_id: student.id,
      student_name: studentName.trim() || student.name,
      score: 0,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const participants = await fetchSessionParticipants(sessionRow.id);

  return {
    module,
    session: toSession(
      sessionRow,
      participants,
      getQuestionIds(module, sessionRow.question_count),
    ),
  };
}

export async function leaveDatabaseSession({ sessionId, studentId }) {
  if (!sessionId || !studentId) {
    return;
  }

  const { data, error } = await supabase
    .from('participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    throw new Error('Unable to leave session. The participant record was not removed.');
  }
}

export async function markClassicParticipantLeft({ participant, session }) {
  if (!session?.id || session.gameType !== 'classic_mcq' || !participant?.participantId) {
    return;
  }

  const { error: participantError } = await supabase
    .from('participants')
    .update({
      status: 'left',
      left_at: new Date().toISOString(),
    })
    .eq('id', participant.participantId);

  if (participantError && !isMissingSchemaColumnError(participantError, ['status', 'left_at'])) {
    throw new Error(participantError.message);
  }

  const questionIds = session.questionIds || [];

  if (!questionIds.length) {
    return;
  }

  const { data: existingResponses, error: existingError } = await supabase
    .from('responses')
    .select('question_id')
    .eq('session_id', session.id)
    .eq('participant_id', participant.participantId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const answeredQuestionIds = new Set((existingResponses || []).map((response) => response.question_id));
  const missedQuestionIds = questionIds.filter((questionId) => !answeredQuestionIds.has(questionId));

  if (!missedQuestionIds.length) {
    return;
  }

  const responseRows = missedQuestionIds.map((questionId) => ({
    session_id: session.id,
    participant_id: participant.participantId,
    question_id: questionId,
    submitted_answer: 'LEFT_SESSION',
    is_correct: false,
    score_awarded: 0,
    answered_seconds: null,
    response_status: 'left',
  }));

  const { error: insertError } = await supabase.from('responses').insert(responseRows);

  if (insertError && isResponseStatusConstraintError(insertError)) {
    const fallbackRows = responseRows.map((row) => ({
      ...row,
      response_status: 'timeout',
    }));
    const { error: fallbackInsertError } = await supabase.from('responses').insert(fallbackRows);

    if (fallbackInsertError && fallbackInsertError.code !== '23505') {
      throw new Error(fallbackInsertError.message);
    }

    return;
  }

  if (insertError && insertError.code !== '23505') {
    throw new Error(insertError.message);
  }
}

export async function markClassicParticipantActive({ participant }) {
  if (!participant?.participantId) {
    return;
  }

  const { error } = await supabase
    .from('participants')
    .update({
      status: 'active',
      left_at: null,
    })
    .eq('id', participant.participantId);

  if (error && !isMissingSchemaColumnError(error, ['status', 'left_at'])) {
    throw new Error(error.message);
  }
}

export async function markClassicParticipantKicked({ participant }) {
  if (!participant?.participantId) {
    return;
  }

  const { error } = await supabase
    .from('participants')
    .update({
      status: 'kicked',
      left_at: new Date().toISOString(),
    })
    .eq('id', participant.participantId);

  if (error && !isMissingSchemaColumnError(error, ['status', 'left_at'])) {
    throw new Error(error.message);
  }
}

export async function markClassicParticipantLeftLegacy({ participant, session }) {
  if (!session?.id || session.gameType !== 'classic_mcq' || !participant?.participantId) {
    return;
  }

  const questionIds = session.questionIds || [];

  if (!questionIds.length) {
    return;
  }

  const { data: existingResponses, error: existingError } = await supabase
    .from('responses')
    .select('question_id')
    .eq('session_id', session.id)
    .eq('participant_id', participant.participantId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const answeredQuestionIds = new Set((existingResponses || []).map((response) => response.question_id));
  const missedQuestionIds = questionIds.filter((questionId) => !answeredQuestionIds.has(questionId));

  if (!missedQuestionIds.length) {
    return;
  }

  const { error: insertError } = await supabase.from('responses').insert(
    missedQuestionIds.map((questionId) => ({
      session_id: session.id,
      participant_id: participant.participantId,
      question_id: questionId,
      submitted_answer: 'LEFT_SESSION',
      is_correct: false,
      score_awarded: 0,
      answered_seconds: null,
      response_status: 'timeout',
    })),
  );

  if (insertError && insertError.code !== '23505') {
    throw new Error(insertError.message);
  }
}

export async function deleteDatabaseSession(sessionId) {
  if (!sessionId) {
    return;
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function checkSessionJoinAccess({ code, student }) {
  const normalizedCode = code.trim().toUpperCase();

  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_code', normalizedCode)
    .neq('status', 'ended')
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!sessionRow) {
    throw new Error('Session not found or already ended.');
  }

  const module = await fetchModuleWithQuestions(sessionRow.module_id);

  if (module.isLocked) {
    throw new Error('This module is locked by admin and cannot be joined.');
  }

  if (module.isDeleted) {
    throw new Error('This module has been deleted and cannot be joined.');
  }

  const [{ data: membership, error: membershipError }, { data: request, error: requestError }] =
    await Promise.all([
      supabase
        .from('module_members')
        .select('id')
        .eq('module_id', module.id)
        .eq('student_id', student.id)
        .maybeSingle(),
      supabase
        .from('module_join_requests')
        .select('*')
        .eq('module_id', module.id)
        .eq('student_id', student.id)
        .maybeSingle(),
    ]);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (requestError) {
    throw new Error(requestError.message);
  }

  return {
    access: membership
      ? 'joined'
      : module.visibility === 'public'
        ? 'public_not_joined'
        : 'private_not_joined',
    module,
    request,
    session: toSession(
      sessionRow,
      [],
      getQuestionIds(module, sessionRow.question_count),
    ),
  };
}

export async function updateDatabaseSessionStatus(sessionId, status, currentQuestionIndex = 0) {
  const payload = {
    status,
    current_question_index: currentQuestionIndex,
  };

  if (status === 'ended') {
    payload.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(payload)
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function pauseDatabaseSession(sessionId, currentQuestionIndex = 0) {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'paused',
      current_question_index: currentQuestionIndex,
      paused_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'live')
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function resumeDatabaseSession(sessionId, currentQuestionIndex = 0) {
  const { data: currentSession, error: fetchError } = await supabase
    .from('sessions')
    .select('paused_at, total_paused_seconds')
    .eq('id', sessionId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const pausedSeconds = currentSession?.paused_at
    ? Math.max(
        Math.floor((Date.now() - new Date(currentSession.paused_at).getTime()) / 1000),
        0,
      )
    : 0;

  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'live',
      current_question_index: currentQuestionIndex,
      paused_at: null,
      total_paused_seconds: (currentSession?.total_paused_seconds || 0) + pausedSeconds,
    })
    .eq('id', sessionId)
    .eq('status', 'paused')
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (pausedSeconds > 0) {
    const { data: activeTurn } = await supabase
      .from('qr_pair_turns')
      .select('id, started_at')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .order('turn_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeTurn?.started_at) {
      await supabase
        .from('qr_pair_turns')
        .update({
          started_at: new Date(
            new Date(activeTurn.started_at).getTime() + pausedSeconds * 1000,
          ).toISOString(),
        })
        .eq('id', activeTurn.id);
    }
  }

  return data;
}

function shuffleItems(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item);
}

function makeAnswerToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function calculateQrPairScore({ elapsedSeconds, roundSeconds, wrongScanCount }) {
  if (elapsedSeconds >= roundSeconds) {
    return 0;
  }

  const baseScore = 10;
  const elapsedRatio = elapsedSeconds / roundSeconds;
  const fastBonus = elapsedRatio <= 0.15 ? 2 : 0;
  const wrongPenalty = Math.min(wrongScanCount, 4);
  const timePenalty = elapsedRatio <= 0.2
    ? 0
    : Math.min(Math.ceil(((elapsedRatio - 0.2) / 0.8) * 4), 4);

  return Math.max(baseScore + fastBonus - wrongPenalty - timePenalty, 0);
}

function calculateClassicMcqScore({ elapsedSeconds, isCorrect, roundSeconds, timerEnabled }) {
  if (!isCorrect) {
    return 0;
  }

  if (!timerEnabled) {
    return 10;
  }

  if (elapsedSeconds >= roundSeconds) {
    return 0;
  }

  const baseScore = 10;
  const elapsedRatio = elapsedSeconds / roundSeconds;
  const fastBonus = elapsedRatio <= 0.15 ? 2 : 0;
  const timePenalty = elapsedRatio <= 0.2
    ? 0
    : Math.min(Math.ceil(((elapsedRatio - 0.2) / 0.8) * 6), 6);

  return Math.max(baseScore + fastBonus - timePenalty, 4);
}

export async function submitClassicMcqAnswer({
  answer,
  elapsedSeconds = 0,
  isTimeout = false,
  participant,
  question,
  session,
}) {
  if (!session?.id || !participant?.participantId || !question?.id) {
    throw new Error('Unable to submit this answer.');
  }

  const { data: existingResponse, error: existingError } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', session.id)
    .eq('participant_id', participant.participantId)
    .eq('question_id', question.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingResponse) {
    return {
      response: toResponse(existingResponse, [participant]),
      alreadyAnswered: true,
    };
  }

  const selectedOption = String(answer || '').trim().toUpperCase();
  const isCorrect = !isTimeout && selectedOption === question.correctOption;
  const responseStatus = isTimeout ? 'timeout' : isCorrect ? 'correct' : 'wrong';
  const scoreAwarded = calculateClassicMcqScore({
    elapsedSeconds,
    isCorrect,
    roundSeconds: session.roundSeconds || 60,
    timerEnabled: session.timerEnabled,
  });
  const optionText = question.options?.find((option) => option.key === selectedOption)?.text || selectedOption;

  const { data: insertedResponse, error: insertError } = await supabase
    .from('responses')
    .insert({
      session_id: session.id,
      participant_id: participant.participantId,
      question_id: question.id,
      submitted_answer: isTimeout ? 'TIMEOUT' : optionText,
      is_correct: isCorrect,
      score_awarded: scoreAwarded,
      answered_seconds: session.timerEnabled ? elapsedSeconds : null,
      response_status: responseStatus,
    })
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return submitClassicMcqAnswer({
        answer,
        elapsedSeconds,
        isTimeout,
        participant,
        question,
        session,
      });
    }

    throw new Error(insertError.message);
  }

  const nextScore = (participant.score || 0) + scoreAwarded;
  const { error: scoreError } = await supabase
    .from('participants')
    .update({ score: nextScore })
    .eq('id', participant.participantId);

  if (scoreError) {
    throw new Error(scoreError.message);
  }

  return {
    response: toResponse(insertedResponse, [participant]),
    scoreAwarded,
    isCorrect,
    responseStatus,
    alreadyAnswered: false,
  };
}

export async function endClassicSessionIfAllCompleted(session) {
  if (!session?.id || session.gameType !== 'classic_mcq' || session.status !== 'live') {
    return null;
  }

  const questionIds = session.questionIds || [];
  const activeParticipants = (session.participants || []).filter(
    (participant) => (participant.status || 'active') === 'active',
  );
  const participantIds = activeParticipants.map((participant) => participant.participantId);

  if (!questionIds.length) {
    return null;
  }

  if (!participantIds.length) {
    return updateDatabaseSessionStatus(session.id, 'ended', session.currentQuestionIndex || 0);
  }

  const { data, error } = await supabase
    .from('responses')
    .select('participant_id, question_id')
    .eq('session_id', session.id)
    .in('participant_id', participantIds)
    .in('question_id', questionIds);

  if (error) {
    throw new Error(error.message);
  }

  const answeredByParticipant = (data || []).reduce((collection, response) => {
    const answeredQuestions = collection.get(response.participant_id) || new Set();
    answeredQuestions.add(response.question_id);
    collection.set(response.participant_id, answeredQuestions);
    return collection;
  }, new Map());

  const allCompleted = participantIds.every((participantId) => {
    const answeredQuestions = answeredByParticipant.get(participantId) || new Set();
    return questionIds.every((questionId) => answeredQuestions.has(questionId));
  });

  if (!allCompleted) {
    return null;
  }

  return updateDatabaseSessionStatus(session.id, 'ended', session.currentQuestionIndex || 0);
}

function getCompletedQuestionMap(assignments) {
  return assignments.reduce((collection, assignment) => {
    if ((assignment.assignment_type || 'pair') !== 'pair') {
      return collection;
    }

    if (assignment.status !== 'correct' && assignment.status !== 'timeout') {
      return collection;
    }

    const completedQuestions = collection.get(assignment.question_holder_participant_id) || new Set();
    completedQuestions.add(assignment.question_id);
    collection.set(assignment.question_holder_participant_id, completedQuestions);
    return collection;
  }, new Map());
}

async function fetchAllQrPairAssignments(sessionId) {
  const { data, error } = await supabase
    .from('qr_pair_assignments')
    .select('*')
    .eq('session_id', sessionId)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function getNextTurnNumber(sessionId) {
  const { data, error } = await supabase
    .from('qr_pair_turns')
    .select('turn_number')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0]?.turn_number || 0) + 1;
}

export async function createNextQrPairTurn({ session, participants }) {
  const questionIds = session.questionIds || [];
  const allAssignments = await fetchAllQrPairAssignments(session.id);
  const completedQuestionMap = getCompletedQuestionMap(allAssignments);
  const isOddStudentCount = participants.length % 2 !== 0;
  const participantsWithRemaining = participants
    .map((participant) => {
      const completedQuestions = completedQuestionMap.get(participant.participantId) || new Set();
      const remainingQuestionIds = questionIds.filter((questionId) => !completedQuestions.has(questionId));
      return { ...participant, remainingQuestionIds };
    })
    .filter((participant) => participant.remainingQuestionIds.length > 0);

  if (participantsWithRemaining.length === 0) {
    await updateDatabaseSessionStatus(session.id, 'ended', session.currentQuestionIndex);
    return null;
  }

  const maxQuestionHoldersByStudents = Math.floor(participants.length / 2);
  const maxQuestionHoldersByQuestions = isOddStudentCount
    ? Math.max(questionIds.length - 1, 1)
    : questionIds.length;
  const questionHolderCount = Math.min(
    maxQuestionHoldersByStudents,
    maxQuestionHoldersByQuestions,
    participantsWithRemaining.length,
  );
  const questionHolders = shuffleItems(participantsWithRemaining)
    .sort((left, right) => right.remainingQuestionIds.length - left.remainingQuestionIds.length)
    .slice(0, questionHolderCount);
  const questionHolderIds = new Set(questionHolders.map((participant) => participant.participantId));
  const answerHolders = shuffleItems(
    participants.filter((participant) => !questionHolderIds.has(participant.participantId)),
  );
  const correctAnswerHolders = answerHolders.slice(0, questionHolders.length);
  const decoyAnswerHolders = answerHolders.slice(questionHolders.length);

  const turnNumber = await getNextTurnNumber(session.id);
  const { data: turn, error: turnError } = await supabase
    .from('qr_pair_turns')
    .insert({
      session_id: session.id,
      turn_number: turnNumber,
      status: 'active',
      started_at: new Date(Date.now() + (turnNumber === 1 ? 3000 : 0)).toISOString(),
    })
    .select('*')
    .single();

  if (turnError) {
    throw new Error(turnError.message);
  }

  const usedQuestionIds = new Set();
  const pairPlan = questionHolders.map((questionHolder, index) => {
    const uniqueRemainingQuestionIds = questionHolder.remainingQuestionIds.filter(
      (questionId) => !usedQuestionIds.has(questionId),
    );
    const questionId = shuffleItems(uniqueRemainingQuestionIds.length
      ? uniqueRemainingQuestionIds
      : questionHolder.remainingQuestionIds)[0];

    usedQuestionIds.add(questionId);

    return {
      session_id: session.id,
      turn_id: turn.id,
      question_id: questionId,
      question_holder_participant_id: questionHolder.participantId,
      answer_holder_participant_id: correctAnswerHolders[index].participantId,
      answer_qr_token: makeAnswerToken(),
      assignment_type: 'pair',
      status: 'pending',
    };
  });

  const { data: pairAssignments, error: assignmentError } = await supabase
    .from('qr_pair_assignments')
    .insert(pairPlan)
    .select('*');

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  let decoyAssignments = [];
  const decoyQuestionIds = questionIds.filter((questionId) => !usedQuestionIds.has(questionId));

  if (decoyAnswerHolders.length && decoyQuestionIds.length && pairAssignments?.length) {
    const decoyRows = decoyAnswerHolders.map((answerHolder, index) => {
      const targetPair = pairAssignments[index % pairAssignments.length];

      return {
        session_id: session.id,
        turn_id: turn.id,
        question_id: shuffleItems(decoyQuestionIds)[0],
        question_holder_participant_id: targetPair.question_holder_participant_id,
        answer_holder_participant_id: answerHolder.participantId,
        answer_qr_token: makeAnswerToken(),
        assignment_type: 'decoy',
        decoy_for_assignment_id: targetPair.id,
        status: 'pending',
      };
    });

    const { data, error } = await supabase
      .from('qr_pair_assignments')
      .insert(decoyRows)
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    decoyAssignments = data || [];
  }

  await updateDatabaseSessionStatus(session.id, 'live', turnNumber - 1);

  return toQrPairTurn(turn, [...(pairAssignments || []), ...decoyAssignments]);
}

export async function startQrPairSession(session) {
  const participants = await fetchSessionParticipants(session.id);

  if (participants.length < 2) {
    throw new Error('QR Pair Match requires at least 2 students.');
  }

  if ((session.questionIds || []).length < 2) {
    throw new Error('QR Pair Match requires at least 2 questions.');
  }

  const maxStudents = (session.questionIds || []).length * 2;

  if (participants.length > maxStudents) {
    throw new Error(`QR Pair Match supports up to ${maxStudents} students for ${session.questionIds.length} selected questions.`);
  }

  await updateDatabaseSessionStatus(session.id, 'live', 0);
  await createNextQrPairTurn({ session: { ...session, status: 'live' }, participants });
}

async function fetchCurrentQrPairTurn(sessionId) {
  const { data: turn, error } = await supabase
    .from('qr_pair_turns')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .order('turn_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return turn;
}

export async function submitQrPairScan({ sessionId, questionHolderParticipantId, token }) {
  const currentTurn = await fetchCurrentQrPairTurn(sessionId);

  if (!currentTurn) {
    throw new Error('No active QR pair turn found.');
  }

  const { data: assignment, error } = await supabase
    .from('qr_pair_assignments')
    .select('*')
    .eq('turn_id', currentTurn.id)
    .eq('question_holder_participant_id', questionHolderParticipantId)
    .eq('assignment_type', 'pair')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!assignment || assignment.status !== 'pending') {
    throw new Error('This round has already been completed.');
  }

  if (assignment.answer_qr_token !== token) {
    const { error: updateError } = await supabase
      .from('qr_pair_assignments')
      .update({ wrong_scan_count: assignment.wrong_scan_count + 1 })
      .eq('id', assignment.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { correct: false };
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('round_seconds')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const completedAt = new Date();
  const elapsedSeconds = Math.max(
    Math.floor((completedAt.getTime() - new Date(currentTurn.started_at).getTime()) / 1000),
    0,
  );
  const scoreAwarded = calculateQrPairScore({
    elapsedSeconds,
    roundSeconds: sessionRow.round_seconds || 60,
    wrongScanCount: assignment.wrong_scan_count || 0,
  });

  const { error: assignmentError } = await supabase
    .from('qr_pair_assignments')
    .update({
      status: 'correct',
      completed_at: completedAt.toISOString(),
      score_awarded: scoreAwarded,
      answered_seconds: elapsedSeconds,
    })
    .eq('id', assignment.id);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('score')
    .eq('id', questionHolderParticipantId)
    .single();

  if (participantError) {
    throw new Error(participantError.message);
  }

  const { error: scoreError } = await supabase
    .from('participants')
    .update({ score: (participant.score || 0) + scoreAwarded })
    .eq('id', questionHolderParticipantId);

  if (scoreError) {
    throw new Error(scoreError.message);
  }

  return { correct: true, scoreAwarded };
}

export async function markQrPairTimeout({ assignmentId }) {
  const { error } = await supabase
    .from('qr_pair_assignments')
    .update({ status: 'timeout', completed_at: new Date().toISOString(), score_awarded: 0 })
    .eq('id', assignmentId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message);
  }
}

export async function markQrPairReady({ session, participantId }) {
  const currentTurn = await fetchCurrentQrPairTurn(session.id);

  if (!currentTurn) {
    return;
  }

  const { data: assignmentRows, error } = await supabase
    .from('qr_pair_assignments')
    .select('*')
    .eq('turn_id', currentTurn.id);

  if (error) {
    throw new Error(error.message);
  }

  const assignment = (assignmentRows || []).find(
    (item) =>
      ((item.assignment_type || 'pair') === 'pair' && item.question_holder_participant_id === participantId) ||
      item.answer_holder_participant_id === participantId,
  );

  if (!assignment) {
    throw new Error('No assignment found for this student.');
  }

  const readyPayload = (assignment.assignment_type || 'pair') === 'pair' &&
    assignment.question_holder_participant_id === participantId
    ? { question_holder_ready: true }
    : { answer_holder_ready: true };

  const { error: readyError } = await supabase
    .from('qr_pair_assignments')
    .update(readyPayload)
    .eq('id', assignment.id);

  if (readyError) {
    throw new Error(readyError.message);
  }

  const { data: updatedRows, error: updatedError } = await supabase
    .from('qr_pair_assignments')
    .select('*')
    .eq('turn_id', currentTurn.id);

  if (updatedError) {
    throw new Error(updatedError.message);
  }

  const pairRows = (updatedRows || []).filter((item) => (item.assignment_type || 'pair') === 'pair');
  const decoyRows = (updatedRows || []).filter((item) => item.assignment_type === 'decoy');
  const allPairsDone = pairRows.every((item) => item.status !== 'pending');
  const allStudentsReady = pairRows.every(
    (item) => item.question_holder_ready && item.answer_holder_ready,
  ) && decoyRows.every(
    (item) => item.answer_holder_ready,
  );

  if (!allPairsDone || !allStudentsReady) {
    return;
  }

  const { data: completedTurnRows, error: turnError } = await supabase
    .from('qr_pair_turns')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', currentTurn.id)
    .eq('status', 'active')
    .select('*');

  if (turnError) {
    throw new Error(turnError.message);
  }

  if (!completedTurnRows?.length) {
    return;
  }

  const participants = await fetchSessionParticipants(session.id);
  await createNextQrPairTurn({ session, participants });
}
