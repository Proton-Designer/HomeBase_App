import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

// Best-effort: pushes the job to the provider's connected calendar when one exists and
// Google secrets are configured. Until then it is a safe no-op (the client swallows errors).
Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const admin = createClient(URL, SERVICE);
  const { data: tok } = await admin.from("calendar_tokens").select("id").eq("user_id", user.id).maybeSingle();
  const configured = !!Deno.env.get("GOOGLE_CLIENT_ID") && !!tok;
  return json({ ok: true, synced: false, configured, jobId: b.jobId ?? null, action: b.action ?? null });
});
