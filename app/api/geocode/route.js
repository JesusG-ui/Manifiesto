// Geocodificacion multifuente para direcciones peruanas poco estructuradas.
// Genera variantes, compara candidatos y evita tratar el centro de un distrito
// como si fuera la puerta exacta. Las claves permanecen solo en el servidor.

const GENERIC_WORDS = new Set([
  'peru', 'arequipa', 'direccion', 'calle', 'avenida', 'urbanizacion',
  'asociacion', 'pueblo', 'joven', 'sector', 'zona', 'manzana', 'lote',
]);

const AREQUIPA_BOUNDS = {
  minLat: -16.60,
  maxLat: -16.25,
  minLon: -71.75,
  maxLon: -71.35,
};

function plain(value) {
  return (value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizePeruvianAddress(value) {
  // El contenido entre paréntesis suele ser una referencia de entrega
  // (oficina, tienda, color de puerta), no parte de la dirección geocodificable.
  const withoutReferences = (value || '').replace(/\([^)]*\)/g, ' ');
  let text = ` ${plain(withoutReferences)} `;
  const replacements = [
    [/\b(?:mza|mz|manz)\b/g, ' manzana '],
    [/\b(?:lte|lt)\b/g, ' lote '],
    [/\b(?:asoc|asc)\b/g, ' asociacion '],
    [/\burb\b/g, ' urbanizacion '],
    [/\b(?:avda|av)\b/g, ' avenida '],
    [/\b(?:pj|ppjj)\b/g, ' pueblo joven '],
    [/\b(?:pt)\b/g, ' pueblo tradicional '],
    [/\b(?:ah|aahh)\b/g, ' asentamiento humano '],
    [/\b(?:aqp)\b/g, ' arequipa '],
    [/\b(?:jacocb|jacoso|jacbo|jacob) ?\b/g, ' jacobo '],
  ];
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  return text.trim().replace(/\s+/g, ' ');
}

function parseAddress(address) {
  const normalized = normalizePeruvianAddress(address);
  const manzana = normalized.match(/\bmanzana\s+([a-z0-9]+)\b/)?.[1] || null;
  const lote = normalized.match(/\blote\s+([a-z0-9]+)\b/)?.[1] || null;
  const streetMatch = normalized.match(/\b(avenida|calle|jiron|jirón|pasaje)\s+([a-z][a-z ]*?)\s+(\d+)(?:\s+([a-z]))?\b/);
  const streetName = streetMatch ? `${streetMatch[1]} ${streetMatch[2].trim()}` : null;
  const houseNumber = streetMatch?.[3] || null;
  const doorSuffix = streetMatch?.[4] || null;
  return { normalized, manzana, lote, streetName, houseNumber, doorSuffix };
}

function buildVariants(address) {
  const { normalized, streetName, houseNumber, doorSuffix } = parseAddress(address);
  // Para direcciones urbanas, calle + número es casi siempre la consulta
  // más fuerte. Evita que destinatarios, oficinas, CP y distritos repetidos
  // oculten algo tan sencillo como "Avenida Brasilia 404".
  const streetNumber = streetName && houseNumber
    ? `${streetName} ${houseNumber}${doorSuffix ? ` ${doorSuffix}` : ''}`
    : null;
  const withContext = /\barequipa\b/.test(normalized) ? normalized : `${normalized}, Arequipa, Peru`;
  const withoutLot = normalized
    .replace(/\bmanzana\s+[a-z0-9]+\b/g, ' ')
    .replace(/\blote\s+[a-z0-9]+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...new Set([
    streetNumber && `${streetNumber}, Jacobo Hunter, Arequipa, Peru`,
    streetNumber && `${streetNumber.replace(/\s+[a-z]$/, '')}, Arequipa, Peru`,
    withContext,
    `${normalized}, Jacobo Hunter, Arequipa, Peru`,
    withoutLot && `${withoutLot}, Arequipa, Peru`,
  ].filter(Boolean))].slice(0, 5);
}

function addressTokens(value) {
  return new Set(plain(value).split(' ').filter(t => t.length > 1 && !GENERIC_WORDS.has(t)));
}

function tokenSimilarity(expected, actual) {
  const a = addressTokens(expected);
  const b = addressTokens(actual);
  if (!a.size || !b.size) return 0;
  let matches = 0;
  for (const token of a) if (b.has(token)) matches++;
  return matches / a.size;
}

function isInsideArequipa(lat, lon) {
  return lat >= AREQUIPA_BOUNDS.minLat && lat <= AREQUIPA_BOUNDS.maxLat &&
    lon >= AREQUIPA_BOUNDS.minLon && lon <= AREQUIPA_BOUNDS.maxLon;
}

function scoreCandidate(candidate, parsed) {
  // Fuera de Arequipa no es "poco confiable", es un resultado equivocado —
  // se descarta directo, no se penaliza nada más (evita que otros bonos lo
  // rescaten y termine mostrando México, Filipinas, etc.).
  if (!isInsideArequipa(candidate.lat, candidate.lon)) return 0;
  const display = normalizePeruvianAddress(candidate.display || '');
  let score = 25 + Math.round(tokenSimilarity(parsed.normalized, display) * 45);
  if (parsed.streetName) {
    const streetTokens = [...addressTokens(parsed.streetName)];
    const streetMatches = streetTokens.filter(token => addressTokens(display).has(token)).length;
    if (streetTokens.length && streetMatches === streetTokens.length) score += 25;
  }
  if (parsed.houseNumber) {
    if (new RegExp(`\\b${parsed.houseNumber}\\b`).test(display)) score += 20;
    else score -= 12;
  }
  const hasExpectedManzana = parsed.manzana && new RegExp(`\\b(?:manzana\\s+)?${parsed.manzana}\\b`).test(display);
  const hasExpectedLote = parsed.lote && new RegExp(`\\b(?:lote\\s+)?${parsed.lote}\\b`).test(display);
  if (hasExpectedManzana) score += 10;
  if (hasExpectedLote) score += 10;
  if (/jacobo hunter|hunter/.test(display)) score += 8;
  if (/arequipa/.test(display)) score += 5;
  if (/distrito de arequipa|provincia de arequipa/.test(display) && tokenSimilarity(parsed.normalized, display) < 0.35) score -= 30;
  if (candidate.accuracy === 'rooftop' || candidate.accuracy === 'parcel') score += 10;
  return Math.max(0, Math.min(100, score));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Proveedor respondio ${res.status}`);
  return res.json();
}

async function geocodeWithMapbox(address, token) {
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&country=pe&language=es&limit=3&access_token=${token}`;
  const data = await fetchJson(url);
  return (data.features || []).map(f => {
    const [lon, lat] = f.geometry.coordinates;
    return {
      lat,
      lon,
      display: f.properties.full_address || f.properties.name_preferred || f.properties.place_formatted || '',
      provider: 'mapbox',
      accuracy: f.properties.coordinates?.accuracy || null,
    };
  });
}

async function geocodeWithGeodir(address, key) {
  const url = `https://apis.geodir.co/geocoding/v1/json?address=${encodeURIComponent(address)}&key=${key}`;
  const data = await fetchJson(url);
  if (data.status !== 'OK') return [];
  return (data.results || []).slice(0, 3).map(r => ({
    lat: Number(r.geometry.coordinates.lat),
    lon: Number(r.geometry.coordinates.lon),
    display: r.standard_address || '',
    provider: 'geodir',
    accuracy: r.geometry.location_type === 'ROOFTOP' ? 'rooftop' : null,
  }));
}

async function geocodeWithGoogle(address, key) {
  // OJO: `region` solo es una sugerencia de ranking, no restringe el país —
  // por eso antes se colaban resultados de México, Filipinas, etc. cuando el
  // texto de la dirección era ambiguo. `components=country:PE` sí es un filtro real.
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:PE&region=pe&language=es&key=${key}`;
  const data = await fetchJson(url);
  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    // No lo tragamos en silencio: REQUEST_DENIED / OVER_QUERY_LIMIT / etc. casi
    // siempre significan que la API de Geocoding no está habilitada, falta
    // facturación en el proyecto de Google Cloud, o la key está restringida.
    throw new Error(`Google Geocoding: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`);
  }
  return (data.results || []).slice(0, 3).map(r => ({
    lat: Number(r.geometry.location.lat),
    lon: Number(r.geometry.location.lng),
    display: r.formatted_address || '',
    provider: 'google',
    accuracy: r.geometry.location_type === 'ROOFTOP'
      ? 'rooftop'
      : r.geometry.location_type === 'RANGE_INTERPOLATED' ? 'parcel' : null,
  }));
}

async function geocodeWithNominatim(address) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&countrycodes=pe&q=' + encodeURIComponent(address);
  const data = await fetchJson(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'manifiesto-web/1.0 (delivery-geocoder)' },
  });
  return (data || []).map(r => ({
    lat: Number(r.lat),
    lon: Number(r.lon),
    display: r.display_name || '',
    provider: 'openstreetmap',
    accuracy: r.type === 'house' || r.type === 'building' ? 'rooftop' : null,
  }));
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter(candidate => {
    const key = `${candidate.lat.toFixed(5)},${candidate.lon.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.trim();
  if (!address) return Response.json({ error: 'Falta la direccion' }, { status: 400 });

  const mapboxToken = process.env.MAPBOX_TOKEN;
  const geodirKey = process.env.GEODIR_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const parsed = parseAddress(address);
  const variants = buildVariants(address);

  try {
    const jobs = [];
    const jobLabels = [];
    // Google factura por solicitud: como máximo dos variantes por paquete.
    if (googleKey) {
      for (const variant of variants.slice(0, 2)) { jobs.push(geocodeWithGoogle(variant, googleKey)); jobLabels.push('google'); }
    }
    if (mapboxToken) for (const variant of variants) { jobs.push(geocodeWithMapbox(variant, mapboxToken)); jobLabels.push('mapbox'); }
    if (geodirKey) for (const variant of variants) { jobs.push(geocodeWithGeodir(variant, geodirKey)); jobLabels.push('geodir'); }
    // Nominatim siempre corre como red de respaldo: si Google/Mapbox/Geodir
    // fallan (key mal configurada, sin facturación, sin cuota) o no encuentran
    // nada, esto evita que la dirección se quede sin ningún candidato.
    jobs.push(geocodeWithNominatim(variants[0]));
    jobLabels.push('openstreetmap');

    const settled = await Promise.allSettled(jobs);
    const providerErrors = settled
      .map((r, i) => r.status === 'rejected' ? `${jobLabels[i]}: ${r.reason?.message || r.reason}` : null)
      .filter(Boolean);
    const candidates = dedupeCandidates(settled.flatMap(r => r.status === 'fulfilled' ? r.value : []))
      .map(candidate => ({ ...candidate, confidence: scoreCandidate(candidate, parsed) }))
      .sort((a, b) => b.confidence - a.confidence);

    const best = candidates[0] || null;
    // Menos de 55 significa que solo encontramos una zona demasiado general.
    const result = best && best.confidence >= 55 ? best : null;
    return Response.json({
      result,
      confidence: result?.confidence || 0,
      provider: result?.provider || null,
      normalizedAddress: parsed.normalized,
      alternatives: candidates.slice(1, 4),
      needsReview: !result || result.confidence < 75,
      providerErrors: providerErrors.length ? providerErrors : undefined,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
