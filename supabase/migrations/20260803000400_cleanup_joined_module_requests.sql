delete from public.module_join_requests
using public.module_members
where module_join_requests.module_id = module_members.module_id
and module_join_requests.student_id = module_members.student_id;

create or replace function public.delete_joined_module_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.module_join_requests
  where module_id = new.module_id
  and student_id = new.student_id;

  return new;
end;
$$;

drop trigger if exists module_members_delete_joined_request on public.module_members;
create trigger module_members_delete_joined_request
after insert on public.module_members
for each row execute function public.delete_joined_module_request();
