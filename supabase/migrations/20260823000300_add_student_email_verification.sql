alter table public.students
add column if not exists email_verified_at timestamptz;

create index if not exists students_email_verified_at_idx
on public.students(email_verified_at);

create or replace function public.sync_student_email_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
    and old.email_confirmed_at is null then
    update public.students
    set
      email_verified_at = coalesce(email_verified_at, new.email_confirmed_at),
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists student_email_confirmation_updates_public_profile on auth.users;

create trigger student_email_confirmation_updates_public_profile
after update of email_confirmed_at on auth.users
for each row
execute function public.sync_student_email_verification();

update public.students as student
set
  email_verified_at = coalesce(student.email_verified_at, auth_user.email_confirmed_at),
  updated_at = now()
from auth.users as auth_user
where student.id = auth_user.id
  and student.email_verified_at is null
  and auth_user.email_confirmed_at is not null;
