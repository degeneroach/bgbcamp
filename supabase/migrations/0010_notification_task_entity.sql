-- Allow mention notifications that originate from a task description (not just
-- comments), so tagging a teammate in the description notifies them too.

alter table notifications drop constraint if exists notifications_entity_type_check;

alter table notifications add constraint notifications_entity_type_check
  check (entity_type in ('task_comment', 'post_comment', 'task'));
