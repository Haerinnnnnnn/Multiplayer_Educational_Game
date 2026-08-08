create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  student_code text unique,
  name text not null,
  email text not null unique,
  birthday date not null,
  school_name text not null,
  grade text not null,
  course text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  teacher_code text unique,
  name text not null,
  email text not null unique,
  birthday date not null,
  school_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.assign_student_code()
returns trigger
language plpgsql
as $$
begin
  if new.student_code is null then
    new.student_code = 'S' || lpad(nextval('public.student_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

create or replace function public.assign_teacher_code()
returns trigger
language plpgsql
as $$
begin
  if new.teacher_code is null then
    new.teacher_code = 'T' || lpad(nextval('public.teacher_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists students_assign_code on public.students;
create trigger students_assign_code
before insert on public.students
for each row execute function public.assign_student_code();

drop trigger if exists teachers_assign_code on public.teachers;
create trigger teachers_assign_code
before insert on public.teachers
for each row execute function public.assign_teacher_code();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists teachers_set_updated_at on public.teachers;
create trigger teachers_set_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

insert into public.students (id, student_code, name, email, birthday, school_name, grade, course, created_at, updated_at)
select id, user_code, name, email, birthday, school_name, grade, course, created_at, updated_at
from public.profiles
where role = 'student'
on conflict (id) do nothing;

insert into public.teachers (id, teacher_code, name, email, birthday, school_name, created_at, updated_at)
select id, user_code, name, email, birthday, school_name, created_at, updated_at
from public.profiles
where role = 'teacher'
on conflict (id) do nothing;

alter table public.modules drop constraint if exists modules_teacher_id_fkey;
alter table public.modules
  add constraint modules_teacher_id_fkey
  foreign key (teacher_id) references public.teachers(id) on delete set null;

alter table public.sessions drop constraint if exists sessions_teacher_id_fkey;
alter table public.sessions
  add constraint sessions_teacher_id_fkey
  foreign key (teacher_id) references public.teachers(id) on delete set null;

alter table public.participants drop constraint if exists participants_student_id_fkey;
alter table public.participants
  add constraint participants_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null;

alter table public.students enable row level security;
alter table public.teachers enable row level security;

create policy "Students can insert own student record"
on public.students for insert
to authenticated
with check (auth.uid() = id);

create policy "Students can view own student record"
on public.students for select
to authenticated
using (auth.uid() = id);

create policy "Students can update own student record"
on public.students for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Teachers can insert own teacher record"
on public.teachers for insert
to authenticated
with check (auth.uid() = id);

create policy "Teachers can view own teacher record"
on public.teachers for select
to authenticated
using (auth.uid() = id);

create policy "Teachers can update own teacher record"
on public.teachers for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.teachers to authenticated;
