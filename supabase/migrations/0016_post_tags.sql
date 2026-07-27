-- Optional tag on message board posts. First tag: 'announcement', shown as
-- a badge and filterable on the board.

alter table posts add column if not exists tag text;
