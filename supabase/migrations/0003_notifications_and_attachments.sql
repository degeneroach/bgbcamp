-- Mention notifications + a general-purpose attachments bucket for inline
-- rich-text images (comments, project descriptions).

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  project_id uuid references projects (id) on delete cascade,
  entity_type text not null check (entity_type in ('task_comment', 'post_comment')),
  entity_id uuid not null,
  task_id uuid references tasks (id) on delete cascade,
  post_id uuid references posts (id) on delete cascade,
  excerpt text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_id, read, created_at desc);

alter table notifications enable row level security;

create policy "users can view their own notifications"
  on notifications for select to authenticated using (recipient_id = auth.uid());

create policy "org members can create notifications"
  on notifications for insert to authenticated with check (is_org_member(organization_id));

create policy "users can update their own notifications"
  on notifications for update to authenticated using (recipient_id = auth.uid());

-- Attachments bucket for inline images embedded in rich text (comments,
-- project descriptions). Path convention: attachments/{project_id}/{uuid}-{filename}
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "public read access to attachments"
  on storage.objects for select to public
  using (bucket_id = 'attachments');

create policy "org members can upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and is_org_member(project_org(((storage.foldername(name))[1])::uuid))
  );

create policy "org members can delete attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and is_org_member(project_org(((storage.foldername(name))[1])::uuid))
  );
