-- Drop the agile-style status/priority workflow. Tasks are now organized
-- purely by which (arbitrary, user-named) task_list they belong to, and
-- completion is a plain flag (completed_at is not null) rather than a
-- three-state workflow.

drop trigger if exists sync_task_completed_at on tasks;
drop function if exists sync_task_completed_at();

alter table tasks drop column if exists status;
alter table tasks drop column if exists priority;
