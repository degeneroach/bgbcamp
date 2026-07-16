"use client";

import { usePathname } from "next/navigation";

// Task detail pages get a slim project header so the task itself is the
// focus; everywhere else keeps the full header. Both variants are rendered
// on the server — this just picks one by route.
export function ProjectHeaderSwitcher({
  full,
  compact,
}: {
  full: React.ReactNode;
  compact: React.ReactNode;
}) {
  const pathname = usePathname();
  const onTaskDetail = /\/tasks\/[^/]+/.test(pathname);
  return <>{onTaskDetail ? compact : full}</>;
}
