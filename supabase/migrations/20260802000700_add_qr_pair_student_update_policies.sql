drop policy if exists "Students can update joined sessions" on public.sessions;
create policy "Students can update joined sessions"
on public.sessions for update
to authenticated
using (
  exists (
    select 1
    from public.participants
    where participants.session_id = sessions.id
    and participants.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.participants
    where participants.session_id = sessions.id
    and participants.student_id = auth.uid()
  )
);

drop policy if exists "Students can update own participant row" on public.participants;
create policy "Students can update own participant row"
on public.participants for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());
