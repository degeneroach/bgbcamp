import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Role } from "@/types/database";
import { accessibleProjectIds, canAccessProject } from "@/lib/projects";
import { displayName } from "@/lib/display-name";

export interface SearchResult {
  type: "project" | "task" | "post" | "person";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function runSearch(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  query: string,
  viewer: { userId: string; role: Role }
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const accessIds = await accessibleProjectIds(supabase, viewer.userId, viewer.role);
  const like = `%${q}%`;

  const [projects, tasks, posts, people] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, slug")
      .eq("organization_id", organizationId)
      .ilike("name", like)
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, project_id, projects!inner(slug, name, organization_id)")
      .eq("projects.organization_id", organizationId)
      .ilike("title", like)
      .limit(5),
    supabase
      .from("posts")
      .select("id, title")
      .eq("organization_id", organizationId)
      .ilike("title", like)
      .limit(5),
    supabase
      .from("profiles")
      .select("id, full_name, email, organization_members!inner(organization_id)")
      .eq("organization_members.organization_id", organizationId)
      .or(`full_name.ilike.${like},email.ilike.${like}`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const p of projects.data ?? []) {
    if (!canAccessProject(accessIds, p.id)) continue;
    results.push({ type: "project", id: p.id, title: p.name, href: `/projects/${p.slug}` });
  }
  for (const t of (tasks.data ?? []) as unknown as Array<{ id: string; title: string; project_id: string; projects: { slug: string; name: string } | null }>) {
    if (!t.projects) continue;
    if (!canAccessProject(accessIds, t.project_id)) continue;
    results.push({
      type: "task",
      id: t.id,
      title: t.title,
      subtitle: t.projects.name,
      href: `/projects/${t.projects.slug}/tasks/${t.id}`,
    });
  }
  for (const p of (posts.data ?? []) as unknown as Array<{ id: string; title: string }>) {
    results.push({
      type: "post",
      id: p.id,
      title: p.title,
      subtitle: "Message Board",
      href: `/board#post-${p.id}`,
    });
  }
  for (const person of people.data ?? []) {
    results.push({
      type: "person",
      id: person.id,
      title: displayName(person),
      subtitle: person.email,
      href: `/people/${person.id}`,
    });
  }

  return results;
}
