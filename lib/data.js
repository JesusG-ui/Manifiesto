// Capa de datos — todas las llamadas a Supabase viven aquí, no en los componentes.
// Cada módulo de UI importa solo las funciones que necesita.
//
// Nota de seguridad (ver Manifiesto.md): el PIN de repartidor se guarda y compara
// en texto plano en drivers.pin_hash mientras no exista una función server-side
// que lo verifique con hash real. No usar así con datos de repartidores reales.

import { supabase } from './supabaseClient';

/* ---------- Repartidores (drivers) ---------- */
export async function fetchDrivers() {
  const { data, error } = await supabase.from('drivers').select('*').order('name');
  if (error) throw error;
  return data.map(d => ({ id: d.id, name: d.name, phone: d.phone, pin: d.pin_hash || '' }));
}

export async function createDriver({ name, pin }) {
  const { data, error } = await supabase.from('drivers').insert({ name, pin_hash: pin }).select().single();
  if (error) throw error;
  return data;
}

export async function updateDriverPin(driverId, pin) {
  const { error } = await supabase.from('drivers').update({ pin_hash: pin }).eq('id', driverId);
  if (error) throw error;
}

export async function deleteDriver(driverId) {
  // Libera los paquetes de este repartidor antes de borrarlo.
  await supabase.from('packages').update({ driver_id: null, status: 'pendiente' }).eq('driver_id', driverId).eq('status', 'asignado');
  await supabase.from('packages').update({ driver_id: null }).eq('driver_id', driverId);
  const { error } = await supabase.from('drivers').delete().eq('id', driverId);
  if (error) throw error;
}

/* ---------- Despachadores (dispatchers) ----------
   Gestión de usuarios de despachador (usuario + PIN). El login usa Supabase
   Auth de verdad (ver lib/dispatcherAuth.js); crear/borrar pasa por /api/dispatchers
   porque requiere la service_role key, que nunca debe llegar al navegador. */
export async function fetchDispatchers() {
  const { data, error } = await supabase.from('dispatchers').select('*').order('username');
  if (error) throw error;
  return data.map(d => ({ id: d.id, userId: d.user_id, username: d.username, createdAt: d.created_at }));
}

async function authedFetch(url, options) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(url, {
    ...options,
    headers: { ...(options?.headers || {}), Authorization: token ? `Bearer ${token}` : '' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Error de red.');
  return body;
}

export async function createDispatcher({ username, pin }) {
  return authedFetch('/api/dispatchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
}

export async function deleteDispatcher(userId) {
  return authedFetch('/api/dispatchers?userId=' + encodeURIComponent(userId), { method: 'DELETE' });
}

/* ---------- Paquetes (packages) ---------- */
// Convierte una fila cruda de Supabase (snake_case) al shape que usa la UI,
// resolviendo el nombre del repartidor y adjuntando su evidencia si existe.
export function mapPackageRow(p, driversById, evidenceByPkg) {
  const driverObj = driversById.get(p.driver_id) || null;
  const ev = evidenceByPkg.get(p.id) || null;
  return {
    id: p.id,
    trackingCode: p.tracking_code || '',
    recipient: p.recipient,
    phone: p.phone || '',
    address: p.address,
    notes: p.notes || '',
    driverId: p.driver_id,
    driver: driverObj ? driverObj.name : '',
    status: p.status,
    lat: p.lat,
    lon: p.lon,
    incidentNote: p.incident_note,
    routePosition: p.route_position,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    evidence: ev ? { photo: ev.photo_url, hasPhoto: !!ev.photo_url, note: ev.note, lat: ev.lat, lon: ev.lon, timestamp: ev.created_at } : null,
  };
}

export async function fetchPackages(drivers) {
  const driversById = new Map(drivers.map(d => [d.id, d]));
  const { data: packagesData, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const { data: evidenceData } = await supabase.from('evidence').select('*').order('created_at', { ascending: false });
  const evidenceByPkg = new Map();
  (evidenceData || []).forEach(e => { if (!evidenceByPkg.has(e.package_id)) evidenceByPkg.set(e.package_id, e); });
  return packagesData.map(p => mapPackageRow(p, driversById, evidenceByPkg));
}

export async function createPackage({ trackingCode, recipient, phone, address, notes, driverId, lat, lon }) {
  const { data, error } = await supabase.from('packages').insert({
    tracking_code: trackingCode || null,
    recipient,
    phone: phone || null,
    address,
    notes: notes || null,
    driver_id: driverId || null,
    status: driverId ? 'asignado' : 'pendiente',
    lat: lat ?? null,
    lon: lon ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function bulkCreatePackages(rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from('packages').insert(rows);
  if (error) throw error;
}

export async function updatePackage(id, fields) {
  const { error } = await supabase.from('packages').update(fields).eq('id', id);
  if (error) throw error;
}

// Guarda el orden de ruta de un repartidor. `updates` es un arreglo de
// { id, position } — position en null saca al paquete de la ruta.
export async function setRoutePositions(updates) {
  const results = await Promise.all(
    updates.map(u => supabase.from('packages').update({ route_position: u.position }).eq('id', u.id))
  );
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
}

export async function deletePackage(id) {
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw error;
}

export async function reassignPackage(id, driverId) {
  await updatePackage(id, { driver_id: driverId || null, status: driverId ? 'asignado' : 'pendiente' });
}

/* ---------- Evidencia ---------- */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export async function uploadEvidencePhoto(packageId, photoDataUrl) {
  const blob = dataUrlToBlob(photoDataUrl);
  const path = `${packageId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('evidencias').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) { console.error(error); return null; }
  const { data } = supabase.storage.from('evidencias').getPublicUrl(path);
  return data.publicUrl;
}

export async function removeEvidencePhoto(photoUrl) {
  const marker = '/evidencias/';
  const idx = photoUrl.indexOf(marker);
  if (idx === -1) return;
  try { await supabase.storage.from('evidencias').remove([photoUrl.slice(idx + marker.length)]); } catch (e) {}
}

export async function confirmDelivery(packageId, { photoDataUrl, note, lat, lon }) {
  let photoUrl = null;
  if (photoDataUrl) photoUrl = await uploadEvidencePhoto(packageId, photoDataUrl);
  await updatePackage(packageId, { status: 'entregado' });
  const { error } = await supabase.from('evidence').insert({ package_id: packageId, photo_url: photoUrl, note: note || null, lat, lon });
  if (error) throw error;
  return { photoUrl };
}

/* ---------- Geocodificación ----------
   Se llama a nuestras propias rutas API (/api/geocode, /api/reverse-geocode),
   nunca directo a un proveedor externo desde el navegador — así la clave de
   Geodir (si la configuras) nunca queda expuesta en el código del cliente. */
export async function geocodeAddress(address) {
  const res = await fetch('/api/geocode?address=' + encodeURIComponent(address));
  if (!res.ok) return null;
  const data = await res.json();
  return data.result || null;
}

export async function reverseGeocode(lat, lon) {
  const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.address || null;
}
