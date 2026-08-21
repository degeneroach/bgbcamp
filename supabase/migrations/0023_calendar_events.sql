-- Company calendar events: org-wide meetings and reminders that aren't tied
-- to a project. Attendees get an in-app notification + push with an
-- "Add to Google Calendar" link.

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  notes text not null default '',
  event_date date not null,
  -- Optional start time; null means an all-day event.
  start_time time,
  attendee_ids uuid[] not null default '{}',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index calendar_events_org_date_idx on calendar_events (organization_id, event_date);

alter table calendar_events enable row level security;

create policy "org members can view events"
  on calendar_events for select to authenticated using (is_org_member(organization_id));

create policy "org members can create events"
  on calendar_events for insert to authenticated with check (is_org_member(organization_id));

create policy "org members can update events"
  on calendar_events for update to authenticated using (is_org_member(organization_id));

create policy "org members can delete events"
  on calendar_events for delete to authenticated using (is_org_member(organization_id));

-- Let event invites through the notifications entity_type check.
alter table notifications drop constraint if exists notifications_entity_type_check;
alter table notifications add constraint notifications_entity_type_check
  check (entity_type in ('task_comment', 'post_comment', 'task', 'boost', 'calendar_event'));
