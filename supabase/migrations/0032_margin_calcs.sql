-- Saved Amazon margin calculations: name + SKU with the full input set in
-- jsonb so the calculator can evolve without schema churn.

create table margin_calcs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  sku text not null default '',
  data jsonb not null default '{}',
  updated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table margin_calcs enable row level security;

create policy "org members can view margin calcs"
  on margin_calcs for select to authenticated using (is_org_member(organization_id));

create policy "org members can create margin calcs"
  on margin_calcs for insert to authenticated with check (is_org_member(organization_id));

create policy "org members can update margin calcs"
  on margin_calcs for update to authenticated using (is_org_member(organization_id));

create policy "org members can delete margin calcs"
  on margin_calcs for delete to authenticated using (is_org_member(organization_id));
