do $$
begin
  begin
    alter publication supabase_realtime add table public.sessions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.participants;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
