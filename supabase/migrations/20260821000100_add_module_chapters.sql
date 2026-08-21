create sequence if not exists public.chapter_code_seq start with 1 increment by 1;

create table if not exists public.chapters (
  id bigint generated always as identity primary key,
  chapter_code text unique,
  module_id bigint not null references public.modules(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
add column if not exists chapter_id bigint references public.chapters(id) on delete set null;

create index if not exists chapters_module_id_idx on public.chapters(module_id);
create index if not exists chapters_teacher_id_idx on public.chapters(teacher_id);
create index if not exists questions_chapter_id_idx on public.questions(chapter_id);

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

  if owner_id is null then
    raise exception 'Selected module does not belong to a teacher.';
  end if;

  if new.teacher_id is null then
    new.teacher_id = owner_id;
  end if;

  if new.teacher_id <> owner_id then
    raise exception 'Chapter teacher must match module teacher.';
  end if;

  if new.chapter_code is null then
    new.chapter_code = 'CH' || lpad(nextval('public.chapter_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists chapters_assign_defaults on public.chapters;
create trigger chapters_assign_defaults
before insert or update on public.chapters
for each row execute function public.assign_chapter_defaults();

drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

alter table public.chapters enable row level security;

drop policy if exists "Teachers can manage own chapters" on public.chapters;
create policy "Teachers can manage own chapters"
on public.chapters for all
to authenticated
using (
  exists (
    select 1 from public.modules
    where modules.id = chapters.module_id
    and modules.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.modules
    where modules.id = chapters.module_id
    and modules.teacher_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can view chapters" on public.chapters;
create policy "Authenticated users can view chapters"
on public.chapters for select
to authenticated
using (true);

grant select, insert, update, delete on public.chapters to authenticated;
grant select, insert, update, delete on public.chapters to service_role;
grant usage, select on sequence public.chapter_code_seq to authenticated;
grant usage, select on sequence public.chapter_code_seq to service_role;

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

  return new;
end;
$$;
