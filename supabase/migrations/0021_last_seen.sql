-- Presence timestamp, updated by a throttled heartbeat on page loads.
-- Surfaced only in the admin-only People management card.

alter table profiles add column if not exists last_seen_at timestamptz;
