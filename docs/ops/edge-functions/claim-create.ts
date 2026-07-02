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
  if (!b.jobId) return json({ error: "jobId required" }, 400);
  const admin = createClient(URL, SERVICE);
  const { data: job } = await admin.from("jobs").select("id, homeowner_id, provider_id").eq("id", b.jobId).maybeSingle();
  if (!job) return json({ error: "Job not found" }, 400);
  if (job.homeowner_id !== user.id) return json({ error: "Forbidden" }, 403);
  const { data, error } = await admin.from("claims").insert({
    job_id: b.jobId,
    homeowner_id: user.id,
    provider_id: b.providerId ?? job.provider_id,
    incident_type: b.incidentType,
    description: b.description,
    photo_urls: b.photoUrls ?? [],
    requested_resolution: b.requestedResolution,
    requested_amount_cents: b.requestedAmountCents ?? null,
    status: "submitted",
  }).select("id").single();
  if (error) return json({ error: error.message }, 400);
  return json({ id: data.id });
});
