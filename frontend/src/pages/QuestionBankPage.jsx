import React from 'react';
import { EmptyState, Feedback } from '../components/Common.jsx';
import { AppFrame } from '../components/Layout.jsx';

export function QuestionBankPage({
  editingQuestionId,
  feedback,
  modules,
  onAddQuestion,
  onBack,
  onCancelQuestionEdit,
  onDeleteQuestion,
  onEditQuestion,
  onLogout,
  onQuestionFormChange,
  onSelectedModuleChange,
  questionForm,
  selectedModule,
  selectedModuleId,
}) {
  return (
    <AppFrame title="Question Bank" onHome={onBack} onLogout={onLogout}>
      <section className="panel">
        <label className="field-label">
          Select Module
          <select
            value={selectedModuleId}
            onChange={(event) => onSelectedModuleChange(Number(event.target.value))}
          >
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.moduleCode ? `${module.moduleCode} - ${module.title}` : module.title}
              </option>
            ))}
          </select>
        </label>
      </section>
      <form className="panel form-grid" onSubmit={onAddQuestion}>
        <h2>{editingQuestionId ? 'Edit MCQ Question' : 'Add MCQ Question'}</h2>
        {selectedModule?.isLocked && (
          <p className="lock-warning">
            This module is locked by admin for sessions. You can still edit questions, but cannot use it in a game.
          </p>
        )}
        <label>
          Question
          <input
            value={questionForm.question}
            onChange={(event) => onQuestionFormChange({ ...questionForm, question: event.target.value })}
            placeholder="Enter question"
          />
        </label>
        <div className="mcq-option-grid">
          <label>
            Option A
            <input
              value={questionForm.optionA}
              onChange={(event) => onQuestionFormChange({ ...questionForm, optionA: event.target.value })}
              placeholder="Enter option A"
            />
          </label>
          <label>
            Option B
            <input
              value={questionForm.optionB}
              onChange={(event) => onQuestionFormChange({ ...questionForm, optionB: event.target.value })}
              placeholder="Enter option B"
            />
          </label>
          <label>
            Option C
            <input
              value={questionForm.optionC}
              onChange={(event) => onQuestionFormChange({ ...questionForm, optionC: event.target.value })}
              placeholder="Enter option C"
            />
          </label>
          <label>
            Option D
            <input
              value={questionForm.optionD}
              onChange={(event) => onQuestionFormChange({ ...questionForm, optionD: event.target.value })}
              placeholder="Enter option D"
            />
          </label>
        </div>
        <label>
          Correct Answer
          <select
            value={questionForm.correctOption}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, correctOption: event.target.value })
            }
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
        <label>
          Explanation
          <textarea
            value={questionForm.explanation}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, explanation: event.target.value })
            }
            placeholder="Explain why the answer is correct"
          />
        </label>
        <div className="button-row">
          <button className="primary-button" type="submit">
            {editingQuestionId ? 'Save Question' : 'Add MCQ Question'}
          </button>
          {editingQuestionId && (
            <button className="secondary-button" type="button" onClick={onCancelQuestionEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      <Feedback text={feedback} />
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>ID</th>
              <th>Question</th>
              <th>Option A</th>
              <th>Option B</th>
              <th>Option C</th>
              <th>Option D</th>
              <th>Answer</th>
              <th>Explanation</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {selectedModule?.questions?.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.questionCode || `Q${String(item.id).padStart(3, '0')}`}</td>
                <td>{item.question}</td>
                <td>{item.optionA}</td>
                <td>{item.optionB}</td>
                <td>{item.optionC}</td>
                <td>{item.optionD}</td>
                <td>{item.correctOption}</td>
                <td>{item.explanation || '-'}</td>
                <td>
                  <div className="table-action-row">
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => onEditQuestion(item.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="link-button danger-link"
                      type="button"
                      onClick={() => onDeleteQuestion(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedModule?.questions?.length === 0 && <EmptyState text="No questions in this module yet." />}
      </div>
    </AppFrame>
  );
}
