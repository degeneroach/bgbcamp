-- Attribution for the Golf Town portal: who submitted the order. Portal
-- submissions set 'golftown'; everything else defaults to 'staff'. This is
-- also what gates the portal's edit permission server-side.
alter table golf_town_orders add column submitted_by text not null default 'staff';
