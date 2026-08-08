create or replace function public.get_module_student_access(target_module_id bigint)
returns table (
  access_type text,
  request_id bigint,
  student_id uuid,
  student_code text,
  name text,
  email text,
  school_name text,
  status text,
  request_message text,
  teacher_response text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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
    'request'::text as access_type,
    module_join_requests.id as request_id,
    students.id as student_id,
    students.student_code as student_code,
    students.name as name,
    students.email as email,
    students.school_name as school_name,
    module_join_requests.status as status,
    module_join_requests.request_message as request_message,
    module_join_requests.teacher_response as teacher_response,
    module_join_requests.created_at as created_at
  from public.module_join_requests
  join public.students on students.id = module_join_requests.student_id
  where module_join_requests.module_id = target_module_id
  and module_join_requests.status in ('pending', 'rejected')
  and not exists (
    select 1 from public.module_members
    where module_members.module_id = module_join_requests.module_id
    and module_members.student_id = module_join_requests.student_id
  )

  union all

  select
    'member'::text as access_type,
    null::bigint as request_id,
    students.id as student_id,
    students.student_code as student_code,
    students.name as name,
    students.email as email,
    students.school_name as school_name,
    'joined'::text as status,
    null::text as request_message,
    null::text as teacher_response,
    module_members.joined_at as created_at
  from public.module_members
  join public.students on students.id = module_members.student_id
  where module_members.module_id = target_module_id
  order by created_at desc;
end;
$$;

grant execute on function public.get_module_student_access(bigint) to authenticated;
