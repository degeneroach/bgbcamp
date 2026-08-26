-- Billing state for Golf Town orders: invoiced/paid checkboxes and an
-- optional invoice link (staff-entered; shown to Matt as a pay button).
-- An order is finished (archived) only when picked up AND paid.
alter table golf_town_orders
  add column invoiced boolean not null default false,
  add column paid boolean not null default false,
  add column invoice_url text;
