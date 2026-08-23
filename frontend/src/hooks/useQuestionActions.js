import {
  createModuleQuestion,
  createModuleQuestions,
  deleteModuleQuestion,
  updateModuleQuestion,
} from '../services/questionService.js';

const EMPTY_QUESTION_FORM = {
  question: '',
  chapterId: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  explanation: '',
};

export function useQuestionActions({
  currentUser,
  editingQuestionId,
  loadTeacherModules,
  questionDeleteConfirm,
  questionForm,
  selectedModule,
  selectedModuleId,
  setEditingQuestionId,
  setFeedback,
  setModules,
  setQuestionDeleteBusy,
  setQuestionDeleteConfirm,
  setQuestionForm,
}) {
  function resetQuestionForm() {
    setQuestionForm({ ...EMPTY_QUESTION_FORM });
    setEditingQuestionId(null);
  }

  async function addQuestion(event) {
    event.preventDefault();

    const requiredFields = [
      questionForm.question,
      questionForm.optionA,
      questionForm.optionB,
      questionForm.optionC,
      questionForm.optionD,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setFeedback('Please enter the question and all four options.');
      return;
    }

    if (!['A', 'B', 'C', 'D'].includes(questionForm.correctOption)) {
      setFeedback('Please choose the correct option.');
      return;
    }

    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can add questions.');
      return;
    }

    if (!selectedModule) {
      setFeedback('Please select a module first.');
      return;
    }

    try {
      if (editingQuestionId) {
        const updatedQuestion = await updateModuleQuestion(editingQuestionId, questionForm);
        const selectedChapter = selectedModule.chapters?.find(
          (chapter) => chapter.id === Number(questionForm.chapterId),
        );
        const enrichedQuestion = {
          ...updatedQuestion,
          chapterCode: selectedChapter?.chapterCode || null,
          chapterTitle: selectedChapter?.title || null,
          chapterIsDeleted: Boolean(selectedChapter?.isDeleted),
        };

        setModules((currentModules) =>
          currentModules.map((module) => {
            if (module.id !== Number(selectedModuleId)) {
              return module;
            }

            return {
              ...module,
              questions: (module.questions || []).map((question) =>
                question.id === editingQuestionId ? enrichedQuestion : question,
              ),
            };
          }),
        );
        resetQuestionForm();
        setFeedback(`Question ${enrichedQuestion.questionCode || ''} updated.`);
        await loadTeacherModules(currentUser.id);
        return;
      }

      const nextQuestion = await createModuleQuestion({
        teacherId: currentUser.id,
        moduleId: selectedModuleId,
        questionForm,
      });
      const selectedChapter = selectedModule.chapters?.find(
        (chapter) => chapter.id === Number(questionForm.chapterId),
      );
      const enrichedQuestion = {
        ...nextQuestion,
        chapterCode: selectedChapter?.chapterCode || null,
        chapterTitle: selectedChapter?.title || null,
        chapterIsDeleted: Boolean(selectedChapter?.isDeleted),
      };

      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(selectedModuleId)) {
            return module;
          }

          return {
            ...module,
            questions: [enrichedQuestion, ...(module.questions || [])],
          };
        }),
      );
      resetQuestionForm();
      setFeedback(`Question ${enrichedQuestion.questionCode || ''} added to ${selectedModule.moduleCode}.`);
      await loadTeacherModules(currentUser.id);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function importQuestions(questionRows) {
    if (currentUser?.role !== 'teacher') {
      setFeedback('Only teachers can import questions.');
      return false;
    }

    if (!selectedModule) {
      setFeedback('Please select a module first.');
      return false;
    }

    if (!questionRows.length) {
      setFeedback('No valid questions to import.');
      return false;
    }

    try {
      const importedQuestions = await createModuleQuestions({
        teacherId: currentUser.id,
        moduleId: selectedModuleId,
        questionRows: questionRows.map((questionRow) => ({
          ...questionRow,
          chapterId: questionRow.chapterId || questionForm.chapterId,
        })),
      });
      const chapterById = (selectedModule.chapters || []).reduce((collection, chapter) => {
        collection.set(chapter.id, chapter);
        return collection;
      }, new Map());
      const enrichedQuestions = importedQuestions.map((question) => {
        const chapter = chapterById.get(question.chapterId);

        return {
          ...question,
          chapterCode: chapter?.chapterCode || null,
          chapterTitle: chapter?.title || null,
          chapterIsDeleted: Boolean(chapter?.isDeleted),
        };
      });

      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(selectedModuleId)) {
            return module;
          }

          return {
            ...module,
            questions: [...enrichedQuestions, ...(module.questions || [])],
          };
        }),
      );
      setFeedback(`${enrichedQuestions.length} questions imported to ${selectedModule.moduleCode}.`);
      await loadTeacherModules(currentUser.id);
      return true;
    } catch (error) {
      setFeedback(error.message);
      return false;
    }
  }

  function editQuestion(questionId) {
    const question = selectedModule?.questions?.find((item) => item.id === questionId);

    if (!question) {
      setFeedback('Question not found.');
      return;
    }

    setQuestionForm({
      question: question.question || '',
      chapterId: question.chapterIsDeleted ? '' : question.chapterId || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correctOption: question.correctOption || 'A',
      explanation: question.explanation || '',
    });
    setEditingQuestionId(questionId);
    setFeedback(`Editing ${question.questionCode || 'question'}.`);
  }

  function deleteQuestion(questionId) {
    const question = selectedModule?.questions?.find((item) => item.id === questionId);

    if (question) {
      setQuestionDeleteConfirm({
        moduleId: Number(selectedModuleId),
        question,
      });
    }
  }

  async function confirmDeleteQuestion() {
    const deleteTarget = questionDeleteConfirm;

    if (!deleteTarget?.question) {
      return;
    }

    const questionId = deleteTarget.question.id;

    try {
      setQuestionDeleteBusy(true);
      await deleteModuleQuestion(questionId);
      if (editingQuestionId === questionId) {
        resetQuestionForm();
      }
      setModules((currentModules) =>
        currentModules.map((module) => {
          if (module.id !== Number(deleteTarget.moduleId)) {
            return module;
          }

          return {
            ...module,
            questions: (module.questions || []).filter((questionItem) => questionItem.id !== questionId),
          };
        }),
      );
      setQuestionDeleteConfirm(null);
      setFeedback('Question deleted.');
      await loadTeacherModules(currentUser.id);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setQuestionDeleteBusy(false);
    }
  }

  return {
    addQuestion,
    confirmDeleteQuestion,
    deleteQuestion,
    editQuestion,
    importQuestions,
    resetQuestionForm,
  };
}
