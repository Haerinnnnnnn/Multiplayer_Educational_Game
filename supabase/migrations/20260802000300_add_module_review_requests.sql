do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'review_request_status'
  ) then
    create type public.review_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end;
$$;

create table if not exists public.module_review_requests (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  message text not null,
  status public.review_request_status not null default 'pending',
  admin_feedback text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists module_review_requests_one_pending_per_module
on public.module_review_requests(module_id)
where status = 'pending';

create index if not exists module_review_requests_module_id_idx
on public.module_review_requests(module_id);

create index if not exists module_review_requests_teacher_id_idx
on public.module_review_requests(teacher_id);

drop trigger if exists module_review_requests_set_updated_at on public.module_review_requests;
create trigger module_review_requests_set_updated_at
before update on public.module_review_requests
for each row execute function public.set_updated_at();

alter table public.module_review_requests enable row level security;

drop policy if exists "Teachers can create own module review requests" on public.module_review_requests;
create policy "Teachers can create own module review requests"
on public.module_review_requests for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.modules
    where modules.id = module_review_requests.module_id
    and modules.teacher_id = auth.uid()
  )
);

drop policy if exists "Teachers can view own module review requests" on public.module_review_requests;
create policy "Teachers can view own module review requests"
on public.module_review_requests for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "Teachers can update own pending module review requests" on public.module_review_requests;
create policy "Teachers can update own pending module review requests"
on public.module_review_requests for update
to authenticated
using (teacher_id = auth.uid() and status = 'pending')
with check (teacher_id = auth.uid() and status = 'pending');

drop policy if exists "Admins can view module review requests" on public.module_review_requests;
create policy "Admins can view module review requests"
on public.module_review_requests for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update module review requests" on public.module_review_requests;
create policy "Admins can update module review requests"
on public.module_review_requests for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

grant select, insert, update on public.module_review_requests to authenticated;
grant select, insert, update, delete on public.module_review_requests to service_role;
grant usage, select on sequence public.module_review_requests_id_seq to authenticated;
grant usage, select on sequence public.module_review_requests_id_seq to service_role;
