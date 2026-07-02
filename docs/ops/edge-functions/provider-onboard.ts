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
  const bd = b.businessDetails ?? {};
  const admin = createClient(URL, SERVICE);
  const patch = {
    business_name: bd.businessName ?? null,
    display_name: bd.businessName ?? null,
    service_types: bd.serviceTypes ?? [],
    years_in_business: bd.yearsInBusiness ?? null,
    employee_count: bd.employees ?? null,
    business_phone: bd.phone ?? null,
  };
  const { data: existing } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  let providerId: string;
  if (existing) {
    providerId = existing.id;
    await admin.from("providers").update(patch).eq("id", existing.id);
  } else {
    const { data: ins, error } = await admin.from("providers").insert({ owner_user_id: user.id, ...patch }).select("id").single();
    if (error) return json({ error: error.message }, 400);
    providerId = ins.id;
  }
  await admin.from("profiles").update({ role: "provider_owner" }).eq("id", user.id).neq("role", "admin");
  return json({ providerId });
});
