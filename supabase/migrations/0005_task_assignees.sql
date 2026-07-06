-- Replace single-assignee tasks with a many-to-many task_assignees table so
-- more than one person can be assigned to a task.

create table task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create index task_assignees_task_id_idx on task_assignees (task_id);
create index task_assignees_user_id_idx on task_assignees (user_id);

-- Backfill from the existing single-assignee column before dropping it.
insert into task_assignees (task_id, user_id)
select id, assignee_id from tasks where assignee_id is not null
on conflict do nothing;

alter table tasks drop column if exists assignee_id;

alter table task_assignees enable row level security;

create policy "org members can view task assignees"
  on task_assignees for select to authenticated using (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_assignees.task_id)))
  );

create policy "org members can assign tasks"
  on task_assignees for insert to authenticated with check (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_assignees.task_id)))
  );

create policy "org members can unassign tasks"
  on task_assignees for delete to authenticated using (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_assignees.task_id)))
  );
