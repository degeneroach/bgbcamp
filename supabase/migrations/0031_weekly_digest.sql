-- Per-person opt-in for the Monday-morning email digest of their open
-- tasks. Toggled by admins from the profile page's People section.
alter table profiles add column weekly_digest boolean not null default false;
