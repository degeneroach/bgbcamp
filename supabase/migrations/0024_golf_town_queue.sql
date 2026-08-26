-- Golf Town print queue: a manually ordered list of logo golf ball print
-- jobs. position ascending = printed first. Org-scoped like every other
-- table (is_org_member).

create table golf_town_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  position integer not null,
  end_customer text not null,
  contact text,
  ball_type text not null default '',
  quantity_dozen integer not null default 1,
  imprint_sides smallint not null default 1,
  date_needed date,
  artwork_path text,
  artwork_filename text,
  notes text,
  balls_received boolean not null default false,
  proof_approved boolean not null default false,
  printed boolean not null default false,
  shipped boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index golf_town_orders_org_position_idx
  on golf_town_orders (organization_id, position);

alter table golf_town_orders enable row level security;

create policy "org members can view golf town orders"
  on golf_town_orders for select to authenticated using (is_org_member(organization_id));

create policy "org members can create golf town orders"
  on golf_town_orders for insert to authenticated with check (is_org_member(organization_id));

create policy "org members can update golf town orders"
  on golf_town_orders for update to authenticated using (is_org_member(organization_id));

create policy "org members can delete golf town orders"
  on golf_town_orders for delete to authenticated using (is_org_member(organization_id));

-- Artwork storage. Path convention: golf-town-artwork/{organization_id}/{uuid}-{filename}
-- Public-read (internal tool, matches task-images/attachments), org-member
-- writes via the folder's organization id.

insert into storage.buckets (id, name, public)
values ('golf-town-artwork', 'golf-town-artwork', true)
on conflict (id) do nothing;

create policy "public read access to golf town artwork"
  on storage.objects for select to public
  using (bucket_id = 'golf-town-artwork');

create policy "org members can upload golf town artwork"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'golf-town-artwork'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org members can delete golf town artwork"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'golf-town-artwork'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );
