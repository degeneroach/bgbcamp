-- Tracks the Golf Town portal's last successful sign-in, shown to admins on
-- the profile page. One row per organization; written only by the server
-- (service role) when the portal login succeeds.

create table golftown_portal_status (
  organization_id uuid primary key references organizations (id) on delete cascade,
  last_login_at timestamptz
);

alter table golftown_portal_status enable row level security;

create policy "org members can view portal status"
  on golftown_portal_status for select to authenticated using (is_org_member(organization_id));
