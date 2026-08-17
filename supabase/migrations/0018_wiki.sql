-- SOP Wiki: sections + docs, org-scoped like every other table. Bodies are
-- rich-text HTML (same TipTap pipeline as comments/posts), not markdown.

create table wiki_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table wiki_docs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  section_id uuid not null references wiki_sections (id) on delete cascade,
  title text not null default 'Untitled',
  slug text not null,
  body_html text not null default '',
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references profiles (id) on delete set null,
  updated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index wiki_docs_section_idx on wiki_docs (section_id, sort_order, created_at);

create trigger set_updated_at before update on wiki_docs
  for each row execute procedure set_updated_at();

alter table wiki_sections enable row level security;
alter table wiki_docs enable row level security;

-- Team-wide access: any org member can read and write, mirroring posts.
create policy "org members can view wiki sections"
  on wiki_sections for select to authenticated using (is_org_member(organization_id));
create policy "org members can manage wiki sections"
  on wiki_sections for insert to authenticated with check (is_org_member(organization_id));
create policy "org members can update wiki sections"
  on wiki_sections for update to authenticated using (is_org_member(organization_id));
create policy "org members can delete wiki sections"
  on wiki_sections for delete to authenticated using (is_org_member(organization_id));

create policy "org members can view wiki docs"
  on wiki_docs for select to authenticated using (is_org_member(organization_id));
create policy "org members can create wiki docs"
  on wiki_docs for insert to authenticated with check (is_org_member(organization_id));
create policy "org members can update wiki docs"
  on wiki_docs for update to authenticated using (is_org_member(organization_id));
create policy "org members can delete wiki docs"
  on wiki_docs for delete to authenticated using (is_org_member(organization_id));

-- Seed the six standard sections for every existing organization.
insert into wiki_sections (organization_id, name, slug, sort_order)
select o.id, s.name, s.slug, s.sort_order
from organizations o
cross join (
  values
    ('Onboarding', 'onboarding', 0),
    ('Daily Operations', 'daily-operations', 1),
    ('Weekly Operations', 'weekly-operations', 2),
    ('Monthly Operations', 'monthly-operations', 3),
    ('Customer Service', 'customer-service', 4),
    ('Reference', 'reference', 5)
) as s(name, slug, sort_order)
on conflict (organization_id, slug) do nothing;
