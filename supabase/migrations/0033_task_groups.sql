-- Groups inside a task list (Basecamp-style): a small labeled section tasks
-- can be dragged into, e.g. "Website Edits" within a Black Friday list.

create table task_groups (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references task_lists (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_groups_list_idx on task_groups (task_list_id, position);

-- Deleting a group un-groups its tasks rather than deleting them.
alter table tasks add column group_id uuid references task_groups (id) on delete set null;

alter table task_groups enable row level security;

create policy "org members can view task groups"
  on task_groups for select to authenticated
  using (is_org_member(project_org((select project_id from task_lists where id = task_list_id))));

create policy "org members can create task groups"
  on task_groups for insert to authenticated
  with check (is_org_member(project_org((select project_id from task_lists where id = task_list_id))));

create policy "org members can update task groups"
  on task_groups for update to authenticated
  using (is_org_member(project_org((select project_id from task_lists where id = task_list_id))));

create policy "org members can delete task groups"
  on task_groups for delete to authenticated
  using (is_org_member(project_org((select project_id from task_lists where id = task_list_id))));
