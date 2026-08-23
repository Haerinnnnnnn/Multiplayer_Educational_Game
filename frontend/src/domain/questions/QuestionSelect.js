export class QuestionSelect {
  constructor(mode) {
    if (new.target === QuestionSelect) {
      throw new TypeError('QuestionSelect is abstract and cannot be instantiated directly.');
    }

    this.mode = mode;
  }

  select() {
    throw new Error('Question selection strategies must implement select(options).');
  }

  getQuestions(module) {
    return Array.isArray(module?.questions) ? module.questions : [];
  }

  toQuestionIds(questionIds = []) {
    return questionIds.map((questionId) => Number(questionId));
  }

  getFallbackIds(module, questionCount) {
    return this.getQuestions(module)
      .slice(0, Number(questionCount) || 0)
      .map((question) => question.id);
  }
}

export default QuestionSelect;
