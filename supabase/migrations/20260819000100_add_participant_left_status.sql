alter table public.participants
add column if not exists status text not null default 'active',
add column if not exists left_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'participants_status_check'
  ) then
    alter table public.participants
    drop constraint participants_status_check;
  end if;

  alter table public.participants
  add constraint participants_status_check
  check (status in ('active', 'left', 'kicked'));
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'responses_response_status_check'
  ) then
    alter table public.responses
    drop constraint responses_response_status_check;
  end if;

  alter table public.responses
  add constraint responses_response_status_check
  check (response_status in ('correct', 'wrong', 'timeout', 'left'));
end;
$$;
