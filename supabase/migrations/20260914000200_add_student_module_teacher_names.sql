create or replace function public.get_student_modules_with_teachers(target_student_id uuid)
returns table (
  id bigint,
  module_code text,
  teacher_id uuid,
  teacher_name text,
  title text,
  description text,
  visibility text,
  is_deleted boolean,
  is_locked boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    modules.id,
    modules.module_code,
    modules.teacher_id,
    coalesce(nullif(trim(teachers.name), ''), 'Unknown teacher') as teacher_name,
    modules.title,
    modules.description,
    modules.visibility,
    modules.is_deleted,
    modules.is_locked,
    modules.created_at,
    modules.updated_at
  from public.modules
  left join public.teachers on teachers.id = modules.teacher_id
  where auth.uid() = target_student_id
    and coalesce(modules.is_deleted, false) = false
  order by modules.created_at desc;
$$;

revoke all on function public.get_student_modules_with_teachers(uuid) from public;
grant execute on function public.get_student_modules_with_teachers(uuid) to authenticated;

