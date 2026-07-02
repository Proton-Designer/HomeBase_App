import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

// Admin-only. Called by the admin dashboard on claim resolution. Custom auth: accepts an
// admin session JWT OR the service-role key (the admin app falls back to it when no cookie).
// NOTE: deployed with verify_jwt = false (custom auth handled inline below).
Deno.serve(async (req) => {
  const authH = req.headers.get("Authorization") ?? "";
  const token = authH.replace(/^Bearer\s+/i, "");
  let authorized = false;
  if (token && token === SERVICE) {
    authorized = true;
  } else if (token) {
    const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authH } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const admin0 = createClient(URL, SERVICE);
      const { data: prof } = await admin0.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (prof?.role === "admin") authorized = true;
    }
  }
  if (!authorized) return json({ error: "Forbidden" }, 403);
  const b = await req.json().catch(() => ({}));
  if (!b.paymentId) return json({ error: "paymentId required" }, 400);
  const admin = createClient(URL, SERVICE);
  if (b.direction === "refund_to_homeowner") {
    await admin.from("payments").update({ status: "refunded" }).eq("id", b.paymentId);
  } else if (b.direction === "to_provider") {
    await admin.from("payments").update({ status: "succeeded", captured_at: new Date().toISOString() }).eq("id", b.paymentId);
  }
  return json({ ok: true, paymentId: b.paymentId, direction: b.direction ?? null });
});
