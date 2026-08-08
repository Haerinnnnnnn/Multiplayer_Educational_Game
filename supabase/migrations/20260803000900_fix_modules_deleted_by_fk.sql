alter table public.modules
drop constraint if exists modules_deleted_by_fkey;

alter table public.modules
add constraint modules_deleted_by_fkey
foreign key (deleted_by) references auth.users(id) on delete set null;
