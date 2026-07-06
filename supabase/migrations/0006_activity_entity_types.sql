-- Widen activity_events.entity_type so the activity feed can represent a
-- couple more real, already-existing actions (list management, org invites)
-- without forcing them into an unrelated entity type.

alter table activity_events drop constraint if exists activity_events_entity_type_check;

alter table activity_events add constraint activity_events_entity_type_check
  check (entity_type in (
    'project', 'post', 'post_comment', 'task', 'task_comment', 'task_image',
    'task_list', 'organization_member'
  ));
