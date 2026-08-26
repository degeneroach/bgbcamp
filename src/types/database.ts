export type Role = "owner" | "admin" | "member";
export type ActivityEntityType =
  | "project"
  | "post"
  | "post_comment"
  | "task"
  | "task_comment"
  | "task_image"
  | "task_list"
  | "organization_member"
  | "wiki_doc";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
};

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  logo_url: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: Role;
  notifications_enabled: boolean;
  created_at: string;
};

export type ProjectFavorite = {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
};

export type Post = {
  id: string;
  organization_id: string;
  /** Legacy: posts created before the board went org-wide keep their project. */
  project_id: string | null;
  author_id: string | null;
  title: string;
  body_html: string;
  pinned: boolean;
  tag: string | null;
  created_at: string;
  updated_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TaskList = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  archived_at: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  task_list_id: string;
  title: string;
  description_html: string;
  created_by: string | null;
  due_date: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskAssignee = {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TaskImage = {
  id: string;
  task_id: string;
  storage_path: string;
  url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type TaskFile = {
  id: string;
  task_id: string;
  storage_path: string;
  url: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  organization_id: string;
  project_id: string | null;
  actor_id: string | null;
  entity_type: ActivityEntityType;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NotificationEntityType =
  | "task_comment"
  | "post_comment"
  | "task"
  | "boost"
  | "calendar_event";

export type CalendarEvent = {
  id: string;
  organization_id: string;
  title: string;
  notes: string;
  /** YYYY-MM-DD */
  event_date: string;
  /** HH:MM:SS, or null for an all-day event. */
  start_time: string | null;
  attendee_ids: string[];
  created_by: string | null;
  created_at: string;
};

export type BoostEntityType = "task" | "task_comment";

export type ActivitySeen = {
  user_id: string;
  event_id: string;
  seen_at: string;
};

export type WikiSection = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  /** Which business this category set belongs to, e.g. "The Nonna". */
  business: string;
  sort_order: number;
  created_at: string;
};

export type WikiDoc = {
  id: string;
  organization_id: string;
  section_id: string;
  title: string;
  slug: string;
  body_html: string;
  is_published: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};


export type Boost = {
  id: string;
  organization_id: string;
  project_id: string;
  task_id: string;
  entity_type: BoostEntityType;
  entity_id: string;
  author_id: string;
  emoji: string;
  created_at: string;
};

export type Notification = {
  id: string;
  organization_id: string;
  recipient_id: string;
  actor_id: string | null;
  project_id: string | null;
  entity_type: NotificationEntityType;
  entity_id: string;
  task_id: string | null;
  post_id: string | null;
  excerpt: string;
  read: boolean;
  created_at: string;
};

export type GolfTownOrder = {
  id: string;
  organization_id: string;
  /** Ascending = higher print priority. */
  position: number;
  end_customer: string;
  contact: string | null;
  ball_type: string;
  quantity_dozen: number;
  /** 1 = single sided, 2 = double sided. */
  imprint_sides: number;
  /** YYYY-MM-DD */
  date_needed: string | null;
  /** YYYY-MM-DD — when Golf Town should drop the blank balls off. */
  drop_off_expected: string | null;
  artwork_path: string | null;
  artwork_filename: string | null;
  notes: string | null;
  balls_received: boolean;
  proof_approved: boolean;
  printed: boolean;
  shipped: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization> & { name: string; slug: string };
        Update: Partial<Organization>;
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Partial<OrganizationMember> & { organization_id: string; user_id: string };
        Update: Partial<OrganizationMember>;
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: Project;
        Insert: Partial<Project> & { organization_id: string; name: string; slug: string };
        Update: Partial<Project>;
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: ProjectMember;
        Insert: Partial<ProjectMember> & { project_id: string; user_id: string };
        Update: Partial<ProjectMember>;
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_favorites: {
        Row: ProjectFavorite;
        Insert: Partial<ProjectFavorite> & { project_id: string; user_id: string };
        Update: Partial<ProjectFavorite>;
        Relationships: [
          {
            foreignKeyName: "project_favorites_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: Post;
        Insert: Partial<Post> & { organization_id: string; title: string };
        Update: Partial<Post>;
        Relationships: [
          {
            foreignKeyName: "posts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: PostComment;
        Insert: Partial<PostComment> & { post_id: string; body: string };
        Update: Partial<PostComment>;
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_lists: {
        Row: TaskList;
        Insert: Partial<TaskList> & { project_id: string; name: string };
        Update: Partial<TaskList>;
        Relationships: [
          {
            foreignKeyName: "task_lists_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & { project_id: string; task_list_id: string; title: string };
        Update: Partial<Task>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_task_list_id_fkey";
            columns: ["task_list_id"];
            isOneToOne: false;
            referencedRelation: "task_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: Partial<TaskAssignee> & { task_id: string; user_id: string };
        Update: Partial<TaskAssignee>;
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & { task_id: string; body: string };
        Update: Partial<TaskComment>;
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_images: {
        Row: TaskImage;
        Insert: Partial<TaskImage> & { task_id: string; storage_path: string; url: string };
        Update: Partial<TaskImage>;
        Relationships: [
          {
            foreignKeyName: "task_images_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_images_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wiki_sections: {
        Row: WikiSection;
        Insert: Partial<WikiSection> & { organization_id: string; name: string; slug: string };
        Update: Partial<WikiSection>;
        Relationships: [
          {
            foreignKeyName: "wiki_sections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      wiki_docs: {
        Row: WikiDoc;
        Insert: Partial<WikiDoc> & {
          organization_id: string;
          section_id: string;
          slug: string;
        };
        Update: Partial<WikiDoc>;
        Relationships: [
          {
            foreignKeyName: "wiki_docs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wiki_docs_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "wiki_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wiki_docs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wiki_docs_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      golf_town_orders: {
        Row: GolfTownOrder;
        Insert: Partial<GolfTownOrder> & {
          organization_id: string;
          position: number;
          end_customer: string;
        };
        Update: Partial<GolfTownOrder>;
        Relationships: [
          {
            foreignKeyName: "golf_town_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Partial<CalendarEvent> & {
          organization_id: string;
          title: string;
          event_date: string;
        };
        Update: Partial<CalendarEvent>;
        Relationships: [
          {
            foreignKeyName: "calendar_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_seen: {
        Row: ActivitySeen;
        Insert: Partial<ActivitySeen> & { user_id: string; event_id: string };
        Update: Partial<ActivitySeen>;
        Relationships: [
          {
            foreignKeyName: "activity_seen_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_seen_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "activity_events";
            referencedColumns: ["id"];
          },
        ];
      };
      boosts: {
        Row: Boost;
        Insert: Partial<Boost> & {
          organization_id: string;
          project_id: string;
          task_id: string;
          entity_type: BoostEntityType;
          entity_id: string;
          author_id: string;
          emoji: string;
        };
        Update: Partial<Boost>;
        Relationships: [
          {
            foreignKeyName: "boosts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boosts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boosts_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boosts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_files: {
        Row: TaskFile;
        Insert: Partial<TaskFile> & {
          task_id: string;
          storage_path: string;
          url: string;
          name: string;
        };
        Update: Partial<TaskFile>;
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: Partial<ActivityEvent> & {
          organization_id: string;
          entity_type: ActivityEntityType;
          entity_id: string;
          action: string;
        };
        Update: Partial<ActivityEvent>;
        Relationships: [
          {
            foreignKeyName: "activity_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & {
          organization_id: string;
          recipient_id: string;
          entity_type: NotificationEntityType;
          entity_id: string;
        };
        Update: Partial<Notification>;
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
