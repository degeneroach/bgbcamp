-- Move the message board from per-project to organization-wide. Posts gain
-- organization_id (backfilled from their project); project_id becomes
-- optional legacy metadata. RLS switches to org membership directly, and the
-- attachments bucket accepts org-id-rooted upload paths for global posts.

alter table posts add column if not exists organization_id uuid references organizations (id) on delete cascade;

update posts
set organization_id = (select organization_id from projects where projects.id = posts.project_id)
where organization_id is null;

alter table posts alter column organization_id set not null;
alter table posts alter column project_id drop not null;

create index if not exists posts_organization_idx on posts (organization_id, created_at desc);

-- Rebuild posts RLS on organization_id.
drop policy if exists "org members can view posts" on posts;
drop policy if exists "org members can create posts" on posts;
drop policy if exists "authors can update their posts" on posts;
drop policy if exists "authors can delete their posts" on posts;

create policy "org members can view posts"
  on posts for select to authenticated using (is_org_member(organization_id));
create policy "org members can create posts"
  on posts for insert to authenticated with check (is_org_member(organization_id));
create policy "authors can update their posts"
  on posts for update to authenticated using (author_id = auth.uid() or is_org_admin(organization_id));
create policy "authors can delete their posts"
  on posts for delete to authenticated using (author_id = auth.uid() or is_org_admin(organization_id));

-- Rebuild post_comments RLS through the post's organization.
drop policy if exists "org members can view post comments" on post_comments;
drop policy if exists "org members can create post comments" on post_comments;

create policy "org members can view post comments"
  on post_comments for select to authenticated using (
    is_org_member((select organization_id from posts where posts.id = post_comments.post_id))
  );
create policy "org members can create post comments"
  on post_comments for insert to authenticated with check (
    is_org_member((select organization_id from posts where posts.id = post_comments.post_id))
  );

-- Allow attachments uploaded under an organization-id folder (global board
-- media), alongside the existing project-id folder policy.
create policy "org members can upload attachments (org folder)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org members can delete attachments (org folder)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );
