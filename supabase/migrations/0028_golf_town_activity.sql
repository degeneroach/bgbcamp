-- Let Golf Town queue actions appear in the activity feed / calendar.

alter table activity_events drop constraint if exists activity_events_entity_type_check;

alter table activity_events add constraint activity_events_entity_type_check
  check (entity_type in (
    'project', 'post', 'post_comment', 'task', 'task_comment', 'task_image',
    'task_list', 'organization_member', 'wiki_doc', 'golf_town_order'
  ));
