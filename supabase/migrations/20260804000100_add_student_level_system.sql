alter table public.students
add column if not exists total_exp integer not null default 0,
add column if not exists level integer not null default 1;

alter table public.students
drop constraint if exists students_total_exp_check;

alter table public.students
add constraint students_total_exp_check
check (total_exp >= 0);

alter table public.students
drop constraint if exists students_level_check;

alter table public.students
add constraint students_level_check
check (level >= 1);

create table if not exists public.student_exp_logs (
  id bigserial primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  session_id bigint not null references public.sessions(id) on delete cascade,
  participant_id bigint references public.participants(id) on delete set null,
  exp_gained integer not null check (exp_gained >= 0),
  session_score integer not null default 0,
  completion_bonus integer not null default 0,
  ranking_bonus integer not null default 0,
  rank integer,
  old_level integer not null default 1,
  new_level integer not null default 1,
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

alter table public.student_exp_logs enable row level security;

create or replace function public.calculate_student_level(exp_total integer)
returns integer
language plpgsql
immutable
as $$
declare
  thresholds integer[] := array[0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];
  calculated_level integer := 1;
  index_number integer;
begin
  for index_number in 1..array_length(thresholds, 1) loop
    if greatest(exp_total, 0) >= thresholds[index_number] then
      calculated_level := index_number;
    end if;
  end loop;

  return calculated_level;
end;
$$;

create or replace function public.settle_session_experience(target_session_id bigint)
returns table (
  id bigint,
  student_id uuid,
  session_id bigint,
  participant_id bigint,
  exp_gained integer,
  session_score integer,
  completion_bonus integer,
  ranking_bonus integer,
  rank integer,
  old_level integer,
  new_level integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.sessions%rowtype;
  participant_row record;
  old_total_exp integer;
  old_student_level integer;
  next_total_exp integer;
  next_student_level integer;
  gained_exp integer;
  completion_exp integer;
  rank_exp integer;
  inserted_log_id bigint;
begin
  select *
  into session_row
  from public.sessions
  where sessions.id = target_session_id;

  if not found then
    raise exception 'Session not found.';
  end if;

  if session_row.status <> 'ended' then
    raise exception 'Experience can only be settled after the session has ended.';
  end if;

  if not (
    session_row.teacher_id = auth.uid()
    or exists (
      select 1
      from public.participants
      where participants.session_id = target_session_id
      and participants.student_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  ) then
    raise exception 'You cannot settle experience for this session.';
  end if;

  for participant_row in
    select
      participants.id as participant_id,
      participants.student_id,
      greatest(coalesce(participants.score, 0), 0) as session_score,
      row_number() over (
        order by coalesce(participants.score, 0) desc, participants.joined_at asc, participants.id asc
      ) as player_rank
    from public.participants
    where participants.session_id = target_session_id
    and participants.student_id is not null
  loop
    inserted_log_id := null;
    completion_exp := 20;
    rank_exp := case participant_row.player_rank
      when 1 then 30
      when 2 then 20
      when 3 then 10
      else 0
    end;
    gained_exp := participant_row.session_score + completion_exp + rank_exp;

    select students.total_exp, students.level
    into old_total_exp, old_student_level
    from public.students
    where students.id = participant_row.student_id
    for update;

    if found then
      next_total_exp := old_total_exp + gained_exp;
      next_student_level := public.calculate_student_level(next_total_exp);

      insert into public.student_exp_logs (
        student_id,
        session_id,
        participant_id,
        exp_gained,
        session_score,
        completion_bonus,
        ranking_bonus,
        rank,
        old_level,
        new_level
      )
      values (
        participant_row.student_id,
        target_session_id,
        participant_row.participant_id,
        gained_exp,
        participant_row.session_score,
        completion_exp,
        rank_exp,
        participant_row.player_rank,
        old_student_level,
        next_student_level
      )
      on conflict on constraint student_exp_logs_student_id_session_id_key do nothing
      returning student_exp_logs.id into inserted_log_id;

      if inserted_log_id is not null then
        update public.students
        set
          total_exp = next_total_exp,
          level = next_student_level,
          updated_at = now()
        where students.id = participant_row.student_id;
      end if;
    end if;
  end loop;

  return query
  select
    logs.id,
    logs.student_id,
    logs.session_id,
    logs.participant_id,
    logs.exp_gained,
    logs.session_score,
    logs.completion_bonus,
    logs.ranking_bonus,
    logs.rank,
    logs.old_level,
    logs.new_level,
    logs.created_at
  from public.student_exp_logs logs
  where logs.session_id = target_session_id
  order by logs.rank asc nulls last, logs.created_at asc;
end;
$$;

drop policy if exists "Students can view own experience logs" on public.student_exp_logs;
create policy "Students can view own experience logs"
on public.student_exp_logs for select
to authenticated
using (student_exp_logs.student_id = auth.uid());

drop policy if exists "Teachers can view own session experience logs" on public.student_exp_logs;
create policy "Teachers can view own session experience logs"
on public.student_exp_logs for select
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = student_exp_logs.session_id
    and sessions.teacher_id = auth.uid()
  )
);

drop policy if exists "Admins can view all experience logs" on public.student_exp_logs;
create policy "Admins can view all experience logs"
on public.student_exp_logs for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

grant select on public.student_exp_logs to authenticated;
grant execute on function public.calculate_student_level(integer) to authenticated;
grant execute on function public.settle_session_experience(bigint) to authenticated;
