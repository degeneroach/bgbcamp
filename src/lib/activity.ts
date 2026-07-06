import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntityType, Database } from "@/types/database";

interface LogActivityParams {
  organizationId: string;
  projectId?: string | null;
  actorId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  supabase: SupabaseClient<Database>,
  params: LogActivityParams
) {
  const { error } = await supabase.from("activity_events").insert({
    organization_id: params.organizationId,
    project_id: params.projectId ?? null,
    actor_id: params.actorId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("Failed to log activity", params.action, error);
  }
}
