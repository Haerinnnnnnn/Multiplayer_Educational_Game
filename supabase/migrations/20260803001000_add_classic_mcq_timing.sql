alter table public.sessions
add column if not exists timer_enabled boolean not null default true;

alter table public.responses
add column if not exists answered_seconds integer,
add column if not exists response_status text not null default 'correct';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'responses_response_status_check'
  ) then
    alter table public.responses
    add constraint responses_response_status_check
    check (response_status in ('correct', 'wrong', 'timeout'));
  end if;
end;
$$;

update public.responses
set response_status = case when is_correct then 'correct' else 'wrong' end
where response_status is null;

delete from public.responses kept
using public.responses duplicate
where duplicate.session_id = kept.session_id
and duplicate.participant_id = kept.participant_id
and duplicate.question_id = kept.question_id
and duplicate.id > kept.id;

create unique index if not exists responses_one_answer_per_question
on public.responses(session_id, participant_id, question_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.responses;
  exception
    when duplicate_object then null;
  end;
end;
$$;
