alter table public.chapters
add column if not exists is_deleted boolean not null default false,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid;

create index if not exists chapters_deleted_idx on public.chapters(is_deleted, deleted_at);

create or replace function public.assign_question_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  chapter_module_id bigint;
  chapter_is_deleted boolean;
begin
  select teacher_id into owner_id
  from public.modules
  where id = new.module_id;

  if owner_id is null then
    raise exception 'Selected module does not belong to a teacher.';
  end if;

  if new.teacher_id is null then
    new.teacher_id = owner_id;
  end if;

  if new.teacher_id <> owner_id then
    raise exception 'Question teacher must match module teacher.';
  end if;

  if new.chapter_id is not null then
    select module_id, is_deleted into chapter_module_id, chapter_is_deleted
    from public.chapters
    where id = new.chapter_id;

    if chapter_module_id is null or chapter_module_id <> new.module_id then
      raise exception 'Question topic must belong to the selected module.';
    end if;

    if chapter_is_deleted is true then
      raise exception 'Question topic has been deleted and cannot be used.';
    end if;
  end if;

  if new.question_code is null then
    new.question_code = 'Q' || lpad(nextval('public.question_code_seq')::text, 3, '0');
  end if;

  if new.question_type is null then
    new.question_type = 'mcq';
  end if;

  if new.answer_text is null then
    new.answer_text = new.correct_option;
  end if;

  return new;
end;
$$;
