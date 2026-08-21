import { supabase } from './supabaseClient.js';

export function toQuestion(row, chapter = null) {
  const options = [
    { key: 'A', text: row.option_a || '' },
    { key: 'B', text: row.option_b || '' },
    { key: 'C', text: row.option_c || '' },
    { key: 'D', text: row.option_d || '' },
  ];
  const correctOption = row.correct_option || 'A';
  const correctAnswer = options.find((option) => option.key === correctOption)?.text || correctOption;

  return {
    id: row.id,
    questionCode: row.question_code,
    moduleId: row.module_id,
    chapterId: row.chapter_id || null,
    chapterCode: chapter?.chapterCode || null,
    chapterTitle: chapter?.title || null,
    chapterIsDeleted: Boolean(chapter?.isDeleted),
    teacherId: row.teacher_id,
    questionType: row.question_type || 'mcq',
    question: row.question_text,
    optionA: row.option_a || '',
    optionB: row.option_b || '',
    optionC: row.option_c || '',
    optionD: row.option_d || '',
    correctOption,
    correctAnswer,
    explanation: row.explanation || '',
    options,
    answer: correctAnswer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createModuleQuestion({ teacherId, moduleId, questionForm }) {
  const correctOption = questionForm.correctOption || 'A';
  const optionMap = {
    A: questionForm.optionA.trim(),
    B: questionForm.optionB.trim(),
    C: questionForm.optionC.trim(),
    D: questionForm.optionD.trim(),
  };

  const { data, error } = await supabase
    .from('questions')
    .insert({
      module_id: Number(moduleId),
      chapter_id: questionForm.chapterId ? Number(questionForm.chapterId) : null,
      teacher_id: teacherId,
      question_type: 'mcq',
      question_text: questionForm.question.trim(),
      option_a: questionForm.optionA.trim(),
      option_b: questionForm.optionB.trim(),
      option_c: questionForm.optionC.trim(),
      option_d: questionForm.optionD.trim(),
      correct_option: correctOption,
      answer_text: optionMap[correctOption],
      explanation: questionForm.explanation?.trim() || null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toQuestion(data);
}

export async function createModuleQuestions({ teacherId, moduleId, questionRows }) {
  const insertRows = questionRows.map((questionForm) => {
    const correctOption = questionForm.correctOption || 'A';
    const optionMap = {
      A: questionForm.optionA.trim(),
      B: questionForm.optionB.trim(),
      C: questionForm.optionC.trim(),
      D: questionForm.optionD.trim(),
    };

    return {
      module_id: Number(moduleId),
      chapter_id: questionForm.chapterId ? Number(questionForm.chapterId) : null,
      teacher_id: teacherId,
      question_type: 'mcq',
      question_text: questionForm.question.trim(),
      option_a: questionForm.optionA.trim(),
      option_b: questionForm.optionB.trim(),
      option_c: questionForm.optionC.trim(),
      option_d: questionForm.optionD.trim(),
      correct_option: correctOption,
      answer_text: optionMap[correctOption],
      explanation: questionForm.explanation?.trim() || null,
    };
  });

  const { data, error } = await supabase
    .from('questions')
    .insert(insertRows)
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(toQuestion);
}

export async function updateModuleQuestion(questionId, questionForm) {
  const correctOption = questionForm.correctOption || 'A';
  const optionMap = {
    A: questionForm.optionA.trim(),
    B: questionForm.optionB.trim(),
    C: questionForm.optionC.trim(),
    D: questionForm.optionD.trim(),
  };

  const { data, error } = await supabase
    .from('questions')
    .update({
      question_text: questionForm.question.trim(),
      chapter_id: questionForm.chapterId ? Number(questionForm.chapterId) : null,
      option_a: questionForm.optionA.trim(),
      option_b: questionForm.optionB.trim(),
      option_c: questionForm.optionC.trim(),
      option_d: questionForm.optionD.trim(),
      correct_option: correctOption,
      answer_text: optionMap[correctOption],
      explanation: questionForm.explanation?.trim() || null,
    })
    .eq('id', questionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toQuestion(data);
}

export async function deleteModuleQuestion(questionId) {
  const { error } = await supabase.from('questions').delete().eq('id', questionId);

  if (error) {
    throw new Error(error.message);
  }
}
