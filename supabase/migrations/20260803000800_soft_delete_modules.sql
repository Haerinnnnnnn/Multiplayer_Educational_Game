alter table public.modules
add column if not exists is_deleted boolean not null default false,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create index if not exists modules_is_deleted_idx
on public.modules(is_deleted);
