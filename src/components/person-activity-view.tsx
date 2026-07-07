import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { CommentCountBadge } from "@/components/comment-count-badge";
import { DueDateBadge } from "@/components/due-date-badge";
import { ActivityItem, type ActivityEventWithRelations } from "@/components/activity-item";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isTaskCompleted } from "@/lib/tasks";
import { displayName } from "@/lib/display-name";
import type { Profile, Role, Task } from "@/types/database";

export type TaskWithProject = Task & {
  projects: { name: string; slug: string };
  commentCount?: number;
};

function TaskRow({ task }: { task: TaskWithProject }) {
  return (
    <Link
      href={`/projects/${task.projects.slug}/tasks/${task.id}`}
      className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/40"
    >
      <span className="flex-1 truncate text-sm">{task.title}</span>
      <span className="hidden text-xs text-muted-foreground sm:inline">{task.projects.name}</span>
      <DueDateBadge dueDate={task.due_date} completed={isTaskCompleted(task)} />
      <CommentCountBadge count={task.commentCount ?? 0} />
    </Link>
  );
}

function TaskSection({ title, tasks, emptyLabel }: { title: string; tasks: TaskWithProject[]; emptyLabel: string }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b bg-muted/30 px-4 py-2">
        <h3 className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>
      {tasks.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        tasks.map((task) => <TaskRow key={task.id} task={task} />)
      )}
    </Card>
  );
}

export function PersonActivityView({
  profile,
  role,
  overdueTasks,
  openTasks,
  completedTasks,
  activityEvents,
}: {
  profile: Profile;
  role: Role;
  overdueTasks: TaskWithProject[];
  openTasks: TaskWithProject[];
  completedTasks: TaskWithProject[];
  activityEvents: ActivityEventWithRelations[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={profile.full_name}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          className="h-14 w-14"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {displayName(profile)}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {role}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">{profile.email}</span>
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <TaskSection title="Overdue" tasks={overdueTasks} emptyLabel="Nothing overdue." />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TaskSection title="Open tasks" tasks={openTasks} emptyLabel="No open tasks." />
        <TaskSection title="Completed tasks" tasks={completedTasks} emptyLabel="No completed tasks yet." />
      </div>

      <Card className="flex flex-col p-4">
        <span className="mb-2 text-sm font-medium">Recent activity</span>
        <div className="flex flex-col divide-y">
          {activityEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            activityEvents.map((event) => <ActivityItem key={event.id} event={event} showProject />)
          )}
        </div>
      </Card>
    </div>
  );
}
