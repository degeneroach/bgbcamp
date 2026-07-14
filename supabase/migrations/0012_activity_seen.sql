-- Per-user "seen" tracking for activity events, powering the Basecamp-style
-- "New for you" section: unseen activity by others sits at the top with a
-- dot; clicking the dot records a row here and the event drops into the
-- regular timeline below.

create table activity_seen (
  user_id uuid not null references profiles (id) on delete cascade,
  event_id uuid not null references activity_events (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index activity_seen_user_idx on activity_seen (user_id);

alter table activity_seen enable row level security;

create policy "users can view their own seen marks"
  on activity_seen for select to authenticated using (user_id = auth.uid());

create policy "users can mark activity seen"
  on activity_seen for insert to authenticated with check (user_id = auth.uid());

create policy "users can unmark their own seen marks"
  on activity_seen for delete to authenticated using (user_id = auth.uid());
