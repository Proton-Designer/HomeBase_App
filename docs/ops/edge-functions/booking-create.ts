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
  const admin = createClient(URL, SERVICE);
  const providerId = b.matchedProviderId ?? null;
  const { data: bk, error } = await admin.from("bookings").insert({
    homeowner_id: user.id,
    provider_id: providerId,
    service_type: b.serviceType,
    booking_type: b.bookingType,
    frequency: b.frequency ?? null,
    scheduled_at: b.scheduledAt,
    address_id: b.addressId,
    special_instructions: b.specialInstructions ?? null,
    photo_url: b.photoUrl ?? null,
    amount_cents: b.amountCents,
    status: "active",
  }).select("*").single();
  if (error) return json({ error: error.message }, 400);
  await admin.from("jobs").insert({
    booking_id: bk.id, provider_id: providerId, homeowner_id: user.id,
    status: "booked", service_type: b.serviceType, scheduled_at: b.scheduledAt,
    amount_cents: b.amountCents, timestamps: { booked: new Date().toISOString() },
  });
  let providerName: string | undefined; let providerAvatarUrl: string | null = null; let compositeScore: Record<string, number> | undefined;
  if (providerId) {
    const { data: p } = await admin.from("providers").select("display_name, avatar_url, composite_score_overall, composite_score_reliability, composite_score_quality, composite_score_communication, composite_score_professionalism").eq("id", providerId).maybeSingle();
    if (p) {
      providerName = p.display_name ?? undefined;
      providerAvatarUrl = p.avatar_url ?? null;
      compositeScore = { overall: p.composite_score_overall ?? 0, reliability: p.composite_score_reliability ?? 0, quality: p.composite_score_quality ?? 0, communication: p.composite_score_communication ?? 0, professionalism: p.composite_score_professionalism ?? 0 };
    }
  }
  return json({
    id: bk.id, homeownerId: bk.homeowner_id, providerId: bk.provider_id,
    serviceType: bk.service_type, bookingType: bk.booking_type, frequency: bk.frequency ?? null,
    scheduledAt: bk.scheduled_at, addressId: bk.address_id,
    specialInstructions: bk.special_instructions ?? undefined, photoUrl: bk.photo_url ?? undefined,
    amountCents: bk.amount_cents, providerName, providerAvatarUrl, compositeScore,
  });
});
