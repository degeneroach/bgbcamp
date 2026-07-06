import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
  query: string
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

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
      .select("id, title, project_id, projects!inner(slug, name, organization_id)")
      .eq("projects.organization_id", organizationId)
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
    results.push({ type: "project", id: p.id, title: p.name, href: `/projects/${p.slug}` });
  }
  for (const t of (tasks.data ?? []) as unknown as Array<{ id: string; title: string; projects: { slug: string; name: string } | null }>) {
    if (!t.projects) continue;
    results.push({
      type: "task",
      id: t.id,
      title: t.title,
      subtitle: t.projects.name,
      href: `/projects/${t.projects.slug}/tasks/${t.id}`,
    });
  }
  for (const p of (posts.data ?? []) as unknown as Array<{ id: string; title: string; projects: { slug: string; name: string } | null }>) {
    if (!p.projects) continue;
    results.push({
      type: "post",
      id: p.id,
      title: p.title,
      subtitle: p.projects.name,
      href: `/projects/${p.projects.slug}#post-${p.id}`,
    });
  }
  for (const person of people.data ?? []) {
    results.push({
      type: "person",
      id: person.id,
      title: person.full_name || person.email,
      subtitle: person.full_name ? person.email : undefined,
      href: `/people/${person.id}`,
    });
  }

  return results;
}
