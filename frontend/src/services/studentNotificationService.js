import { supabase } from './supabaseClient.js';

function getGameTypeLabel(gameType) {
  return gameType === 'qr_pair_match' ? 'QR Pair Match' : 'Classic MCQ';
}

function toNotification(session, module, teacher) {
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
    teacherName: teacher?.name || 'Teacher',
    createdAt: session.created_at,
    message: `${teacher?.name || 'Teacher'} opened a ${getGameTypeLabel(session.game_type)} session for ${module?.title || 'your module'}.`,
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

  return sessions
    .filter((session) => modulesById.has(session.module_id))
    .map((session) => {
      const module = modulesById.get(session.module_id);
      return toNotification(session, module, teachersById.get(module?.teacher_id));
    });
}
