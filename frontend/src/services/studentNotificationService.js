import { supabase } from './supabaseClient.js';

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function getTopicText(topics = []) {
  if (!topics.length) {
    return 'Unassigned';
  }

  return topics
    .map((topic) => topic.title || 'Unassigned')
    .filter(Boolean)
    .join(', ');
}

function toNotification(session, module, teacher, topics = []) {
  return {
    id: session.id,
    type: 'session_opened',
    sessionId: session.id,
    sessionCode: session.session_code,
    sessionStatus: session.status,
    gameType: session.game_type || 'classic_mcq',
    gameTypeLabel: getGameTypeLabel(session.game_type),
    moduleId: module?.id,
    moduleCode: module?.module_code || '-',
    moduleTitle: module?.title || 'Learning Module',
    topicTitle: getTopicText(topics),
    topics,
    teacherName: teacher?.name || 'Teacher',
    createdAt: session.created_at,
  };
}

export async function fetchStudentSessionNotifications(studentId) {
  if (!studentId) {
    return [];
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('module_members')
    .select('module_id')
    .eq('student_id', studentId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const moduleIds = [...new Set((memberships || []).map((membership) => membership.module_id).filter(Boolean))];

  if (!moduleIds.length) {
    return [];
  }

  const [sessionsResult, modulesResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('*')
      .in('module_id', moduleIds)
      .in('status', ['lobby'])
      .order('created_at', { ascending: false }),
    supabase
      .from('modules')
      .select('id, module_code, title, teacher_id, is_locked, is_deleted')
      .in('id', moduleIds),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (modulesResult.error) {
    throw new Error(modulesResult.error.message);
  }

  const sessions = sessionsResult.data || [];
  const modules = modulesResult.data || [];
  const visibleModules = modules.filter((module) => !module.is_deleted && !module.is_locked);
  const modulesById = visibleModules.reduce((collection, module) => {
    collection.set(module.id, module);
    return collection;
  }, new Map());
  const teacherIds = [...new Set(visibleModules.map((module) => module.teacher_id).filter(Boolean))];

  const teachersResult = teacherIds.length
    ? await supabase.from('teachers').select('id, name').in('id', teacherIds)
    : { data: [], error: null };

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  const teachersById = (teachersResult.data || []).reduce((collection, teacher) => {
    collection.set(teacher.id, teacher);
    return collection;
  }, new Map());

  const selectedQuestionIds = [
    ...new Set(
      sessions
        .flatMap((session) => (Array.isArray(session.question_ids) ? session.question_ids : []))
        .map((questionId) => Number(questionId))
        .filter(Boolean),
    ),
  ];

  const questionsResult = selectedQuestionIds.length
    ? await supabase
        .from('questions')
        .select('id, chapter_id')
        .in('id', selectedQuestionIds)
    : { data: [], error: null };

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  const questionsById = (questionsResult.data || []).reduce((collection, question) => {
    collection.set(Number(question.id), question);
    return collection;
  }, new Map());

  const chapterIds = [
    ...new Set(
      (questionsResult.data || [])
        .map((question) => Number(question.chapter_id))
        .filter(Boolean),
    ),
  ];

  const chaptersResult = chapterIds.length
    ? await supabase
        .from('chapters')
        .select('id, chapter_code, title')
        .in('id', chapterIds)
    : { data: [], error: null };

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }

  const chaptersById = (chaptersResult.data || []).reduce((collection, chapter) => {
    collection.set(Number(chapter.id), {
      id: chapter.id,
      code: chapter.chapter_code,
      title: chapter.title,
    });
    return collection;
  }, new Map());

  const topicsBySessionId = sessions.reduce((collection, session) => {
    const topicMap = new Map();

    (Array.isArray(session.question_ids) ? session.question_ids : []).forEach((questionId) => {
      const question = questionsById.get(Number(questionId));
      const chapter = question?.chapter_id ? chaptersById.get(Number(question.chapter_id)) : null;
      const topicKey = chapter?.id || 'unassigned';

      if (!topicMap.has(topicKey)) {
        topicMap.set(topicKey, chapter || { id: null, code: 'UNASSIGNED', title: 'Unassigned' });
      }
    });

    collection.set(session.id, [...topicMap.values()]);
    return collection;
  }, new Map());

  return sessions
    .filter((session) => modulesById.has(session.module_id))
    .map((session) => {
      const module = modulesById.get(session.module_id);
      return toNotification(
        session,
        module,
        teachersById.get(module?.teacher_id),
        topicsBySessionId.get(session.id) || [],
      );
    });
}
