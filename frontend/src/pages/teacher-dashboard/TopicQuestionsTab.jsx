import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState, Feedback } from '../../components/Common.jsx';
import {
  downloadQuestionTemplate,
  normalizeEditedQuestionImportRow,
  readExcelQuestionFile,
  validateQuestionImportRow,
} from '../../services/questionImportService.js';

export function TopicQuestionsTab({
  feedback,
  modules,
  loadingModules,
  editingQuestionId,
  onAddQuestion,
  onCancelQuestionEdit,
  onDeleteQuestion,
  onEditQuestion,
  onImportQuestions,
  onBackToModule,
  onQuestionFormChange,
  onRefreshModules,
  onRequestModuleReview,
  onSelectedModuleChange,
  onTopicFilterChange,
  questionForm,
  selectedModule,
  selectedModuleId,
  topicFilterId = '',
}) {
  const [importRows, setImportRows] = useState([]);
  const [selectedImportRowIds, setSelectedImportRowIds] = useState([]);
  const [showImportDeleteConfirm, setShowImportDeleteConfirm] = useState(false);
  const [deletingSelectedImportRows, setDeletingSelectedImportRows] = useState(false);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importDragging, setImportDragging] = useState(false);
  const scopedTopicId = topicFilterId && topicFilterId !== 'unassigned' ? String(topicFilterId) : '';

  useEffect(() => {
    if (scopedTopicId && String(questionForm.chapterId || '') !== scopedTopicId) {
      onQuestionFormChange({
        ...questionForm,
        chapterId: scopedTopicId,
      });
    }
  }, [onQuestionFormChange, questionForm, scopedTopicId]);

  if (!modules.length) {
    return <EmptyState text="Create a module before adding questions." />;
  }

  const validImportRows = importRows.filter((row) => row.errors.length === 0);
  const invalidImportRows = importRows.length - validImportRows.length;
  const selectedImportRowCount = selectedImportRowIds.length;
  const allImportRowsSelected =
    importRows.length > 0 && selectedImportRowCount === importRows.length;
  const activeTopicFilter = topicFilterId === 'unassigned'
    ? {
        id: 'unassigned',
        chapterCode: 'UNASSIGNED',
        title: 'Questions Without Topic',
        description: 'Old or imported questions that are not linked to a topic yet.',
      }
    : (selectedModule?.chapters || []).find((chapter) => String(chapter.id) === String(topicFilterId));
  const visibleQuestions = topicFilterId
    ? (selectedModule?.questions || []).filter((item) =>
        topicFilterId === 'unassigned'
          ? !item.chapterId
          : Number(item.chapterId) === Number(topicFilterId),
      )
    : (selectedModule?.questions || []);

  async function readImportFile(file) {
    setImportRows([]);
    setSelectedImportRowIds([]);
    setShowImportDeleteConfirm(false);
    setImportError('');

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const supportedFile = ['.xlsx', '.xls', '.csv'].some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!supportedFile) {
      setImportError('Please upload an Excel or CSV file that follows the template.');
      return;
    }

    try {
      const rows = await readExcelQuestionFile(file);
      setImportRows(rows);
    } catch (error) {
      setImportError(error.message);
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    await readImportFile(file);
    event.target.value = '';
  }

  function handleImportDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(true);
  }

  function handleImportDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(false);
  }

  async function handleImportDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setImportDragging(false);
    const file = event.dataTransfer.files?.[0];
    await readImportFile(file);
  }

  async function confirmImport() {
    if (!validImportRows.length) {
      setImportError('No valid rows to import.');
      return;
    }

    setImporting(true);
    const scopedRows = validImportRows.map((row) => ({
      ...normalizeEditedQuestionImportRow(row),
      chapterId: scopedTopicId,
    }));
    const success = await onImportQuestions(scopedRows);
    setImporting(false);

    if (success) {
      setImportRows([]);
      setSelectedImportRowIds([]);
      setShowImportDeleteConfirm(false);
      setImportError('');
    }
  }

  function updateImportRow(importId, field, value) {
    setImportRows((currentRows) =>
      currentRows.map((row) => {
        if (row.importId !== importId) {
          return row;
        }

        const nextRow = {
          ...row,
          [field]: field === 'correctOption' ? value.toUpperCase() : value,
        };

        return {
          ...nextRow,
          errors: validateQuestionImportRow(nextRow),
        };
      }),
    );
  }

  function deleteImportRow(importId) {
    setImportRows((currentRows) => currentRows.filter((row) => row.importId !== importId));
    setSelectedImportRowIds((currentIds) => currentIds.filter((id) => id !== importId));
  }

  function toggleImportRowSelection(importId) {
    setSelectedImportRowIds((currentIds) =>
      currentIds.includes(importId)
        ? currentIds.filter((id) => id !== importId)
        : [...currentIds, importId],
    );
  }

  function toggleAllImportRows() {
    setSelectedImportRowIds(allImportRowsSelected ? [] : importRows.map((row) => row.importId));
  }

  function selectValidImportRows() {
    setSelectedImportRowIds(validImportRows.map((row) => row.importId));
  }

  async function handleBackToModule() {
    if (onRefreshModules) {
      await onRefreshModules();
    }

    onBackToModule?.();
  }

  function requestDeleteSelectedImportRows() {
    if (!selectedImportRowCount) {
      return;
    }

    setShowImportDeleteConfirm(true);
  }

  function confirmDeleteSelectedImportRows() {
    const selectedIds = new Set(selectedImportRowIds);
    setShowImportDeleteConfirm(false);
    setDeletingSelectedImportRows(true);

    window.setTimeout(() => {
      setImportRows((currentRows) => currentRows.filter((row) => !selectedIds.has(row.importId)));
      setSelectedImportRowIds([]);
      setDeletingSelectedImportRows(false);
    }, 650);
  }

  return (
    <section className="teacher-dashboard-panel-in">
      <section className="panel">
        <div className="module-section-heading">
          <div>
            <p className="eyebrow">Question Bank</p>
            <h2>Manage Topic Questions</h2>
          </div>
          {onBackToModule && (
            <button className="secondary-button" type="button" onClick={handleBackToModule}>
              Back To Manage Module
            </button>
          )}
        </div>
        {selectedModule && (
          <div className="topic-scope-summary">
            <div>
              <p className="eyebrow">Module</p>
              <h3>{selectedModule.moduleCode ? `${selectedModule.moduleCode} - ${selectedModule.title}` : selectedModule.title}</h3>
              <p>Questions added here stay inside this selected module.</p>
            </div>
            <div>
              <p className="eyebrow">Teacher</p>
              <h3>Current Account</h3>
              <p>All changes are linked to your teacher account.</p>
            </div>
          </div>
        )}
        {activeTopicFilter ? (
          <div className="topic-context-card">
            <div>
              <p className="eyebrow">{activeTopicFilter.chapterCode}</p>
              <h3>{activeTopicFilter.title}</h3>
              <p>{activeTopicFilter.description || 'No topic description yet.'}</p>
            </div>
            <strong>{visibleQuestions.length} questions</strong>
          </div>
        ) : (
          <p className="lock-warning">
            Topic not found. Please go back to Manage Module and choose a topic again.
          </p>
        )}
        {selectedModule?.isLocked && (
          <p className="lock-warning">
            This module is locked by admin for sessions. You can still edit questions, but cannot use it in a game.
          </p>
        )}
      </section>

      <form className="panel form-grid" onSubmit={onAddQuestion}>
        <h2>{editingQuestionId ? 'Edit MCQ Question' : 'Add MCQ Question'}</h2>
        {activeTopicFilter && (
          <div className="fixed-topic-card">
            <p className="eyebrow">Fixed Topic / Chapter</p>
            <h3>{activeTopicFilter.chapterCode ? `${activeTopicFilter.chapterCode} - ${activeTopicFilter.title}` : activeTopicFilter.title}</h3>
            <p>New questions and imported questions will be saved into this topic only.</p>
          </div>
        )}
        <label>
          Question
          <input
            value={questionForm.question}
            onChange={(event) =>
              onQuestionFormChange({ ...questionForm, question: event.target.value })
            }
            placeholder="Enter question"
          />
        </label>
        <div className="mcq-option-grid">
          <label>
            Option A
            <input
              value={questionForm.optionA}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionA: event.target.value })
              }
              placeholder="Enter option A"
            />
          </label>
          <label>
            Option B
            <input
              value={questionForm.optionB}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionB: event.target.value })
              }
              placeholder="Enter option B"
            />
          </label>
          <label>
            Option C
            <input
              value={questionForm.optionC}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionC: event.target.value })
              }
              placeholder="Enter option C"
            />
          </label>
          <label>
            Option D
            <input
              value={questionForm.optionD}
              onChange={(event) =>
                onQuestionFormChange({ ...questionForm, optionD: event.target.value })
              }
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

      <section className="panel form-grid">
        <div className="import-header">
          <div>
            <h2>Import Questions From Excel</h2>
            <p className="muted">
              Required columns: question, option_a, option_b, option_c, option_d, correct_option.
            </p>
          </div>
          <button
            className="secondary-button template-download-link"
            type="button"
            onClick={downloadQuestionTemplate}
          >
            Download Template
          </button>
        </div>
        <div
          className={`excel-drop-zone${importDragging ? ' dragging' : ''}`}
          onDragOver={handleImportDragOver}
          onDragLeave={handleImportDragLeave}
          onDrop={handleImportDrop}
        >
          <div className="excel-drop-icon" aria-hidden="true">
            XLS
          </div>
          <div className="excel-drop-copy">
            <h3>Drop Excel File Here</h3>
            <p>Drag your completed template into this box and the preview table will fill automatically.</p>
          </div>
          <label className="excel-file-picker">
            <span>Choose File</span>
            <input
              accept=".xlsx,.xls,.csv"
              type="file"
              onChange={handleImportFile}
            />
          </label>
        </div>

        {importError && <Feedback text={importError} />}

        {importRows.length > 0 && (
          <>
            <div className="import-summary">
              <strong>{validImportRows.length} valid</strong>
              <span>{invalidImportRows} need fixing</span>
            </div>
            <div className="import-bulk-toolbar">
              <div>
                <strong>{selectedImportRowCount}</strong>
                <span> selected</span>
              </div>
              <div className="import-bulk-actions">
                <button className="secondary-button" type="button" onClick={toggleAllImportRows}>
                  {allImportRowsSelected ? 'Clear Selection' : 'Select All'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={selectValidImportRows}
                  disabled={!validImportRows.length}
                >
                  Select Valid
                </button>
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={requestDeleteSelectedImportRows}
                  disabled={deletingSelectedImportRows || !selectedImportRowCount}
                >
                  Delete Selected
                </button>
              </div>
            </div>
            <div className="table-panel import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th className="import-select-cell">
                      <input
                        aria-label="Select all imported questions"
                        checked={allImportRowsSelected}
                        className="import-checkbox"
                        type="checkbox"
                        onChange={toggleAllImportRows}
                      />
                    </th>
                    <th>Row</th>
                    <th>Question</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                    <th>Answer</th>
                    <th>Explanation</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row) => (
                    <tr key={row.importId}>
                      <td className="import-select-cell">
                        <input
                          aria-label={`Select imported row ${row.importId}`}
                          checked={selectedImportRowIds.includes(row.importId)}
                          className="import-checkbox"
                          type="checkbox"
                          onChange={() => toggleImportRowSelection(row.importId)}
                        />
                      </td>
                      <td>{row.importId}</td>
                      <td>
                        <textarea
                          className="import-edit-field question"
                          value={row.question}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'question', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionA}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionA', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionB}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionB', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionC}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionC', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.optionD}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'optionD', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="import-answer-select"
                          value={row.correctOption}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'correctOption', event.target.value)
                          }
                        >
                          <option value="">-</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          className="import-edit-field"
                          value={row.explanation}
                          onChange={(event) =>
                            updateImportRow(row.importId, 'explanation', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <span className={row.errors.length ? 'import-row-status invalid' : 'import-row-status valid'}>
                          {row.errors.length ? `Missing ${row.errors.join(', ')}` : 'Ready'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link-button danger-link"
                          type="button"
                          onClick={() => deleteImportRow(row.importId)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={confirmImport}
                disabled={importing || !validImportRows.length}
              >
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setImportRows([]);
                  setSelectedImportRowIds([]);
                  setShowImportDeleteConfirm(false);
                  setImportError('');
                }}
              >
                Clear Preview
              </button>
            </div>
          </>
        )}
      </section>

      {showImportDeleteConfirm &&
        createPortal(
          <div
            className="modal-backdrop import-delete-backdrop"
            role="presentation"
            onClick={() => setShowImportDeleteConfirm(false)}
          >
            <section
              aria-modal="true"
              className="review-message-modal import-delete-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="eyebrow">Confirm Delete</p>
              <h2>Delete Selected Questions?</h2>
              <p>
                Are you sure you want to delete {selectedImportRowCount} selected imported
                question{selectedImportRowCount === 1 ? '' : 's'} from this preview?
              </p>
              <div className="button-row">
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={confirmDeleteSelectedImportRows}
                >
                  Yes, Delete
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowImportDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}

      {deletingSelectedImportRows &&
        createPortal(
          <div className="modal-backdrop import-delete-backdrop" role="presentation">
            <section className="review-message-modal import-delete-modal import-delete-loading" role="status">
              <div className="logout-spinner" aria-hidden="true" />
              <p className="eyebrow">Updating Preview</p>
              <h2>Deleting Selected Questions</h2>
              <p>Please wait while the selected Excel rows are removed.</p>
            </section>
          </div>,
          document.body,
        )}

      <Feedback text={feedback} />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>ID</th>
              <th>Topic</th>
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
            {visibleQuestions.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.questionCode || `Q${String(item.id).padStart(3, '0')}`}</td>
                <td>
                  {item.chapterTitle || 'Unassigned'}
                  {item.chapterIsDeleted && <p className="muted table-subtext">Deleted topic</p>}
                </td>
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
        {visibleQuestions.length === 0 && (
          <EmptyState text={topicFilterId ? 'No questions in this topic yet.' : 'No questions in this module yet.'} />
        )}
      </div>
    </section>
  );
}
