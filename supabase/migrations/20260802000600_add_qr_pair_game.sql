alter table public.sessions
add column if not exists game_type text not null default 'classic_mcq',
add column if not exists round_seconds integer not null default 60,
add column if not exists wrong_scan_penalty_seconds integer not null default 10;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_game_type_check'
  ) then
    alter table public.sessions
    add constraint sessions_game_type_check
    check (game_type in ('classic_mcq', 'qr_pair_match'));
  end if;
end;
$$;

create table if not exists public.qr_pair_turns (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions(id) on delete cascade,
  turn_number integer not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (session_id, turn_number),
  check (status in ('active', 'completed'))
);

create table if not exists public.qr_pair_assignments (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions(id) on delete cascade,
  turn_id bigint not null references public.qr_pair_turns(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  question_holder_participant_id bigint not null references public.participants(id) on delete cascade,
  answer_holder_participant_id bigint not null references public.participants(id) on delete cascade,
  answer_qr_token text not null unique,
  status text not null default 'pending',
  wrong_scan_count integer not null default 0,
  question_holder_ready boolean not null default false,
  answer_holder_ready boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('pending', 'correct', 'timeout'))
);

alter table public.qr_pair_turns enable row level security;
alter table public.qr_pair_assignments enable row level security;

drop policy if exists "Authenticated users can manage qr pair turns" on public.qr_pair_turns;
create policy "Authenticated users can manage qr pair turns"
on public.qr_pair_turns for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage qr pair assignments" on public.qr_pair_assignments;
create policy "Authenticated users can manage qr pair assignments"
on public.qr_pair_assignments for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.qr_pair_turns to authenticated;
grant select, insert, update, delete on public.qr_pair_assignments to authenticated;
grant usage, select on sequence public.qr_pair_turns_id_seq to authenticated;
grant usage, select on sequence public.qr_pair_assignments_id_seq to authenticated;

grant select, insert, update, delete on public.qr_pair_turns to service_role;
grant select, insert, update, delete on public.qr_pair_assignments to service_role;
grant usage, select on sequence public.qr_pair_turns_id_seq to service_role;
grant usage, select on sequence public.qr_pair_assignments_id_seq to service_role;
