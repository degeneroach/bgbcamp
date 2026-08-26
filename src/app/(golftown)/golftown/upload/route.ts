import { isPortalAuthed } from "@/lib/golftown-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ACCEPTED_EXTENSIONS = new Set(["pdf", "ai", "eps", "svg", "png", "jpg", "jpeg"]);
const MAX_BYTES = 25 * 1024 * 1024;

// Portal artwork uploads: the browser never touches Supabase Storage
// directly (no storage-write key on the public page). The cookie is checked
// first, the file is validated server-side, and the object path is
// generated here — the client's filename is display metadata only.
export async function POST(request: Request) {
  if (!(await isPortalAuthed())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    return Response.json(
      { error: "Use a PDF, AI, EPS, SVG, PNG, or JPG file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Artwork must be under 25MB." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id").limit(1).maybeSingle();
  if (!org) return Response.json({ error: "Portal is not configured yet." }, { status: 500 });

  const path = `${org.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("golf-town-artwork")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream" });
  if (error) {
    console.error("portal artwork upload failed", error);
    return Response.json({ error: "Upload failed — try again." }, { status: 500 });
  }

  return Response.json({ path, filename: file.name });
}
