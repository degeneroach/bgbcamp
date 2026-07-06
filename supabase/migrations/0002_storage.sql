-- Storage bucket for task image attachments.
-- Path convention: task-images/{project_id}/{task_id}/{uuid}-{filename}
-- Bucket is public-read (internal tool, simplifies serving images) but
-- writes/deletes are restricted to org members via RLS below.

insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;

create policy "public read access to task images"
  on storage.objects for select to public
  using (bucket_id = 'task-images');

create policy "org members can upload task images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-images'
    and is_org_member(project_org(((storage.foldername(name))[1])::uuid))
  );

create policy "org members can delete task images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-images'
    and is_org_member(project_org(((storage.foldername(name))[1])::uuid))
  );
