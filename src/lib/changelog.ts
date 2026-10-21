// Team-facing changelog rendered at /changelog (linked from the footer).
// Newest first. Keep entries high-level — what changed for the team, not
// commit noise.

export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-21",
    title: "Live activity ticker",
    items: [
      "The Dashboard now has a live strip above your projects: the last 10 things that happened anywhere in BGBCamp (comments, tasks, posts…), each with who, what, and how long ago. Click a chip to jump straight to it.",
      "It refreshes itself — new activity appears without reloading the page.",
    ],
  },
  {
    date: "2026-10-20",
    title: "Groups within task lists",
    items: [
      "Add labeled groups inside any task list (e.g. a “Website Edits” group in a Black Friday list) with “+ Add group” at the bottom of the list.",
      "Drag tasks into a group, between groups, or back out — hover a group's name to rename or delete it (deleting keeps the tasks).",
    ],
  },
  {
    date: "2026-10-16",
    title: "Changelog",
    items: ["This page — every notable BGBCamp update, newest first, linked from the footer."],
  },
  {
    date: "2026-10-15",
    title: "Recurring tasks & fixes",
    items: [
      "Recurring tasks: schedule weekly or monthly repeating tasks per project (🔁 Recurring on the task board) — they create themselves with assignees, due date, and a push notification.",
      "Due date picker no longer un-sets dates on a double click, and closes once you pick a day.",
    ],
  },
  {
    date: "2026-10-08",
    title: "Mentions everywhere",
    items: [
      "@mentions now work in Message Board posts (not just comments), with bell + push notifications.",
      "Quote any task comment from its ⋯ menu — WhatsApp-style quoted replies.",
    ],
  },
  {
    date: "2026-09-08",
    title: "Golf Town portal & billing",
    items: [
      "Golf Town order portal at /golftown: Matt signs in, submits and tracks print orders himself.",
      "Order emails: internal notifications, order-received confirmations, and ready-for-pickup notices.",
      "Queue billing: Invoiced / Paid checkboxes, invoice pay link for Golf Town, Ready For Pick-Up and Payment Required sections, Finished Orders archive.",
      "Dext Drop: drag invoices into two boxes and they email straight into each company's Dext.",
      "Queue activity (orders added, statuses checked) shows on the Activity Timeline and Calendar.",
    ],
  },
  {
    date: "2026-08-26",
    title: "Golf Town queue & work orders",
    items: [
      "Golf Town Queue: drag-to-reorder print jobs with artwork, date pills, and progress checkboxes.",
      "Printable one-page work order sheet per job.",
      "Golf Town Invoice calculator with per-dozen pricing.",
      "Company calendar in the top nav: every task due date plus company-wide events with Google Calendar invites.",
      "Daily rotating welcome message in the header.",
    ],
  },
  {
    date: "2026-08-20",
    title: "Editor & wiki upgrades",
    items: [
      "Markdown paste converts into real formatting — tables included.",
      "Big videos compress in your browser before upload.",
      "SOP Wiki: business sections, drag-to-organize docs, share links, PDF export, focus mode, and a cleaner reading layout.",
      "Google Drive links render as labeled chips with Docs/Sheets icons.",
      "Task board: drag-and-drop tasks, due dates and wrapped titles on cards.",
    ],
  },
  {
    date: "2026-08-01",
    title: "Dark mode, boosts & notifications",
    items: [
      "Per-person dark mode with the neon look.",
      "Boosts (emoji reactions) on tasks and comments, with their own bell.",
      "Browser push notifications for mentions and assignments.",
      "My Tasks, Activity Timeline, and the contribution-style Activity Calendar.",
      "Message Board with Announcement / SOP / Education / Resources / Promotions tags.",
    ],
  },
  {
    date: "2026-07-06",
    title: "BGBCamp launches",
    items: [
      "Projects, task lists, tasks, comments, @mentions, image and file attachments.",
      "Magic-link sign-in for the team.",
    ],
  },
];
