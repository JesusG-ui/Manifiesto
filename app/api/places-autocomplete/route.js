// Autocompletado de direcciones — Places API (New), restringido a Perú y
// sesgado hacia Arequipa. Nunca se llama directo desde el navegador para no
// exponer la key.
export const dynamic = 'force-dynamic';

const AREQUIPA_CENTER = { latitude: -16.409, longitude: -71.537 };
const AREQUIPA_RADIUS_M = 30000; // ~30km, cubre el área metropolitana

export async function GET(request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: 'Falta GOOGLE_MAPS_API_KEY en el servidor.' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input')?.trim();
  const sessionToken = searchParams.get('sessiontoken') || '';
  if (!input) return Response.json({ suggestions: [] });

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['pe'],
        languageCode: 'es',
        sessionToken,
        locationBias: { circle: { center: AREQUIPA_CENTER, radius: AREQUIPA_RADIUS_M } },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: `Google Places: ${data.error?.status || res.status}${data.error?.message ? ' — ' + data.error.message : ''}` }, { status: 502 });
    }
    const suggestions = (data.suggestions || [])
      .map(s => s.placePrediction)
      .filter(Boolean)
      .map(p => ({ placeId: p.placeId, description: p.text?.text || '' }));
    return Response.json({ suggestions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
