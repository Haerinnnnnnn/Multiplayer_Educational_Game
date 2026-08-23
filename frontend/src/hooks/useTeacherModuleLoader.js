import { useCallback, useState } from 'react';
import { fetchTeacherModules } from '../services/moduleService.js';
import {
  cleanupStaleLobbySessions,
  fetchTeacherSessions,
} from '../services/sessionService.js';
import {
  getActiveChapters,
  getFirstChapterId,
  isUsableSessionModule,
} from '../utils/appHelpers.js';

export function useTeacherModuleLoader({
  activeSessionId,
  setFeedback,
  setModules,
  setSelectedModuleId,
  setSessionForm,
  setSessions,
}) {
  const [loadingModules, setLoadingModules] = useState(false);

  const loadTeacherModules = useCallback(
    async (teacherId, options = {}) => {
      if (!options.silent) {
        setLoadingModules(true);
      }

      try {
        const data = await fetchTeacherModules(teacherId);
        setModules(data);

        const deletedStaleSessionIds = await cleanupStaleLobbySessions(
          teacherId,
          activeSessionId,
        );
        const teacherSessions = await fetchTeacherSessions(teacherId, data);
        setSessions(
          teacherSessions.filter(
            (session) => !deletedStaleSessionIds.includes(session.id),
          ),
        );

        if (data.length === 0) {
          setSelectedModuleId('');
          return data;
        }

        setSelectedModuleId((currentId) =>
          data.some((module) => module.id === Number(currentId))
            ? currentId
            : data[0].id,
        );
        setSessionForm((currentForm) => {
          const currentModule = data.find(
            (module) => module.id === Number(currentForm.moduleId),
          );
          const defaultModule = isUsableSessionModule(currentModule)
            ? currentModule
            : data.find(
                (module) =>
                  isUsableSessionModule(module) && getActiveChapters(module).length,
              ) || data.find(isUsableSessionModule);
          const activeChapters = getActiveChapters(defaultModule);

          return {
            ...currentForm,
            moduleId: defaultModule?.id || '',
            chapterId: activeChapters.some(
              (chapter) => chapter.id === Number(currentForm.chapterId),
            )
              ? currentForm.chapterId
              : getFirstChapterId(defaultModule),
            selectedQuestionIds: data.some(
              (module) =>
                isUsableSessionModule(module) &&
                module.id === Number(currentForm.moduleId),
            )
              ? currentForm.selectedQuestionIds
              : [],
          };
        });

        return data;
      } catch (error) {
        setFeedback(error.message);
        return [];
      } finally {
        if (!options.silent) {
          setLoadingModules(false);
        }
      }
    },
    [
      activeSessionId,
      setFeedback,
      setModules,
      setSelectedModuleId,
      setSessionForm,
      setSessions,
    ],
  );

  return { loadTeacherModules, loadingModules };
}
