const HEADER_ALIASES = {
  question: ['question', 'question_text', 'question text', 'title'],
  optionA: ['option_a', 'option a', 'a', 'answer a'],
  optionB: ['option_b', 'option b', 'b', 'answer b'],
  optionC: ['option_c', 'option c', 'c', 'answer c'],
  optionD: ['option_d', 'option d', 'd', 'answer d'],
  correctOption: ['correct_option', 'correct option', 'answer', 'correct answer', 'correct'],
  explanation: ['explanation', 'reason', 'notes'],
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findValue(row, aliases) {
  const normalizedRow = Object.entries(row).reduce((collection, [key, value]) => {
    collection[normalizeHeader(key)] = value;
    return collection;
  }, {});

  const matchedKey = aliases.find((alias) => Object.prototype.hasOwnProperty.call(normalizedRow, alias));
  return matchedKey ? String(normalizedRow[matchedKey] || '').trim() : '';
}

function normalizeCorrectOption(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(normalized) ? normalized : '';
}

function normalizeQuestionRow(row, index) {
  return {
    importId: index + 1,
    question: findValue(row, HEADER_ALIASES.question),
    optionA: findValue(row, HEADER_ALIASES.optionA),
    optionB: findValue(row, HEADER_ALIASES.optionB),
    optionC: findValue(row, HEADER_ALIASES.optionC),
    optionD: findValue(row, HEADER_ALIASES.optionD),
    correctOption: normalizeCorrectOption(findValue(row, HEADER_ALIASES.correctOption)),
    explanation: findValue(row, HEADER_ALIASES.explanation),
  };
}

export function validateQuestionImportRow(row) {
  const missing = [];

  if (!row.question?.trim()) missing.push('question');
  if (!row.optionA?.trim()) missing.push('option A');
  if (!row.optionB?.trim()) missing.push('option B');
  if (!row.optionC?.trim()) missing.push('option C');
  if (!row.optionD?.trim()) missing.push('option D');
  if (!normalizeCorrectOption(row.correctOption)) missing.push('correct option');

  return missing;
}

export function normalizeEditedQuestionImportRow(row) {
  return {
    ...row,
    question: String(row.question || '').trim(),
    optionA: String(row.optionA || '').trim(),
    optionB: String(row.optionB || '').trim(),
    optionC: String(row.optionC || '').trim(),
    optionD: String(row.optionD || '').trim(),
    correctOption: normalizeCorrectOption(row.correctOption),
    explanation: String(row.explanation || '').trim(),
  };
}

export async function readExcelQuestionFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('No worksheet found in this file.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rows.length) {
    throw new Error('No question rows found in this file.');
  }

  return rows.map(normalizeQuestionRow).map((row) => ({
    ...row,
    errors: validateQuestionImportRow(row),
  }));
}
