grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.students to service_role;
grant select, insert, update, delete on public.teachers to service_role;
grant select, insert, update, delete on public.modules to service_role;
grant select, insert, update, delete on public.questions to service_role;
grant select, insert, update, delete on public.sessions to service_role;
grant select, insert, update, delete on public.participants to service_role;
grant select, insert, update, delete on public.responses to service_role;

grant usage, select on sequence public.student_code_seq to service_role;
grant usage, select on sequence public.teacher_code_seq to service_role;
grant usage, select on sequence public.admin_code_seq to service_role;
