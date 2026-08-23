import { QuestionSelect } from './QuestionSelect.js';

export class ManualQuestionSelect extends QuestionSelect {
  constructor() {
    super('manual');
  }

  select({ selectedQuestionIds = [] }) {
    return this.toQuestionIds(selectedQuestionIds);
  }
}

export const manualQuestionSelect = new ManualQuestionSelect();

export default manualQuestionSelect;
