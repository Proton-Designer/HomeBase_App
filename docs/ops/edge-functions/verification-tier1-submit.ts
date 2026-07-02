import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (b.userId && b.userId !== user.id) return json({ error: "Forbidden" }, 403);
  const admin = createClient(URL, SERVICE);
  const { data: prov } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  const { error } = await admin.from("verification_documents").insert({
    provider_id: prov?.id ?? null, user_id: user.id, doc_type: "identity", status: "pending",
    file_paths: [b.idFrontPath, b.idBackPath].filter(Boolean),
  });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
