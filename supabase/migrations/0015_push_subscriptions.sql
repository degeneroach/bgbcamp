-- Web Push subscriptions: one row per browser a person enabled push
-- notifications in. The server (service role) reads recipients'
-- subscriptions to deliver mention/boost pushes; users manage their own
-- rows via RLS.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "users can view their own push subscriptions"
  on push_subscriptions for select to authenticated using (user_id = auth.uid());

create policy "users can add their own push subscriptions"
  on push_subscriptions for insert to authenticated with check (user_id = auth.uid());

create policy "users can update their own push subscriptions"
  on push_subscriptions for update to authenticated using (user_id = auth.uid());

create policy "users can remove their own push subscriptions"
  on push_subscriptions for delete to authenticated using (user_id = auth.uid());
