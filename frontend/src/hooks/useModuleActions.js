import {
  createTeacherModule,
  deleteTeacherModule,
  updateTeacherModuleDetails,
  updateTeacherModuleVisibility,
} from '../services/moduleService.js';
import { submitModuleReviewRequest } from '../services/moduleReviewService.js';

export function useModuleActions({
  currentUser,
  moduleDeleteConfirm,
  moduleForm,
  modules,
  setFeedback,
  setModuleBusyMessage,
  setModuleDeleteBusy,
  setModuleDeleteConfirm,
  setModuleForm,
  setModules,
  setSelectedModuleId,
  setSessionForm,
}) {
  async function addModule(event) {
    event.preventDefault();

    if (!moduleForm.title.trim()) {
      setFeedback('Please enter a module name.');
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can create modules.');
      return;
    }

    try {
      setModuleBusyMessage('Creating module...');
      const nextModule = await createTeacherModule(currentUser.id, moduleForm);
      setModules((currentModules) => [nextModule, ...currentModules]);
      setSelectedModuleId(nextModule.id);
      setSessionForm((currentForm) => ({ ...currentForm, moduleId: nextModule.id }));
      setModuleForm({ title: '', description: '' });
      setFeedback(`Module ${nextModule.moduleCode} created.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function toggleModuleVisibility(moduleId, visibility) {
    const module = modules.find((item) => item.id === moduleId);
    const nextVisibility = visibility || (module?.visibility === 'public' ? 'private' : 'public');

    try {
      setModuleBusyMessage(`Changing ${module?.moduleCode || 'module'} access...`);
      const updatedModule = await updateTeacherModuleVisibility(moduleId, nextVisibility);

      setModules((currentModules) =>
        currentModules.map((item) =>
          item.id === moduleId
            ? {
                ...item,
                ...updatedModule,
                chapters: Array.isArray(item.chapters) ? item.chapters : updatedModule.chapters || [],
                allChapters: Array.isArray(item.allChapters) ? item.allChapters : updatedModule.allChapters || [],
                questions: item.questions || updatedModule.questions || [],
                latestReviewRequest: item.latestReviewRequest || updatedModule.latestReviewRequest,
              }
            : item,
        ),
      );
      setFeedback(`Module access changed to ${nextVisibility}.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleBusyMessage('');
    }
  }

  async function editModuleDetails(moduleId, nextModuleForm) {
    if (!nextModuleForm.title.trim()) {
      setFeedback('Please enter a module name.');
      return false;
    }

    const module = modules.find((item) => item.id === moduleId);

    try {
      setModuleBusyMessage(`Updating ${module?.moduleCode || 'module'}...`);
      const updatedModule = await updateTeacherModuleDetails(moduleId, nextModuleForm);

      setModules((currentModules) =>
        currentModules.map((item) =>
          item.id === moduleId
            ? {
                ...item,
                ...updatedModule,
                chapters: Array.isArray(item.chapters) ? item.chapters : updatedModule.chapters || [],
                allChapters: Array.isArray(item.allChapters) ? item.allChapters : updatedModule.allChapters || [],
                questions: item.questions || updatedModule.questions || [],
                latestReviewRequest: item.latestReviewRequest || updatedModule.latestReviewRequest,
              }
            : item,
        ),
      );
      setFeedback(`${updatedModule.moduleCode || 'Module'} updated.`);
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    } finally {
      setModuleBusyMessage('');
    }
  }

  function deleteModule(moduleId) {
    const module = modules.find((item) => item.id === moduleId);

    if (module) {
      setModuleDeleteConfirm(module);
    }
  }

  async function confirmDeleteModule() {
    const moduleToDelete = moduleDeleteConfirm;

    if (!moduleToDelete) {
      return;
    }

    try {
      setModuleDeleteBusy(true);
      setModuleBusyMessage('Moving module to deleted modules...');
      await deleteTeacherModule(moduleToDelete.id);
      const remainingModules = modules.filter((module) => module.id !== moduleToDelete.id);
      setModules(remainingModules);

      if (remainingModules.length > 0) {
        setSelectedModuleId(remainingModules[0].id);
        setSessionForm((currentForm) => ({ ...currentForm, moduleId: remainingModules[0].id }));
      }

      setModuleDeleteConfirm(null);
      setFeedback('Module moved to deleted modules. Admin can still view its data.');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setModuleDeleteBusy(false);
      setModuleBusyMessage('');
    }
  }

  async function requestModuleReview(moduleId, message) {
    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can request module review.');
      return false;
    }

    try {
      const reviewRequest = await submitModuleReviewRequest({
        moduleId,
        teacherId: currentUser.id,
        message,
      });

      setModules((currentModules) =>
        currentModules.map((module) =>
          module.id === Number(moduleId)
            ? {
                ...module,
                latestReviewRequest: reviewRequest,
              }
            : module,
        ),
      );
      setFeedback('Review request sent to admin.');
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    }
  }

  return {
    addModule,
    confirmDeleteModule,
    deleteModule,
    editModuleDetails,
    requestModuleReview,
    toggleModuleVisibility,
  };
}
