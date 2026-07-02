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
  if (!b.providerId || !b.email) return json({ error: "providerId and email required" }, 400);
  const admin = createClient(URL, SERVICE);
  const { data: prov } = await admin.from("providers").select("id").eq("id", b.providerId).eq("owner_user_id", user.id).maybeSingle();
  if (!prov) return json({ error: "Forbidden" }, 403);
  const { data: existing } = await admin.from("profiles").select("id").eq("email", b.email).maybeSingle();
  const { data, error } = await admin.from("provider_team").insert({
    provider_id: b.providerId,
    user_id: existing?.id ?? null,
    role: "tech",
    status: "invited",
    email: b.email,
    first_name: b.firstName ?? null,
    last_name: b.lastName ?? null,
    phone: b.phone ?? null,
  }).select("id").single();
  if (error) return json({ error: error.message }, 400);
  return json({ id: data.id });
});
