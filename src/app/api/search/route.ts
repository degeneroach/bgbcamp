import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/lib/search";
import type { Role } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ results: [] });
  }

  const results = await runSearch(supabase, membership.organization_id, q, {
    userId: user.id,
    role: membership.role as Role,
  });
  return NextResponse.json({ results });
}
