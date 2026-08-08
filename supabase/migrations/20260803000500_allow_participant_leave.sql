drop policy if exists "Students can leave own session participant row" on public.participants;
create policy "Students can leave own session participant row"
on public.participants for delete
to authenticated
using (student_id = auth.uid());

drop policy if exists "Teachers can remove participants from own sessions" on public.participants;
create policy "Teachers can remove participants from own sessions"
on public.participants for delete
to authenticated
using (
  exists (
    select 1 from public.sessions
    where sessions.id = participants.session_id
    and sessions.teacher_id = auth.uid()
  )
);
