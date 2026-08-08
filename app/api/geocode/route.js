// Geocodificación server-side. Orden de preferencia:
// 1) Mapbox (MAPBOX_TOKEN) — confiable, buena cobertura en Perú.
// 2) Geodir (GEODIR_API_KEY) — especializado en Mz/Lote/urbanizaciones, si algún
//    día su servicio de cuentas vuelve a funcionar.
// 3) Nominatim — gratis, sin clave, como último respaldo para que nada se rompa.
// Las claves nunca llegan al navegador — por eso esto vive en una ruta API.

async function geocodeWithMapbox(address, token) {
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&country=pe&language=es&limit=1&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  const f = data.features && data.features[0];
  if (!f) return null;
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon, display: f.properties.full_address || f.properties.place_formatted };
}

async function geocodeWithGeodir(address, key) {
  const url = `https://apis.geodir.co/geocoding/v1/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return { lat: r.geometry.coordinates.lat, lon: r.geometry.coordinates.lon, display: r.standard_address };
}

async function geocodeWithNominatim(address) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
  const res = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'manifiesto-web' } });
  const data = await res.json();
  if (!data || !data[0]) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  if (!address) return Response.json({ error: 'Falta la dirección' }, { status: 400 });

  const mapboxToken = process.env.MAPBOX_TOKEN;
  const geodirKey = process.env.GEODIR_API_KEY;

  try {
    let result = null;
    let provider = 'nominatim';
    if (mapboxToken) { result = await geocodeWithMapbox(address, mapboxToken); provider = 'mapbox'; }
    else if (geodirKey) { result = await geocodeWithGeodir(address, geodirKey); provider = 'geodir'; }
    else { result = await geocodeWithNominatim(address); }
    return Response.json({ result, provider });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
