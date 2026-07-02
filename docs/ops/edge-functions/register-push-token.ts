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
  if (!b.expoPushToken) return json({ error: "expoPushToken required" }, 400);
  const admin = createClient(URL, SERVICE);
  const { error } = await admin.from("push_tokens").upsert(
    { user_id: user.id, token: b.expoPushToken, platform: b.platform ?? null },
    { onConflict: "user_id,token" },
  );
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
