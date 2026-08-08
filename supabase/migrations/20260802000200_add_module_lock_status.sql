alter table public.modules
add column if not exists is_locked boolean not null default false,
add column if not exists locked_at timestamptz,
add column if not exists locked_by uuid references public.profiles(id) on delete set null;
