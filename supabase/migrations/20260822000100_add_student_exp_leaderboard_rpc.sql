create or replace function public.get_student_exp_leaderboard(limit_count integer default 10)
returns table (
  student_id uuid,
  student_code text,
  student_name text,
  total_exp integer,
  level integer
)
language sql
security definer
set search_path = public
as $$
  select
    students.id as student_id,
    students.student_code,
    coalesce(nullif(trim(students.name), ''), 'Student') as student_name,
    coalesce(students.total_exp, 0) as total_exp,
    coalesce(students.level, 1) as level
  from public.students
  order by
    coalesce(students.total_exp, 0) desc,
    coalesce(students.level, 1) desc,
    coalesce(nullif(trim(students.name), ''), 'Student') asc
  limit greatest(1, least(coalesce(limit_count, 10), 50));
$$;

revoke all on function public.get_student_exp_leaderboard(integer) from public;
grant execute on function public.get_student_exp_leaderboard(integer) to authenticated;
