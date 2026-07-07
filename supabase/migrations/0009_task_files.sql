-- General file attachments on tasks (PDFs, .ai, vectors, zips, etc.) — distinct
-- from task_images, which are shown as an inline gallery. Files are stored in
-- the existing public `attachments` bucket under the same
-- {project_id}/... path convention, so the bucket's org-scoped storage
-- policies already cover them.

create table task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  storage_path text not null,
  url text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index task_files_task_idx on task_files (task_id, created_at desc);

alter table task_files enable row level security;

create policy "org members can view task files"
  on task_files for select to authenticated using (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_files.task_id)))
  );

create policy "org members can add task files"
  on task_files for insert to authenticated with check (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_files.task_id)))
  );

create policy "uploader or admin can delete task files"
  on task_files for delete to authenticated using (
    uploaded_by = auth.uid()
    or is_org_admin(project_org((select project_id from tasks where tasks.id = task_files.task_id)))
  );
