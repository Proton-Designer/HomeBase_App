import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

// Deletes the CALLER'S OWN account only (derived from their JWT). FK ON DELETE
// CASCADE removes profile/homeowner/provider and dependent rows.
Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(URL, SERVICE);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
