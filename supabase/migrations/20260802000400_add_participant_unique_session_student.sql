create unique index if not exists participants_one_student_per_session
on public.participants(session_id, student_id)
where student_id is not null;
