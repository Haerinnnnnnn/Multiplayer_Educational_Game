alter type public.session_status add value if not exists 'paused';

alter table public.sessions
  add column if not exists paused_at timestamptz,
  add column if not exists total_paused_seconds integer not null default 0;
