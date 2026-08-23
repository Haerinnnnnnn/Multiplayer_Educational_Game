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
    where id = new.id
      or lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

update public.teachers as teacher
set
  approval_status = 'pending',
  email_verified_at = coalesce(teacher.email_verified_at, auth_user.email_confirmed_at),
  updated_at = now()
from auth.users as auth_user
where teacher.approval_status = 'awaiting_email'
  and auth_user.email_confirmed_at is not null
  and (
    teacher.id = auth_user.id
    or lower(teacher.email) = lower(auth_user.email)
  );
