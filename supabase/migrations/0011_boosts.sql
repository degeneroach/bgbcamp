-- Boosts: a single-emoji reaction on a task or one of its comments
-- (Basecamp-style). One boost per person per item — re-boosting replaces the
-- emoji. Boosting notifies the task's assignees (task boost) or the comment's
-- author (comment boost).

create table boosts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'task_comment')),
  entity_id uuid not null,
  author_id uuid not null references profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, author_id)
);

create index boosts_task_idx on boosts (task_id);

alter table boosts enable row level security;

create policy "org members can view boosts"
  on boosts for select to authenticated using (is_org_member(organization_id));

create policy "org members can add their own boosts"
  on boosts for insert to authenticated
  with check (is_org_member(organization_id) and author_id = auth.uid());

create policy "authors can update their own boosts"
  on boosts for update to authenticated using (author_id = auth.uid());

create policy "authors can delete their own boosts"
  on boosts for delete to authenticated using (author_id = auth.uid());

-- Let boost notifications through the notifications entity_type check.
alter table notifications drop constraint if exists notifications_entity_type_check;

alter table notifications add constraint notifications_entity_type_check
  check (entity_type in ('task_comment', 'post_comment', 'task', 'boost'));
