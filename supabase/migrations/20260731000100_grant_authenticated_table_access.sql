grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.modules to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
grant select, insert, update, delete on public.responses to authenticated;

grant usage, select on sequence public.student_code_seq to authenticated;
grant usage, select on sequence public.teacher_code_seq to authenticated;
grant usage, select on sequence public.admin_code_seq to authenticated;
