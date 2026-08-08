import { supabase } from './supabaseClient.js';

export function toModuleReviewRequest(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    moduleId: row.module_id,
    teacherId: row.teacher_id,
    message: row.message,
    status: row.status,
    adminFeedback: row.admin_feedback || '',
    reviewedBy: row.reviewed_by,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
  };
}

export function getLatestReviewByModule(reviewRows = []) {
  return reviewRows.reduce((collection, reviewRow) => {
    const review = toModuleReviewRequest(reviewRow);
    const currentReview = collection.get(review.moduleId);

    if (
      !currentReview ||
      new Date(review.submittedAt || review.updatedAt) >
        new Date(currentReview.submittedAt || currentReview.updatedAt)
    ) {
      collection.set(review.moduleId, review);
    }

    return collection;
  }, new Map());
}

export async function submitModuleReviewRequest({ moduleId, teacherId, message }) {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error('Please enter a message for admin.');
  }

  const { data: pendingRequest, error: pendingError } = await supabase
    .from('module_review_requests')
    .select('*')
    .eq('module_id', Number(moduleId))
    .eq('teacher_id', teacherId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingError) {
    throw new Error(pendingError.message);
  }

  if (pendingRequest) {
    const { data, error } = await supabase
      .from('module_review_requests')
      .update({
        message: cleanMessage,
        submitted_at: new Date().toISOString(),
        admin_feedback: null,
      })
      .eq('id', pendingRequest.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toModuleReviewRequest(data);
  }

  const { data, error } = await supabase
    .from('module_review_requests')
    .insert({
      module_id: Number(moduleId),
      teacher_id: teacherId,
      message: cleanMessage,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toModuleReviewRequest(data);
}
