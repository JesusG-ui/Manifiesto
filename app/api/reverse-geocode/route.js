// Geocodificación inversa server-side. Mismo orden de preferencia que /api/geocode:
// Mapbox → Geodir → Nominatim.

async function reverseWithMapbox(lat, lon, token) {
  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lon}&latitude=${lat}&language=es&limit=1&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  const f = data.features && data.features[0];
  if (!f) return null;
  return f.properties.full_address || f.properties.place_formatted || null;
}

async function reverseWithGeodir(lat, lon, key) {
  const url = `https://apis.geodir.co/geocoding/v1/json?latlon=${lat},${lon}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results || data.results.length === 0) return null;
  return data.results[0].standard_address;
}

async function reverseWithNominatim(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'manifiesto-web' } });
  const data = await res.json();
  return (data && data.display_name) || null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) return Response.json({ error: 'Faltan lat/lon' }, { status: 400 });

  const mapboxToken = process.env.MAPBOX_TOKEN;
  const geodirKey = process.env.GEODIR_API_KEY;

  try {
    let address = null;
    let provider = 'nominatim';
    if (mapboxToken) { address = await reverseWithMapbox(lat, lon, mapboxToken); provider = 'mapbox'; }
    else if (geodirKey) { address = await reverseWithGeodir(lat, lon, geodirKey); provider = 'geodir'; }
    else { address = await reverseWithNominatim(lat, lon); }
    return Response.json({ address, provider });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
