// Detalles de un lugar elegido en el autocompletado — Places API (New).
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: 'Falta GOOGLE_MAPS_API_KEY en el servidor.' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessiontoken') || '';
  if (!placeId) return Response.json({ error: 'Falta placeId' }, { status: 400 });

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?languageCode=es${sessionToken ? '&sessionToken=' + encodeURIComponent(sessionToken) : ''}`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'formattedAddress,location' },
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: `Google Places: ${data.error?.status || res.status}${data.error?.message ? ' — ' + data.error.message : ''}` }, { status: 502 });
    }
    return Response.json({
      address: data.formattedAddress || null,
      lat: data.location?.latitude ?? null,
      lon: data.location?.longitude ?? null,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
