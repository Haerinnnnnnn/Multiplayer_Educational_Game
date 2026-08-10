import { fetchModuleStudentAccess } from './moduleAccessService.js';

function toJoinRequestNotification(module, request) {
  return {
    id: `${module.id}-${request.requestId}`,
    type: 'module_join_request',
    requestId: request.requestId,
    moduleId: module.id,
    moduleCode: module.moduleCode || '-',
    moduleTitle: module.title || 'Learning Module',
    studentId: request.studentId,
    studentCode: request.studentCode,
    studentName: request.name || 'Student',
    studentEmail: request.email || '-',
    requestMessage: request.requestMessage || '',
    createdAt: request.createdAt,
  };
}

export async function fetchTeacherJoinRequestNotifications(modules = []) {
  const activeModules = modules.filter((module) => module?.id && !module.isDeleted);

  if (!activeModules.length) {
    return [];
  }

  const accessRows = await Promise.all(
    activeModules.map(async (module) => {
      const rows = await fetchModuleStudentAccess(module.id);
      return rows
        .filter((row) => row.accessType === 'request' && row.status === 'pending')
        .map((row) => toJoinRequestNotification(module, row));
    }),
  );

  return accessRows
    .flat()
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0));
}
