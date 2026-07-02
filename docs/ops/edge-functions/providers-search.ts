import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const COLS = "id, business_name, display_name, bio, avatar_url, verification_tier, composite_score_overall, composite_score_reliability, composite_score_quality, composite_score_communication, composite_score_professionalism, check_in_count, service_types, portfolio_photos, price_range_min_cents, price_range_max_cents, is_available_today";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { zip, service } = await req.json().catch(() => ({}));
  const admin = createClient(URL, SERVICE);
  let providerIds: string[] | null = null;
  if (zip) {
    const { data: areas } = await admin.from("provider_service_areas").select("provider_id").eq("zip", String(zip));
    providerIds = [...new Set((areas ?? []).map((a: { provider_id: string }) => a.provider_id))];
    if (providerIds.length === 0) return json([]);
  }
  let q = admin.from("providers").select(COLS).is("valid_to", null);
  if (providerIds) q = q.in("id", providerIds);
  if (service) q = q.contains("service_types", [service]);
  const { data, error } = await q.order("composite_score_overall", { ascending: false, nullsFirst: false }).limit(50);
  if (error) return json({ error: error.message }, 400);
  return json(data ?? []);
});
