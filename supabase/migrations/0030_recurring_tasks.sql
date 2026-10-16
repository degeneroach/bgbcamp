-- Recurring task templates: a daily scheduler materializes each active
-- template into a real task when next_run arrives, then advances next_run
-- by its cadence.

create table recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  task_list_id uuid not null references task_lists (id) on delete cascade,
  title text not null,
  description_html text not null default '',
  assignee_ids uuid[] not null default '{}',
  -- 'weekly' (cadence_day = 0-6, Sun-Sat) or 'monthly' (cadence_day = 1-28)
  cadence text not null check (cadence in ('weekly', 'monthly')),
  cadence_day smallint not null,
  next_run date not null,
  active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index recurring_tasks_due_idx on recurring_tasks (active, next_run);

alter table recurring_tasks enable row level security;

create policy "org members can view recurring tasks"
  on recurring_tasks for select to authenticated using (is_org_member(organization_id));

create policy "org members can create recurring tasks"
  on recurring_tasks for insert to authenticated with check (is_org_member(organization_id));

create policy "org members can update recurring tasks"
  on recurring_tasks for update to authenticated using (is_org_member(organization_id));

create policy "org members can delete recurring tasks"
  on recurring_tasks for delete to authenticated using (is_org_member(organization_id));
