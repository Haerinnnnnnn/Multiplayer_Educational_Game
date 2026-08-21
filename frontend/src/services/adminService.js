import { supabase } from './supabaseClient.js';
import { backendUrl } from './apiConfig.js';
import { toChapter } from './chapterService.js';
import { toQuestion } from './questionService.js';
import { getLatestReviewByModule } from './moduleReviewService.js';

function toStudentUser(student) {
  return {
    id: student.id,
    userCode: student.student_code,
    role: 'student',
    name: student.name,
    email: student.email,
    birthday: student.birthday,
    schoolName: student.school_name,
    grade: student.grade,
    course: student.course,
    level: student.level || 1,
    totalExp: student.total_exp || 0,
    presenceStatus: student.presence_status || 'offline',
    lastSeenAt: student.last_seen_at,
    createdAt: student.created_at,
  };
}

function toTeacherUser(teacher) {
  return {
    id: teacher.id,
    userCode: teacher.teacher_code,
    role: 'teacher',
    name: teacher.name,
    email: teacher.email,
    birthday: teacher.birthday,
    schoolName: teacher.school_name,
    grade: '-',
    course: '-',
    presenceStatus: teacher.presence_status || 'offline',
    lastSeenAt: teacher.last_seen_at,
    createdAt: teacher.created_at,
  };
}

function toAdminModule(module, teacher, questions = [], latestReviewRequest = null, chapters = []) {
  return {
    id: module.id,
    moduleCode: module.module_code,
    title: module.title,
    description: module.description || 'No description yet.',
    visibility: module.visibility || 'private',
    teacherId: module.teacher_id,
    teacherCode: teacher?.teacher_code || '-',
    teacherName: teacher?.name || 'Unknown teacher',
    teacherEmail: teacher?.email || '-',
    questions,
    questionCount: questions.length,
    chapters,
    topicCount: chapters.filter((chapter) => !chapter.isDeleted).length,
    deletedTopicCount: chapters.filter((chapter) => chapter.isDeleted).length,
    latestReviewRequest,
    isLocked: Boolean(module.is_locked),
    isDeleted: Boolean(module.is_deleted),
    deletedAt: module.deleted_at,
    deletedBy: module.deleted_by,
    lockedAt: module.locked_at,
    lockedBy: module.locked_by,
    createdAt: module.created_at,
    updatedAt: module.updated_at,
  };
}

export async function fetchAdminUsers() {
  const [studentsResult, teachersResult] = await Promise.all([
    supabase.from('students').select('*').order('created_at', { ascending: false }),
    supabase.from('teachers').select('*').order('created_at', { ascending: false }),
  ]);

  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return [
    ...(studentsResult.data || []).map(toStudentUser),
    ...(teachersResult.data || []).map(toTeacherUser),
  ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function fetchAdminModules() {
  const [modulesResult, teachersResult, questionsResult, chaptersResult, reviewsResult] = await Promise.all([
    supabase.from('modules').select('*').order('created_at', { ascending: false }),
    supabase.from('teachers').select('id, teacher_code, name, email'),
    supabase.from('questions').select('*').order('created_at', { ascending: false }),
    supabase
      .from('chapters')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('module_review_requests').select('*').order('submitted_at', { ascending: false }),
  ]);

  if (modulesResult.error) {
    throw new Error(modulesResult.error.message);
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }

  if (reviewsResult.error) {
    throw new Error(reviewsResult.error.message);
  }

  const teachersById = (teachersResult.data || []).reduce((collection, teacher) => {
    collection.set(teacher.id, teacher);
    return collection;
  }, new Map());

  const questionCountsByChapter = (questionsResult.data || []).reduce((collection, question) => {
    if (question.chapter_id) {
      collection.set(question.chapter_id, (collection.get(question.chapter_id) || 0) + 1);
    }

    return collection;
  }, new Map());

  const chaptersById = (chaptersResult.data || []).reduce((collection, chapter) => {
    collection.set(chapter.id, toChapter(chapter, questionCountsByChapter.get(chapter.id) || 0));
    return collection;
  }, new Map());

  const chaptersByModule = (chaptersResult.data || []).reduce((collection, chapter) => {
    const currentChapters = collection.get(chapter.module_id) || [];
    currentChapters.push(toChapter(chapter, questionCountsByChapter.get(chapter.id) || 0));
    collection.set(chapter.module_id, currentChapters);
    return collection;
  }, new Map());

  const questionsByModule = (questionsResult.data || []).reduce((collection, question) => {
    const currentQuestions = collection.get(question.module_id) || [];
    collection.set(question.module_id, [...currentQuestions, toQuestion(question, chaptersById.get(question.chapter_id) || null)]);
    return collection;
  }, new Map());
  const latestReviewByModule = getLatestReviewByModule(reviewsResult.data || []);

  return (modulesResult.data || []).map((module) =>
    toAdminModule(
      module,
      teachersById.get(module.teacher_id),
      questionsByModule.get(module.id) || [],
      latestReviewByModule.get(module.id) || null,
      chaptersByModule.get(module.id) || [],
    ),
  );
}

function getSessionQuestionTotal(session) {
  const selectedQuestionIds = Array.isArray(session.question_ids) ? session.question_ids : [];
  return selectedQuestionIds.length || session.question_count || 0;
}

function getSessionTopicInfo(session, questionsById) {
  const selectedQuestionIds = Array.isArray(session.question_ids) ? session.question_ids : [];
  const topicMap = selectedQuestionIds.reduce((collection, questionId) => {
    const question = questionsById.get(Number(questionId));
    const topicKey = question?.chapterId || 'unassigned';

    if (!collection.has(topicKey)) {
      collection.set(topicKey, {
        id: question?.chapterId || null,
        code: question?.chapterCode || (question?.chapterId ? null : 'UNASSIGNED'),
        title: question?.chapterTitle || 'Unassigned',
      });
    }

    return collection;
  }, new Map());
  const topics = [...topicMap.values()];

  return {
    topicCode: topics.length === 1 ? topics[0].code : '',
    topicTitle: topics.length === 0 ? '-' : topics.map((topic) => topic.title).join(', '),
    topics,
  };
}

function toModuleSessionInfo(session, participantCount, roundCount, questionsById = new Map()) {
  const topicInfo = getSessionTopicInfo(session, questionsById);

  return {
    id: session.id,
    code: session.session_code,
    status: session.status,
    topicCode: topicInfo.topicCode,
    topicTitle: topicInfo.topicTitle,
    topics: topicInfo.topics,
    gameType: session.game_type || 'classic_mcq',
    questionCount: getSessionQuestionTotal(session),
    questionSelectionMode: session.question_selection_mode || 'random',
    roundSeconds: session.round_seconds || 60,
    wrongScanPenaltySeconds: session.wrong_scan_penalty_seconds || 10,
    participantCount,
    roundCount: session.game_type === 'qr_pair_match' ? roundCount : getSessionQuestionTotal(session),
    createdAt: session.created_at,
    endedAt: session.ended_at,
  };
}

export async function fetchAdminSessions() {
  const [sessionsResult, modulesResult, teachersResult, questionsResult, chaptersResult] = await Promise.all([
    supabase.from('sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('modules').select('id, module_code, title, teacher_id'),
    supabase.from('teachers').select('id, teacher_code, name, email'),
    supabase.from('questions').select('*'),
    supabase.from('chapters').select('*'),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (modulesResult.error) {
    throw new Error(modulesResult.error.message);
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }

  const sessionRows = sessionsResult.data || [];
  const sessionIds = sessionRows.map((session) => session.id);
  const [participantsResult, turnsResult] = sessionIds.length
    ? await Promise.all([
        supabase.from('participants').select('id, session_id').in('session_id', sessionIds),
        supabase.from('qr_pair_turns').select('id, session_id').in('session_id', sessionIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (participantsResult.error) {
    throw new Error(participantsResult.error.message);
  }

  if (turnsResult.error) {
    throw new Error(turnsResult.error.message);
  }

  const modulesById = (modulesResult.data || []).reduce((collection, module) => {
    collection.set(module.id, module);
    return collection;
  }, new Map());
  const teachersById = (teachersResult.data || []).reduce((collection, teacher) => {
    collection.set(teacher.id, teacher);
    return collection;
  }, new Map());
  const chaptersById = (chaptersResult.data || []).reduce((collection, chapter) => {
    collection.set(chapter.id, toChapter(chapter));
    return collection;
  }, new Map());
  const questionsById = (questionsResult.data || []).reduce((collection, question) => {
    collection.set(question.id, toQuestion(question, chaptersById.get(question.chapter_id) || null));
    return collection;
  }, new Map());
  const participantCountBySession = (participantsResult.data || []).reduce((collection, participant) => {
    collection.set(participant.session_id, (collection.get(participant.session_id) || 0) + 1);
    return collection;
  }, new Map());
  const roundCountBySession = (turnsResult.data || []).reduce((collection, turn) => {
    collection.set(turn.session_id, (collection.get(turn.session_id) || 0) + 1);
    return collection;
  }, new Map());

  return sessionRows.map((session) => {
    const module = modulesById.get(session.module_id);
    const teacher = teachersById.get(session.teacher_id || module?.teacher_id);
    const sessionInfo = toModuleSessionInfo(
      session,
      participantCountBySession.get(session.id) || 0,
      roundCountBySession.get(session.id) || 0,
      questionsById,
    );

    return {
      ...sessionInfo,
      moduleId: session.module_id,
      moduleCode: module?.module_code || '-',
      moduleTitle: module?.title || 'Deleted or unknown module',
      teacherId: session.teacher_id,
      teacherCode: teacher?.teacher_code || '-',
      teacherName: teacher?.name || 'Unknown teacher',
      teacherEmail: teacher?.email || '-',
    };
  });
}

export async function fetchAdminModuleInfo(module) {
  if (!module?.id) {
    throw new Error('Module not found.');
  }

  const [studentsResult, sessionsResult] = await Promise.all([
    supabase.rpc('get_module_student_access', {
      target_module_id: Number(module.id),
    }),
    supabase
      .from('sessions')
      .select('*')
      .eq('module_id', module.id)
      .order('created_at', { ascending: false }),
  ]);

  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  const sessionRows = sessionsResult.data || [];
  const sessionIds = sessionRows.map((session) => session.id);

  const [participantsResult, turnsResult] = sessionIds.length
    ? await Promise.all([
        supabase.from('participants').select('id, session_id').in('session_id', sessionIds),
        supabase.from('qr_pair_turns').select('id, session_id').in('session_id', sessionIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (participantsResult.error) {
    throw new Error(participantsResult.error.message);
  }

  if (turnsResult.error) {
    throw new Error(turnsResult.error.message);
  }

  const participantCountBySession = (participantsResult.data || []).reduce((collection, participant) => {
    collection.set(participant.session_id, (collection.get(participant.session_id) || 0) + 1);
    return collection;
  }, new Map());

  const roundCountBySession = (turnsResult.data || []).reduce((collection, turn) => {
    collection.set(turn.session_id, (collection.get(turn.session_id) || 0) + 1);
    return collection;
  }, new Map());

  const joinedStudents = (studentsResult.data || [])
    .filter((student) => student.access_type === 'member' || student.status === 'joined')
    .map((student) => ({
      studentId: student.student_id,
      studentCode: student.student_code,
      name: student.name,
      email: student.email,
      schoolName: student.school_name,
      joinedAt: student.created_at,
    }));

  const sessionInfo = sessionRows.map((session) =>
    toModuleSessionInfo(
      session,
      participantCountBySession.get(session.id) || 0,
      roundCountBySession.get(session.id) || 0,
    ),
  );

  const gameTypeSummary = sessionInfo.reduce((collection, session) => {
    const currentSummary = collection[session.gameType] || {
      gameType: session.gameType,
      sessions: 0,
      rounds: 0,
    };

    collection[session.gameType] = {
      ...currentSummary,
      sessions: currentSummary.sessions + 1,
      rounds: currentSummary.rounds + session.roundCount,
    };

    return collection;
  }, {});

  const topics = (module.chapters || []).map((chapter) => ({
    ...chapter,
    questions: (module.questions || []).filter((question) => Number(question.chapterId) === Number(chapter.id)),
  }));
  const unassignedQuestions = (module.questions || []).filter((question) => !question.chapterId);

  if (unassignedQuestions.length) {
    topics.push({
      id: 'unassigned',
      chapterCode: 'UNASSIGNED',
      title: 'Questions Without Topic',
      description: 'Questions that are not linked to a topic yet.',
      isDeleted: false,
      questionCount: unassignedQuestions.length,
      questions: unassignedQuestions,
    });
  }

  return {
    module,
    teacher: {
      id: module.teacherId,
      code: module.teacherCode,
      name: module.teacherName,
      email: module.teacherEmail,
    },
    joinedStudents,
    sessions: sessionInfo,
    topics,
    gameTypeSummary: Object.values(gameTypeSummary),
    totals: {
      questions: module.questionCount || module.questions?.length || 0,
      topics: (module.chapters || []).filter((chapter) => !chapter.isDeleted).length,
      deletedTopics: (module.chapters || []).filter((chapter) => chapter.isDeleted).length,
      joinedStudents: joinedStudents.length,
      sessions: sessionInfo.length,
      rounds: sessionInfo.reduce((total, session) => total + session.roundCount, 0),
    },
  };
}

export async function updateAdminUser(user) {
  const table = user.role === 'student' ? 'students' : 'teachers';
  const payload = {
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    birthday: user.birthday,
    school_name: user.schoolName.trim(),
  };

  if (user.role === 'student') {
    payload.grade = user.grade.trim();
    payload.course = user.course.trim();
  }

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return user.role === 'student' ? toStudentUser(data) : toTeacherUser(data);
}

export async function createAdminUser(profile) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Admin session not found.');
  }

  const response = await fetch(`${backendUrl}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify(profile),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create user account.');
  }

  return result.user;
}

export async function deleteAdminUser(user) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Admin session not found.');
  }

  const response = await fetch(`${backendUrl}/api/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      email: user.email,
      role: user.role,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete user account.');
  }
}

export async function cleanupAdminUserEmail(email) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Admin session not found.');
  }

  const response = await fetch(`${backendUrl}/api/admin/users/by-email/cleanup`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      email,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Failed to clean up user email.');
  }

  return result;
}

export async function updateAdminModuleLock(moduleId, isLocked) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Admin session not found.');
  }

  const response = await fetch(`${backendUrl}/api/admin/modules/${moduleId}/lock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      isLocked,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update module lock.');
  }

  return result.module;
}

export async function reviewAdminModuleRequest({ requestId, decision, adminFeedback }) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Admin session not found.');
  }

  const response = await fetch(`${backendUrl}/api/admin/module-review-requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      decision,
      adminFeedback,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Failed to review module request.');
  }

  return result;
}
