import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Resolves a Google Business page / business name -> { placeId, rating, reviewCount }
// using the Places API (new) Text Search. Inert until GOOGLE_PLACES_API_KEY (a key with
// the Places API enabled) is set on the project's edge-function secrets; until then it
// returns nulls so the client stores the URL but no rating/count.
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

const EMPTY = { placeId: null, rating: null, reviewCount: null };

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const query = String((body as { query?: unknown }).query ?? "").trim();
  if (!query) return json(EMPTY);
  const key = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
  if (!key) return json(EMPTY);
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: query }),
    });
    const data = await res.json().catch(() => null) as
      | { places?: Array<{ id?: string; rating?: number; userRatingCount?: number }> }
      | null;
    const place = data?.places?.[0];
    if (!place) return json(EMPTY);
    return json({
      placeId: place.id ?? null,
      rating: typeof place.rating === "number" ? place.rating : null,
      reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    });
  } catch {
    return json(EMPTY);
  }
});
