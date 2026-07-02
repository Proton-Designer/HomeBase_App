// provider-checkin — provider completes a job: records the check-in, marks the job
// completed, and writes the verified-completion ledger row (a product non-negotiable).
// Deployed via Supabase MCP. This file is the version-controlled source of truth.
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
  const { data: job } = await admin.from("jobs").select("id, provider_id, homeowner_id, service_type, amount_cents, booking_id, timestamps").eq("id", b.jobId).maybeSingle();
  if (!job) return json({ error: "Job not found" }, 400);
  if (!job.provider_id || !(await authorizedForProvider(admin, job.provider_id, user.id))) return json({ error: "Forbidden" }, 403);
  await admin.from("check_ins").insert({
    job_id: b.jobId,
    submitted_by_user_id: user.id,
    submitted_by_role: "provider",
    before_photo_url: b.beforePhotoUrl ?? null,
    after_photo_url: b.afterPhotoUrl ?? null,
    notes: b.notes ?? null,
    tags: b.tags ?? [],
  });
  const ts = { ...(job.timestamps ?? {}), completed: (job.timestamps?.completed ?? new Date().toISOString()) };
  await admin.from("jobs").update({ status: "completed", timestamps: ts }).eq("id", b.jobId);
  const { data: led } = await admin.from("completion_ledger").select("id").eq("job_id", b.jobId).maybeSingle();
  if (!led) {
    const { data: pay } = await admin.from("payments").select("amount_cents, application_fee_cents").eq("booking_id", job.booking_id).order("created_at", { ascending: false }).maybeSingle();
    const grossCents = pay?.amount_cents ?? job.amount_cents;
    // net = gross − the platform fee set at authorization (10% sub / 17.5% one-off). Compute
    // it here so the ledger row is correct immediately: the capture op finds this row already
    // present and skips its own insert, which is why net_cents was previously always null.
    const netCents = pay ? grossCents - (pay.application_fee_cents ?? 0) : null;
    await admin.from("completion_ledger").insert({
      job_id: b.jobId, provider_id: job.provider_id, homeowner_id: job.homeowner_id,
      service_type: job.service_type, amount_cents: grossCents, net_cents: netCents,
      check_in_passed: true, completed_at: new Date().toISOString(),
    });
  }
  return json({ ok: true });
});
