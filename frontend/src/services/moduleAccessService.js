import { supabase } from './supabaseClient.js';

function toStudentAccess(row) {
  return {
    accessType: row.access_type,
    requestId: row.request_id,
    studentId: row.student_id,
    studentCode: row.student_code,
    name: row.name,
    email: row.email,
    schoolName: row.school_name,
    status: row.status,
    requestMessage: row.request_message,
    teacherResponse: row.teacher_response,
    createdAt: row.created_at,
  };
}

function toInviteCandidate(row) {
  return {
    studentId: row.student_id,
    studentCode: row.student_code,
    name: row.name,
    email: row.email,
    schoolName: row.school_name,
    grade: row.grade,
    course: row.course,
    isMember: Boolean(row.is_member),
    requestStatus: row.request_status || '',
  };
}

function toStudentModule(row, membershipMap, requestMap) {
  const membership = membershipMap.get(row.id);
  const request = requestMap.get(row.id);

  return {
    id: row.id,
    moduleCode: row.module_code,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description || 'No description yet.',
    visibility: row.visibility || 'private',
    isDeleted: Boolean(row.is_deleted),
    isLocked: Boolean(row.is_locked),
    memberStatus: membership ? 'joined' : 'not_joined',
    requestStatus: request?.status || '',
    requestMessage: request?.request_message || '',
    teacherResponse: request?.teacher_response || '',
    joinedAt: membership?.joined_at || null,
    createdAt: row.created_at,
  };
}

export async function fetchModuleStudentAccess(moduleId) {
  if (!moduleId) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_module_student_access', {
    target_module_id: Number(moduleId),
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(toStudentAccess);
}

export async function fetchModuleInviteCandidates(moduleId, searchText = '') {
  if (!moduleId) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_students_for_module_invite', {
    target_module_id: Number(moduleId),
    search_text: searchText.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(toInviteCandidate);
}

export async function inviteStudentToModule({ moduleId, searchText, teacherId }) {
  const { data: students, error: searchError } = await supabase.rpc('find_student_for_module_invite', {
    target_module_id: Number(moduleId),
    search_text: searchText.trim().toLowerCase(),
  });

  if (searchError) {
    throw new Error(searchError.message);
  }

  const student = students?.[0];

  if (!student) {
    throw new Error('Student not found. Use the student ID like S001 or the student email.');
  }

  const { error } = await supabase.from('module_members').insert({
    module_id: Number(moduleId),
    student_id: student.student_id,
    added_by_teacher_id: teacherId,
  });

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }

  return toStudentAccess({
    access_type: 'member',
    request_id: null,
    student_id: student.student_id,
    student_code: student.student_code,
    name: student.name,
    email: student.email,
    school_name: student.school_name,
    status: 'joined',
    request_message: null,
    teacher_response: null,
    created_at: new Date().toISOString(),
  });
}

export async function addStudentToModule({ moduleId, studentId, teacherId }) {
  const { error } = await supabase.from('module_members').insert({
    module_id: Number(moduleId),
    student_id: studentId,
    added_by_teacher_id: teacherId,
  });

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

export async function removeStudentFromModule({ moduleId, studentId }) {
  const { error } = await supabase
    .from('module_members')
    .delete()
    .eq('module_id', Number(moduleId))
    .eq('student_id', studentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function reviewModuleJoinRequest({ requestId, status, teacherResponse = '' }) {
  const { error } = await supabase.rpc('review_module_join_request', {
    target_request_id: Number(requestId),
    next_status: status,
    response_text: teacherResponse,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchStudentModules(studentId) {
  if (!studentId) {
    return [];
  }

  const [modulesResult, membersResult, requestsResult] = await Promise.all([
    supabase.from('modules').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
    supabase.from('module_members').select('*').eq('student_id', studentId),
    supabase.from('module_join_requests').select('*').eq('student_id', studentId),
  ]);

  if (modulesResult.error) {
    throw new Error(modulesResult.error.message);
  }

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  if (requestsResult.error) {
    throw new Error(requestsResult.error.message);
  }

  const membershipMap = (membersResult.data || []).reduce((collection, membership) => {
    collection.set(membership.module_id, membership);
    return collection;
  }, new Map());
  const requestMap = (requestsResult.data || []).reduce((collection, request) => {
    collection.set(request.module_id, request);
    return collection;
  }, new Map());

  return (modulesResult.data || []).map((module) => toStudentModule(module, membershipMap, requestMap));
}

export async function joinPublicModule({ moduleId, studentId }) {
  const { error } = await supabase.from('module_members').insert({
    module_id: Number(moduleId),
    student_id: studentId,
  });

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

export async function requestPrivateModule({ moduleId, studentId, message }) {
  const { error } = await supabase.from('module_join_requests').upsert(
    {
      module_id: Number(moduleId),
      student_id: studentId,
      status: 'pending',
      request_message: message.trim() || null,
      teacher_response: null,
      reviewed_at: null,
    },
    { onConflict: 'module_id,student_id' },
  );

  if (error) {
    throw new Error(error.message);
  }
}
