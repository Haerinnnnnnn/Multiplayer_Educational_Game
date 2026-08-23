import { QuestionSelect } from './QuestionSelect.js';

export class RandomQuestionSelect extends QuestionSelect {
  constructor({ random = Math.random } = {}) {
    super('random');

    if (typeof random !== 'function') {
      throw new TypeError('random must be a function.');
    }

    this.random = random;
  }

  select({ module, questionCount }) {
    const questions = this.getQuestions(module);
    const safeQuestionCount = Math.min(Number(questionCount), questions.length);

    return this.shuffle(questions)
      .slice(0, safeQuestionCount)
      .map((question) => question.id);
  }

  shuffle(questions = []) {
    return [...questions]
      .map((question) => ({ question, sort: this.random() }))
      .sort((left, right) => left.sort - right.sort)
      .map(({ question }) => question);
  }
}

export const randomQuestionSelect = new RandomQuestionSelect();

export default randomQuestionSelect;
