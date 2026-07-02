import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const redirect = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "homebase://calendar-callback";
  if (!clientId) return json({ authorizeUrl: "https://homebase.app/calendar-not-configured" });
  // ⚠️ SECURITY TODO before enabling calendar OAuth: `state: user.id` is a stable, guessable
  // value — it does not protect the callback against CSRF, and it doubles as the user-id
  // carrier for the (not-yet-built) callback. Correct fix: generate a random nonce
  // (crypto.randomUUID), persist it in an `oauth_states` table keyed to user.id with a short
  // TTL, use the nonce as `state`, and in the `calendar-callback` handler look up the nonce,
  // verify it belongs to the authenticated user, then bind the Google tokens. Do NOT ship the
  // OAuth flow with state derived from user.id. (Flow is currently inert: GOOGLE_CLIENT_ID unset,
  // no callback handler deployed.)
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar", access_type: "offline", prompt: "consent", state: user.id,
  });
  return json({ authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});
