alter table public.students
add column if not exists presence_status text not null default 'offline',
add column if not exists last_seen_at timestamptz;

alter table public.teachers
add column if not exists presence_status text not null default 'offline',
add column if not exists last_seen_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_presence_status_check'
  ) then
    alter table public.students
    add constraint students_presence_status_check
    check (presence_status in ('online', 'offline'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'teachers_presence_status_check'
  ) then
    alter table public.teachers
    add constraint teachers_presence_status_check
    check (presence_status in ('online', 'offline'));
  end if;
end;
$$;
