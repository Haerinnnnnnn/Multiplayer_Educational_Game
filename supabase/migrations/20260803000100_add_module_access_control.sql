alter table public.modules
add column if not exists visibility text not null default 'private',
add constraint modules_visibility_check check (visibility in ('public', 'private'));

update public.modules
set visibility = 'private'
where visibility is null or visibility not in ('public', 'private');

create table if not exists public.module_members (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  added_by_teacher_id uuid references public.teachers(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (module_id, student_id)
);

create table if not exists public.module_join_requests (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'pending',
  request_message text,
  teacher_response text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (module_id, student_id),
  constraint module_join_requests_status_check check (status in ('pending', 'approved', 'rejected'))
);

alter table public.module_members enable row level security;
alter table public.module_join_requests enable row level security;

drop policy if exists "Module members visible to related users" on public.module_members;
create policy "Module members visible to related users"
on public.module_members for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.modules
    where modules.id = module_members.module_id
    and modules.teacher_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

drop policy if exists "Students and teachers can add module members" on public.module_members;
create policy "Students and teachers can add module members"
on public.module_members for insert
to authenticated
with check (
  (
    student_id = auth.uid()
    and exists (
      select 1 from public.modules
      where modules.id = module_members.module_id
      and modules.visibility = 'public'
      and modules.is_locked is not true
    )
  )
  or exists (
    select 1 from public.modules
    where modules.id = module_members.module_id
    and modules.teacher_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

drop policy if exists "Module members can be removed by related users" on public.module_members;
create policy "Module members can be removed by related users"
on public.module_members for delete
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.modules
    where modules.id = module_members.module_id
    and modules.teacher_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

drop policy if exists "Module requests visible to related users" on public.module_join_requests;
create policy "Module requests visible to related users"
on public.module_join_requests for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.modules
    where modules.id = module_join_requests.module_id
    and modules.teacher_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

drop policy if exists "Students can create own module requests" on public.module_join_requests;
create policy "Students can create own module requests"
on public.module_join_requests for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.modules
    where modules.id = module_join_requests.module_id
    and modules.visibility = 'private'
    and modules.is_locked is not true
  )
);

drop policy if exists "Students can refresh own module requests" on public.module_join_requests;
create policy "Students can refresh own module requests"
on public.module_join_requests for update
to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "Teachers can review own module requests" on public.module_join_requests;
create policy "Teachers can review own module requests"
on public.module_join_requests for update
to authenticated
using (
  exists (
    select 1 from public.modules
    where modules.id = module_join_requests.module_id
    and modules.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.modules
    where modules.id = module_join_requests.module_id
    and modules.teacher_id = auth.uid()
  )
);

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
  where lower(students.email) = lower(trim(search_text))
     or lower(students.student_code) = lower(trim(search_text))
  limit 1;
end;
$$;

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
    'member'::text,
    null::bigint,
    students.id,
    students.student_code,
    students.name,
    students.email,
    students.school_name,
    'joined'::text,
    null::text,
    null::text,
    module_members.joined_at
  from public.module_members
  join public.students on students.id = module_members.student_id
  where module_members.module_id = target_module_id

  union all

  select
    'request'::text,
    module_join_requests.id,
    students.id,
    students.student_code,
    students.name,
    students.email,
    students.school_name,
    module_join_requests.status,
    module_join_requests.request_message,
    module_join_requests.teacher_response,
    module_join_requests.created_at
  from public.module_join_requests
  join public.students on students.id = module_join_requests.student_id
  where module_join_requests.module_id = target_module_id
  and not exists (
    select 1 from public.module_members
    where module_members.module_id = module_join_requests.module_id
    and module_members.student_id = module_join_requests.student_id
  )
  order by created_at desc;
end;
$$;

create or replace function public.review_module_join_request(
  target_request_id bigint,
  next_status text,
  response_text text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.module_join_requests%rowtype;
  module_teacher_id uuid;
begin
  if next_status not in ('approved', 'rejected') then
    raise exception 'Request status must be approved or rejected.';
  end if;

  select *
  into request_row
  from public.module_join_requests
  where id = target_request_id;

  if request_row.id is null then
    raise exception 'Join request not found.';
  end if;

  select teacher_id
  into module_teacher_id
  from public.modules
  where id = request_row.module_id
  and (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

  if module_teacher_id is null then
    raise exception 'You cannot review this request.';
  end if;

  update public.module_join_requests
  set
    status = next_status,
    teacher_response = nullif(trim(coalesce(response_text, '')), ''),
    reviewed_at = now()
  where id = target_request_id;

  if next_status = 'approved' then
    insert into public.module_members (module_id, student_id, added_by_teacher_id)
    values (request_row.module_id, request_row.student_id, module_teacher_id)
    on conflict (module_id, student_id) do nothing;
  end if;
end;
$$;

grant select, insert, delete on public.module_members to authenticated;
grant select, insert, update on public.module_join_requests to authenticated;
grant usage, select on sequence public.module_members_id_seq to authenticated;
grant usage, select on sequence public.module_join_requests_id_seq to authenticated;
grant execute on function public.find_student_for_module_invite(bigint, text) to authenticated;
grant execute on function public.get_module_student_access(bigint) to authenticated;
grant execute on function public.review_module_join_request(bigint, text, text) to authenticated;

grant select, insert, update, delete on public.module_members to service_role;
grant select, insert, update, delete on public.module_join_requests to service_role;
grant usage, select on sequence public.module_members_id_seq to service_role;
grant usage, select on sequence public.module_join_requests_id_seq to service_role;
