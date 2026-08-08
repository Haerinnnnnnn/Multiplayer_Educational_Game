alter table public.qr_pair_assignments
add column if not exists assignment_type text not null default 'pair',
add column if not exists decoy_for_assignment_id bigint references public.qr_pair_assignments(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qr_pair_assignments_assignment_type_check'
  ) then
    alter table public.qr_pair_assignments
    add constraint qr_pair_assignments_assignment_type_check
    check (assignment_type in ('pair', 'decoy'));
  end if;
end;
$$;
