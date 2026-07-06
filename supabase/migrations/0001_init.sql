-- BGBCamp initial schema
-- Basecamp-style internal project management tool.

create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- organizations / organization_members
-- ============================================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Helper: is the current user a member of this org?
create function is_org_member(org_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- Helper: is the current user an owner/admin of this org?
create function is_org_admin(org_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ============================================================================
-- projects / project_members / project_favorites
-- ============================================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text not null default '#6366f1',
  archived boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- Helper: which org does this project belong to?
create function project_org(proj_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select organization_id from projects where id = proj_id;
$$;

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table project_favorites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ============================================================================
-- posts / post_comments (Message Board)
-- ============================================================================
create table posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  title text not null,
  body_html text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- task_lists / tasks / task_comments / task_images
-- ============================================================================
create table task_lists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  task_list_id uuid not null references task_lists (id) on delete cascade,
  title text not null,
  description_html text not null default '',
  assignee_id uuid references profiles (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_id_idx on tasks (project_id);
create index tasks_assignee_id_idx on tasks (assignee_id);
create index tasks_status_idx on tasks (status);
create index tasks_due_date_idx on tasks (due_date);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_images (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  storage_path text not null,
  url text not null,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- activity_events
-- ============================================================================
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  entity_type text not null check (entity_type in ('project', 'post', 'post_comment', 'task', 'task_comment', 'task_image')),
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_org_idx on activity_events (organization_id, created_at desc);
create index activity_events_project_idx on activity_events (project_id, created_at desc);
create index activity_events_actor_idx on activity_events (actor_id, created_at desc);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on organizations for each row execute procedure set_updated_at();
create trigger set_updated_at before update on projects for each row execute procedure set_updated_at();
create trigger set_updated_at before update on posts for each row execute procedure set_updated_at();
create trigger set_updated_at before update on post_comments for each row execute procedure set_updated_at();
create trigger set_updated_at before update on tasks for each row execute procedure set_updated_at();
create trigger set_updated_at before update on task_comments for each row execute procedure set_updated_at();
create trigger set_updated_at before update on profiles for each row execute procedure set_updated_at();

-- Keep completed_at in sync with status.
create function sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = now();
  elsif new.status is distinct from 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger sync_task_completed_at before update on tasks for each row execute procedure sync_task_completed_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_favorites enable row level security;
alter table posts enable row level security;
alter table post_comments enable row level security;
alter table task_lists enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table task_images enable row level security;
alter table activity_events enable row level security;

-- profiles: any authenticated user can read all profiles (small internal team).
create policy "profiles are readable by authenticated users"
  on profiles for select to authenticated using (true);
create policy "users manage their own profile"
  on profiles for update to authenticated using (id = auth.uid());

-- organizations
create policy "org members can view their organizations"
  on organizations for select to authenticated using (is_org_member(id));
create policy "authenticated users can create organizations"
  on organizations for insert to authenticated with check (created_by = auth.uid());
create policy "org admins can update organizations"
  on organizations for update to authenticated using (is_org_admin(id));

-- organization_members
create policy "org members can view membership"
  on organization_members for select to authenticated using (is_org_member(organization_id));
create policy "org admins can manage membership"
  on organization_members for insert to authenticated with check (is_org_admin(organization_id));
create policy "org admins can update membership"
  on organization_members for update to authenticated using (is_org_admin(organization_id));
create policy "org admins can remove membership"
  on organization_members for delete to authenticated using (is_org_admin(organization_id));

-- projects
create policy "org members can view projects"
  on projects for select to authenticated using (is_org_member(organization_id));
create policy "org members can create projects"
  on projects for insert to authenticated with check (is_org_member(organization_id));
create policy "org members can update projects"
  on projects for update to authenticated using (is_org_member(organization_id));

-- project_members
create policy "org members can view project members"
  on project_members for select to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can manage project members"
  on project_members for insert to authenticated with check (is_org_member(project_org(project_id)));
create policy "org members can update project members"
  on project_members for update to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can remove project members"
  on project_members for delete to authenticated using (is_org_member(project_org(project_id)));

-- project_favorites: only the owning user can see/manage their favorites.
create policy "users manage their own favorites"
  on project_favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- posts
create policy "org members can view posts"
  on posts for select to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can create posts"
  on posts for insert to authenticated with check (is_org_member(project_org(project_id)));
create policy "authors can update their posts"
  on posts for update to authenticated using (author_id = auth.uid() or is_org_admin(project_org(project_id)));
create policy "authors can delete their posts"
  on posts for delete to authenticated using (author_id = auth.uid() or is_org_admin(project_org(project_id)));

-- post_comments
create policy "org members can view post comments"
  on post_comments for select to authenticated using (
    is_org_member(project_org((select project_id from posts where posts.id = post_comments.post_id)))
  );
create policy "org members can create post comments"
  on post_comments for insert to authenticated with check (
    is_org_member(project_org((select project_id from posts where posts.id = post_comments.post_id)))
  );
create policy "authors can update their post comments"
  on post_comments for update to authenticated using (author_id = auth.uid());
create policy "authors can delete their post comments"
  on post_comments for delete to authenticated using (author_id = auth.uid());

-- task_lists
create policy "org members can view task lists"
  on task_lists for select to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can manage task lists"
  on task_lists for insert to authenticated with check (is_org_member(project_org(project_id)));
create policy "org members can update task lists"
  on task_lists for update to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can delete task lists"
  on task_lists for delete to authenticated using (is_org_member(project_org(project_id)));

-- tasks
create policy "org members can view tasks"
  on tasks for select to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can create tasks"
  on tasks for insert to authenticated with check (is_org_member(project_org(project_id)));
create policy "org members can update tasks"
  on tasks for update to authenticated using (is_org_member(project_org(project_id)));
create policy "org members can delete tasks"
  on tasks for delete to authenticated using (is_org_member(project_org(project_id)));

-- task_comments
create policy "org members can view task comments"
  on task_comments for select to authenticated using (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_comments.task_id)))
  );
create policy "org members can create task comments"
  on task_comments for insert to authenticated with check (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_comments.task_id)))
  );
create policy "authors can update their task comments"
  on task_comments for update to authenticated using (author_id = auth.uid());
create policy "authors can delete their task comments"
  on task_comments for delete to authenticated using (author_id = auth.uid());

-- task_images
create policy "org members can view task images"
  on task_images for select to authenticated using (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_images.task_id)))
  );
create policy "org members can add task images"
  on task_images for insert to authenticated with check (
    is_org_member(project_org((select project_id from tasks where tasks.id = task_images.task_id)))
  );
create policy "uploaders can delete their task images"
  on task_images for delete to authenticated using (
    uploaded_by = auth.uid() or is_org_admin(project_org((select project_id from tasks where tasks.id = task_images.task_id)))
  );

-- activity_events
create policy "org members can view activity"
  on activity_events for select to authenticated using (is_org_member(organization_id));
create policy "org members can log activity"
  on activity_events for insert to authenticated with check (is_org_member(organization_id));
