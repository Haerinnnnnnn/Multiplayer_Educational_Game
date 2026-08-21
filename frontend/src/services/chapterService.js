import { supabase } from './supabaseClient.js';

export function toChapter(row, questionCount = 0) {
  return {
    id: row.id,
    chapterCode: row.chapter_code,
    moduleId: row.module_id,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description || '',
    sortOrder: row.sort_order || 0,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    questionCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createModuleChapter({ moduleId, chapterForm }) {
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      module_id: Number(moduleId),
      title: chapterForm.title.trim(),
      description: chapterForm.description.trim() || null,
      sort_order: Number(chapterForm.sortOrder) || 0,
    })
    .select('*')
    .single();

  if (error) {
    if (error.message?.includes('relation "public.chapters" does not exist') || error.message?.includes('chapters')) {
      throw new Error('Please apply the latest topic database migration before creating topics.');
    }

    if (error.message?.includes('permission denied for sequence')) {
      throw new Error('Please apply the latest topic permission migration before creating topics.');
    }

    throw new Error(error.message);
  }

  return toChapter(data);
}

export async function updateModuleChapter(chapterId, chapterForm) {
  const { data, error } = await supabase
    .from('chapters')
    .update({
      title: chapterForm.title.trim(),
      description: chapterForm.description.trim() || null,
      sort_order: Number(chapterForm.sortOrder) || 0,
    })
    .eq('id', Number(chapterId))
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toChapter(data);
}

export async function deleteModuleChapter(chapterId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error } = await supabase
    .from('chapters')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: sessionData.session?.user?.id || null,
    })
    .eq('id', Number(chapterId));

  if (error) {
    throw new Error(error.message);
  }
}
