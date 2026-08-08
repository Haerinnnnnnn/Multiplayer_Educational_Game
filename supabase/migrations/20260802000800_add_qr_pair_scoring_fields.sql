alter table public.qr_pair_assignments
add column if not exists score_awarded integer not null default 0,
add column if not exists answered_seconds integer;
