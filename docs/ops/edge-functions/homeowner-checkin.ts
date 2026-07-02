// homeowner-checkin — homeowner reviews a completed job: records the check-in, marks the
// job completed, writes the verified-completion ledger row, and recomputes the provider's
// trust scores. Deployed via Supabase MCP. This file is the version-controlled source.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const rel = (v: string) => v === "on_time" ? 5 : v === "bit_late" ? 3 : v === "very_late" ? 1 : Number(v) || 0;
const comm = (v: string) => v === "great" ? 5 : v === "fine" ? 3 : v === "poor" ? 1 : Number(v) || 0;
const prof = (v: string) => v === "very" ? 5 : v === "mostly" ? 3 : v === "concerns" ? 1 : Number(v) || 0;
const clampQ = (v: unknown) => Math.max(0, Math.min(5, Number(v) || 0));

Deno.serve(async (req) => {
  const authH = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authH } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (!b.jobId) return json({ error: "jobId required" }, 400);
  const admin = createClient(URL, SERVICE);
  const { data: job } = await admin.from("jobs").select("id, provider_id, homeowner_id, service_type, amount_cents, booking_id, timestamps").eq("id", b.jobId).maybeSingle();
  if (!job) return json({ error: "Job not found" }, 400);
  if (job.homeowner_id !== user.id) return json({ error: "Forbidden" }, 403);
  await admin.from("check_ins").insert({
    job_id: b.jobId, submitted_by_user_id: user.id, submitted_by_role: "homeowner",
    reliability: b.reliability ?? null, quality: clampQ(b.quality), communication: b.communication ?? null,
    professionalism: b.professionalism ?? null, photo_path: b.photoPath ?? null, comment: b.comment ?? null,
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
  if (job.provider_id) {
    const { data: jobRows } = await admin.from("jobs").select("id").eq("provider_id", job.provider_id);
    const jobIds = (jobRows ?? []).map((j: { id: string }) => j.id);
    const { data: cis } = await admin.from("check_ins").select("reliability, quality, communication, professionalism").in("job_id", jobIds).eq("submitted_by_role", "homeowner");
    const rows = cis ?? [];
    if (rows.length) {
      const avg = (f: (r: Record<string, unknown>) => number) => rows.reduce((s: number, r: Record<string, unknown>) => s + f(r), 0) / rows.length;
      const r = avg((x) => rel(String(x.reliability)));
      const q = avg((x) => clampQ(x.quality));
      const c = avg((x) => comm(String(x.communication)));
      const p = avg((x) => prof(String(x.professionalism)));
      const overall = 0.35 * r + 0.35 * q + 0.2 * c + 0.1 * p;
      await admin.from("providers").update({
        composite_score_reliability: Number(r.toFixed(2)),
        composite_score_quality: Number(q.toFixed(2)),
        composite_score_communication: Number(c.toFixed(2)),
        composite_score_professionalism: Number(p.toFixed(2)),
        composite_score_overall: Number(overall.toFixed(2)),
        check_in_count: rows.length,
      }).eq("id", job.provider_id);
    }
  }
  return json({ ok: true });
});
