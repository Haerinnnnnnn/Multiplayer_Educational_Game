create or replace function public.find_student_for_module_invite(
  target_module_id bigint,
  search_text text
)
returns table (
  student_id uuid,
  student_code text,
  name text,
  email text,
  school_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := lower(trim(coalesce(search_text, '')));
begin
  if not exists (
    select 1 from public.modules
    where modules.id = target_module_id
    and (
      modules.teacher_id = auth.uid()
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
      )
    )
  ) then
    raise exception 'You cannot manage students for this module.';
  end if;

  return query
  select students.id, students.student_code, students.name, students.email, students.school_name
  from public.students
  where lower(students.email) = normalized_search
     or lower(students.student_code) = normalized_search
  limit 1;
end;
$$;

create or replace function public.list_students_for_module_invite(
  target_module_id bigint,
  search_text text default ''
)
returns table (
  student_id uuid,
  student_code text,
  name text,
  email text,
  school_name text,
  grade text,
  course text,
  is_member boolean,
  request_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := lower(trim(coalesce(search_text, '')));
begin
  if not exists (
    select 1 from public.modules
    where modules.id = target_module_id
    and (
      modules.teacher_id = auth.uid()
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
      )
    )
  ) then
    raise exception 'You cannot view students for this module.';
  end if;

  return query
  select
    students.id,
    students.student_code,
    students.name,
    students.email,
    students.school_name,
    students.grade,
    students.course,
    exists (
      select 1 from public.module_members
      where module_members.module_id = target_module_id
      and module_members.student_id = students.id
    ) as is_member,
    (
      select module_join_requests.status
      from public.module_join_requests
      where module_join_requests.module_id = target_module_id
      and module_join_requests.student_id = students.id
      order by module_join_requests.created_at desc
      limit 1
    ) as request_status
  from public.students
  where normalized_search = ''
     or lower(students.student_code) like '%' || normalized_search || '%'
     or lower(students.name) like '%' || normalized_search || '%'
     or lower(students.email) like '%' || normalized_search || '%'
     or lower(students.school_name) like '%' || normalized_search || '%'
  order by students.student_code asc
  limit 80;
end;
$$;

grant execute on function public.find_student_for_module_invite(bigint, text) to authenticated;
grant execute on function public.list_students_for_module_invite(bigint, text) to authenticated;
