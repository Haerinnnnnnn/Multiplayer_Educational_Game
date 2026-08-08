create sequence if not exists public.module_code_seq start with 1 increment by 1;

alter table public.modules
add column if not exists module_code text unique;

create or replace function public.assign_module_code()
returns trigger
language plpgsql
as $$
begin
  if new.module_code is null then
    new.module_code = 'MOD' || lpad(nextval('public.module_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists modules_assign_code on public.modules;
create trigger modules_assign_code
before insert on public.modules
for each row execute function public.assign_module_code();

with numbered_modules as (
  select id, row_number() over (order by created_at, id) as row_number
  from public.modules
  where module_code is null
)
update public.modules
set module_code = 'MOD' || lpad(numbered_modules.row_number::text, 3, '0')
from numbered_modules
where modules.id = numbered_modules.id;

grant usage, select on sequence public.module_code_seq to authenticated;
grant usage, select on sequence public.module_code_seq to service_role;
