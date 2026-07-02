import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

async function authorizedForProvider(admin: ReturnType<typeof createClient>, providerId: string, userId: string) {
  const { data: owns } = await admin.from("providers").select("id").eq("id", providerId).eq("owner_user_id", userId).maybeSingle();
  if (owns) return true;
  const { data: team } = await admin.from("provider_team").select("id").eq("provider_id", providerId).eq("user_id", userId).eq("status", "active").maybeSingle();
  return !!team;
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (!b.jobId) return json({ error: "jobId required" }, 400);
  const admin = createClient(URL, SERVICE);
  const { data: job } = await admin.from("jobs").select("id, provider_id, timestamps").eq("id", b.jobId).maybeSingle();
  if (!job) return json({ error: "Job not found" }, 400);
  if (!job.provider_id || !(await authorizedForProvider(admin, job.provider_id, user.id))) return json({ error: "Forbidden" }, 403);
  const ts = { ...(job.timestamps ?? {}), confirmed: new Date().toISOString() };
  // Provider sets the job's time at acceptance (availability is per-job, not global).
  const patch: Record<string, unknown> = { status: "confirmed", timestamps: ts };
  if (b.scheduledAt) patch.scheduled_at = b.scheduledAt;
  const { error } = await admin.from("jobs").update(patch).eq("id", b.jobId);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
