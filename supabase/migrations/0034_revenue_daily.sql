-- Daily revenue snapshots per sales channel (Shopify NONNA first, Amazon
-- later). Written only by the server with the service role; read only by
-- admins/owners (the Revenue dashboard is admin-gated too).

create table revenue_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  date date not null,
  source text not null,
  revenue numeric not null default 0,
  orders integer not null default 0,
  currency text not null default 'CAD',
  updated_at timestamptz not null default now(),
  unique (organization_id, date, source)
);

create index revenue_daily_org_date_idx on revenue_daily (organization_id, date desc);

alter table revenue_daily enable row level security;

create policy "admins can view revenue"
  on revenue_daily for select to authenticated
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = revenue_daily.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
