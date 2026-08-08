export function makeSessionCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getCurrentQuestion(session, module) {
  const questionId = session.questionIds[session.currentQuestionIndex];
  return module.questions.find((question) => question.id === questionId) || module.questions[0];
}

export function getAnswerOptions(module, currentQuestion) {
  if (currentQuestion?.options?.length) {
    return currentQuestion.options
      .map((option) => option.text)
      .filter(Boolean)
      .slice(0, 4);
  }

  const answers = module.questions.map((question) => question.answer);
  const uniqueAnswers = [...new Set([currentQuestion.answer, ...answers])];
  return uniqueAnswers.slice(0, 4);
}
