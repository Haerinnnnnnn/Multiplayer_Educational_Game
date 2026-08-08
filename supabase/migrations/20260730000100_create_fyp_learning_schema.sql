create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.session_status as enum ('lobby', 'live', 'ended');

create sequence public.student_code_seq start with 1 increment by 1;
create sequence public.teacher_code_seq start with 1 increment by 1;
create sequence public.admin_code_seq start with 1 increment by 1;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_code text unique,
  role public.user_role not null,
  name text not null,
  email text not null unique,
  birthday date not null,
  school_name text not null,
  grade text,
  course text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profile_fields check (
    role <> 'student'
    or (grade is not null and length(trim(grade)) > 0 and course is not null and length(trim(course)) > 0)
  )
);

create table public.modules (
  id bigint generated always as identity primary key,
  teacher_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  question_text text not null,
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  session_code text not null unique,
  question_count integer not null default 1,
  status public.session_status not null default 'lobby',
  current_question_index integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.participants (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  student_name text not null,
  score integer not null default 0,
  joined_at timestamptz not null default now()
);

create table public.responses (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions(id) on delete cascade,
  participant_id bigint not null references public.participants(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null default false,
  score_awarded integer not null default 0,
  submitted_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.assign_profile_user_code()
returns trigger
language plpgsql
as $$
begin
  if new.user_code is null then
    if new.role = 'student' then
      new.user_code = 'S' || lpad(nextval('public.student_code_seq')::text, 3, '0');
    elsif new.role = 'teacher' then
      new.user_code = 'T' || lpad(nextval('public.teacher_code_seq')::text, 3, '0');
    elsif new.role = 'admin' then
      new.user_code = 'A' || lpad(nextval('public.admin_code_seq')::text, 3, '0');
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_assign_user_code
before insert on public.profiles
for each row execute function public.assign_profile_user_code();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Teachers can manage own modules"
on public.modules for all
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "Authenticated users can view modules"
on public.modules for select
to authenticated
using (true);

create policy "Teachers can manage questions for own modules"
on public.questions for all
to authenticated
using (
  exists (
    select 1 from public.modules
    where modules.id = questions.module_id
    and modules.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.modules
    where modules.id = questions.module_id
    and modules.teacher_id = auth.uid()
  )
);

create policy "Authenticated users can view questions"
on public.questions for select
to authenticated
using (true);

create policy "Teachers can manage own sessions"
on public.sessions for all
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "Authenticated users can view sessions"
on public.sessions for select
to authenticated
using (true);

create policy "Authenticated users can join sessions"
on public.participants for insert
to authenticated
with check (student_id = auth.uid());

create policy "Authenticated users can view participants"
on public.participants for select
to authenticated
using (true);

create policy "Authenticated users can create responses"
on public.responses for insert
to authenticated
with check (true);

create policy "Authenticated users can view responses"
on public.responses for select
to authenticated
using (true);
