alter table public.sessions
add column if not exists question_ids jsonb not null default '[]'::jsonb,
add column if not exists question_selection_mode text not null default 'random';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_question_selection_mode_check'
  ) then
    alter table public.sessions
    add constraint sessions_question_selection_mode_check
    check (question_selection_mode in ('random', 'manual'));
  end if;
end;
$$;
