alter table public.teachers
add column if not exists approval_status text,
add column if not exists approval_message text,
add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
add column if not exists reviewed_at timestamptz,
add column if not exists email_verified_at timestamptz;

update public.teachers
set
  approval_status = coalesce(approval_status, 'approved'),
  email_verified_at = coalesce(email_verified_at, created_at)
where approval_status is null;

alter table public.teachers
alter column approval_status set default 'awaiting_email',
alter column approval_status set not null;

alter table public.teachers
drop constraint if exists teachers_approval_status_check;

alter table public.teachers
add constraint teachers_approval_status_check
check (approval_status in ('awaiting_email', 'pending', 'approved', 'rejected'));

create index if not exists teachers_approval_status_idx
on public.teachers(approval_status, created_at desc);

create or replace function public.queue_verified_teacher_for_approval()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email_confirmed_at is not null
    and old.email_confirmed_at is null then
    update public.teachers
    set
      approval_status = case
        when approval_status = 'awaiting_email' then 'pending'
        else approval_status
      end,
      email_verified_at = coalesce(email_verified_at, new.email_confirmed_at),
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists teacher_email_confirmation_requests_approval on auth.users;
create trigger teacher_email_confirmation_requests_approval
after update of email_confirmed_at on auth.users
for each row execute function public.queue_verified_teacher_for_approval();

create or replace function public.protect_teacher_approval_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and (
    new.approval_status is distinct from old.approval_status
    or new.approval_message is distinct from old.approval_message
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.email_verified_at is distinct from old.email_verified_at
  ) then
    raise exception 'Teacher approval fields can only be changed by an administrator.';
  end if;

  return new;
end;
$$;

drop trigger if exists teachers_protect_approval_fields on public.teachers;
create trigger teachers_protect_approval_fields
before update on public.teachers
for each row execute function public.protect_teacher_approval_fields();

create or replace function public.is_teacher_approved(teacher_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers
    where id = teacher_user_id
      and approval_status = 'approved'
  );
$$;

grant execute on function public.is_teacher_approved(uuid) to authenticated;
grant execute on function public.is_teacher_approved(uuid) to service_role;

drop policy if exists "Teachers can manage own modules" on public.modules;
create policy "Teachers can manage own modules"
on public.modules for all
to authenticated
using (teacher_id = auth.uid() and public.is_teacher_approved(auth.uid()))
with check (teacher_id = auth.uid() and public.is_teacher_approved(auth.uid()));

drop policy if exists "Teachers can manage questions for own modules" on public.questions;
create policy "Teachers can manage questions for own modules"
on public.questions for all
to authenticated
using (
  public.is_teacher_approved(auth.uid())
  and exists (
    select 1 from public.modules
    where modules.id = questions.module_id
      and modules.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher_approved(auth.uid())
  and exists (
    select 1 from public.modules
    where modules.id = questions.module_id
      and modules.teacher_id = auth.uid()
  )
);

drop policy if exists "Teachers can manage own sessions" on public.sessions;
create policy "Teachers can manage own sessions"
on public.sessions for all
to authenticated
using (teacher_id = auth.uid() and public.is_teacher_approved(auth.uid()))
with check (teacher_id = auth.uid() and public.is_teacher_approved(auth.uid()));

drop policy if exists "Teachers can manage own chapters" on public.chapters;
create policy "Teachers can manage own chapters"
on public.chapters for all
to authenticated
using (
  public.is_teacher_approved(auth.uid())
  and exists (
    select 1 from public.modules
    where modules.id = chapters.module_id
      and modules.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher_approved(auth.uid())
  and exists (
    select 1 from public.modules
    where modules.id = chapters.module_id
      and modules.teacher_id = auth.uid()
  )
);
