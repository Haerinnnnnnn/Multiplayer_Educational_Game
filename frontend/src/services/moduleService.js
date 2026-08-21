import { supabase } from './supabaseClient.js';
import { toQuestion } from './questionService.js';
import { toChapter } from './chapterService.js';
import { getLatestReviewByModule } from './moduleReviewService.js';

function toModule(row, questions = [], latestReviewRequest = null, chapters = [], allChapters = chapters) {
  return {
    id: row.id,
    moduleCode: row.module_code,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description || 'No description yet.',
    visibility: row.visibility || 'private',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    isLocked: Boolean(row.is_locked),
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    latestReviewRequest,
    chapters,
    allChapters,
    questions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTeacherModules(teacherId) {
  if (!teacherId) {
    return [];
  }

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const moduleRows = data || [];
  const moduleIds = moduleRows.map((module) => module.id);

  if (!moduleIds.length) {
    return [];
  }

  const [questionResult, chapterResult] = await Promise.all([
    supabase
      .from('questions')
      .select('*')
      .in('module_id', moduleIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('chapters')
      .select('*')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (questionResult.error) {
    if (questionResult.error.message?.includes('chapter_id')) {
      throw new Error('Please apply the latest chapters database migration before loading modules.');
    }

    throw new Error(questionResult.error.message);
  }

  if (chapterResult.error) {
    if (chapterResult.error.message?.includes('chapters')) {
      throw new Error('Please apply the latest chapters database migration before loading modules.');
    }

    throw new Error(chapterResult.error.message);
  }

  const { data: reviewRows, error: reviewError } = await supabase
    .from('module_review_requests')
    .select('*')
    .in('module_id', moduleIds)
    .order('submitted_at', { ascending: false });

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  const questionRows = questionResult.data || [];
  const chapterRows = chapterResult.data || [];
  const questionCountsByChapter = questionRows.reduce((collection, question) => {
    if (question.chapter_id) {
      collection.set(question.chapter_id, (collection.get(question.chapter_id) || 0) + 1);
    }

    return collection;
  }, new Map());
  const chaptersById = chapterRows.reduce((collection, chapter) => {
    collection.set(chapter.id, toChapter(chapter, questionCountsByChapter.get(chapter.id) || 0));
    return collection;
  }, new Map());
  const chaptersByModule = chapterRows.reduce((collection, chapter) => {
    const mappedChapter = toChapter(chapter, questionCountsByChapter.get(chapter.id) || 0);
    const moduleChapters = collection.get(chapter.module_id) || [];
    moduleChapters.push(mappedChapter);
    collection.set(chapter.module_id, moduleChapters);
    return collection;
  }, new Map());

  const questionsByModule = questionRows.reduce((collection, question) => {
    const moduleQuestions = collection.get(question.module_id) || [];
    moduleQuestions.push(toQuestion(question, chaptersById.get(question.chapter_id) || null));
    collection.set(question.module_id, moduleQuestions);
    return collection;
  }, new Map());
  const latestReviewByModule = getLatestReviewByModule(reviewRows || []);

  return moduleRows.map((module) =>
    toModule(
      module,
      questionsByModule.get(module.id) || [],
      latestReviewByModule.get(module.id) || null,
      (chaptersByModule.get(module.id) || []).filter((chapter) => !chapter.isDeleted),
      chaptersByModule.get(module.id) || [],
    ),
  );
}

export async function createTeacherModule(teacherId, moduleForm) {
  const { data, error } = await supabase
    .from('modules')
    .insert({
      teacher_id: teacherId,
      title: moduleForm.title.trim(),
      description: moduleForm.description.trim() || null,
      visibility: 'private',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toModule(data);
}

export async function updateTeacherModuleVisibility(moduleId, visibility) {
  const { data, error } = await supabase
    .from('modules')
    .update({ visibility })
    .eq('id', moduleId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toModule(data);
}

export async function updateTeacherModuleDetails(moduleId, moduleForm) {
  const { data, error } = await supabase
    .from('modules')
    .update({
      title: moduleForm.title.trim(),
      description: moduleForm.description.trim() || null,
    })
    .eq('id', moduleId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toModule(data);
}

export async function deleteTeacherModule(moduleId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error } = await supabase
    .from('modules')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: sessionData.session?.user?.id || null,
    })
    .eq('id', moduleId);

  if (error) {
    throw new Error(error.message);
  }
}
