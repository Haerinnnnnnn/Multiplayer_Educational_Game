create sequence if not exists public.question_code_seq start with 1 increment by 1;

alter table public.questions
add column if not exists question_code text,
add column if not exists teacher_id uuid references public.teachers(id) on delete set null,
add column if not exists question_type text default 'mcq',
add column if not exists option_a text,
add column if not exists option_b text,
add column if not exists option_c text,
add column if not exists option_d text,
add column if not exists correct_option text;

alter table public.questions
alter column answer_text drop not null;

with numbered_questions as (
  select id, row_number() over (order by created_at, id) as row_number
  from public.questions
  where question_code is null
)
update public.questions
set question_code = 'Q' || lpad(numbered_questions.row_number::text, 3, '0')
from numbered_questions
where questions.id = numbered_questions.id;

update public.questions
set
  teacher_id = coalesce(public.questions.teacher_id, public.modules.teacher_id),
  question_type = coalesce(public.questions.question_type, 'mcq'),
  option_a = coalesce(public.questions.option_a, public.questions.answer_text, 'Option A'),
  option_b = coalesce(public.questions.option_b, 'Option B'),
  option_c = coalesce(public.questions.option_c, 'Option C'),
  option_d = coalesce(public.questions.option_d, 'Option D'),
  correct_option = coalesce(public.questions.correct_option, 'A')
from public.modules
where public.modules.id = public.questions.module_id;

create unique index if not exists questions_question_code_key
on public.questions(question_code);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_question_type_check'
  ) then
    alter table public.questions
    add constraint questions_question_type_check
    check (question_type in ('mcq'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_correct_option_check'
  ) then
    alter table public.questions
    add constraint questions_correct_option_check
    check (correct_option in ('A', 'B', 'C', 'D'));
  end if;
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

drop trigger if exists questions_assign_defaults on public.questions;
create trigger questions_assign_defaults
before insert or update on public.questions
for each row execute function public.assign_question_defaults();

select setval(
  'public.question_code_seq',
  coalesce((
    select max(substring(question_code from 2)::int)
    from public.questions
    where question_code ~ '^Q[0-9]+$'
  ), 0) + 1,
  false
);

grant usage, select on sequence public.question_code_seq to authenticated;
grant usage, select on sequence public.question_code_seq to service_role;
