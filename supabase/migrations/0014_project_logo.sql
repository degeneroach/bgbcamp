-- Optional square logo per project, shown in place of the colored initial
-- tile. Stored in the existing public `attachments` bucket under
-- {project_id}/logo-*, which the org-scoped storage policies already cover.

alter table projects add column if not exists logo_url text;
