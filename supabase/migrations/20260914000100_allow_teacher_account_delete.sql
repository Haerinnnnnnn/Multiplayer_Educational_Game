create or replace function public.assign_chapter_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select modules.teacher_id into owner_id
  from public.modules
  where modules.id = new.module_id;

  if new.chapter_code is null then
    new.chapter_code = 'CH' || lpad(nextval('public.chapter_code_seq')::text, 3, '0');
  end if;

  if tg_op = 'UPDATE' and new.teacher_id is null and old.teacher_id is not null then
    return new;
  end if;

  if owner_id is null then
    raise exception 'Selected module does not belong to a teacher.';
  end if;

  if new.teacher_id is null then
    new.teacher_id = owner_id;
  end if;

  if new.teacher_id <> owner_id then
    raise exception 'Chapter teacher must match module teacher.';
  end if;

  return new;
end;
$$;

create or replace function public.assign_question_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  chapter_module_id bigint;
begin
  if new.chapter_id is not null then
    select module_id into chapter_module_id
    from public.chapters
    where id = new.chapter_id;

    if chapter_module_id is null or chapter_module_id <> new.module_id then
      raise exception 'Question topic must belong to the selected module.';
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

  if tg_op = 'UPDATE' and new.teacher_id is null and old.teacher_id is not null then
    return new;
  end if;

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

  return new;
end;
$$;