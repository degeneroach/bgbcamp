-- Task lists can now be archived (soft-deleted) instead of permanently
-- destroyed, and their position is drag-and-drop reorderable (position
-- column already existed).

alter table task_lists add column if not exists archived_at timestamptz;
