'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { updatePackage, saveKnownLocation } from '../../../lib/data';
import { useReverseGeocode } from '../../../hooks/useReverseGeocode';

// Leaflet toca `window` al cargarse, así que este mapa solo puede existir en el navegador.
const PinPickerMap = dynamic(() => import('../../../components/map/PinPickerMap'), { ssr: false });

// El repartidor, parado en la dirección real, corrige el punto del mapa con su
// GPS. Además de actualizar este paquete, guarda la dirección en
// `known_locations` para que la próxima vez que alguien la use (nuevo pedido,
// importación, etc.) ya salga bien ubicada sin depender de un proveedor externo.
export default function FixLocationModal({ pkg, onClose, onSaved }) {
  const showToast = useToast();
  const [coords, setCoords] = useState(pkg.lat && pkg.lon ? { lat: pkg.lat, lon: pkg.lon } : null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [saving, setSaving] = useState(false);
  const { address: resolvedAddress, loading: resolvingAddress } = useReverseGeocode(coords?.lat, coords?.lon);

  function useMyLocation() {
    if (!navigator.geolocation) { setLocateError('Este navegador no puede obtener tu ubicación.'); return; }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocateError('No se pudo obtener tu ubicación (' + err.message + '). Marca el punto directo en el mapa.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  // Al abrir el modal, intenta ubicar al repartidor automáticamente.
  useEffect(() => { useMyLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!coords) { showToast('Marca un punto en el mapa primero.', 'err'); return; }
    setSaving(true);
    try {
      await updatePackage(pkg.id, { lat: coords.lat, lon: coords.lon });
      await saveKnownLocation(pkg.address, coords.lat, coords.lon);
    } catch (e) { showToast('Error al guardar: ' + e.message, 'err'); setSaving(false); return; }
    showToast('Ubicación corregida y guardada para la próxima vez.');
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Corregir ubicación</div>
      <div className="modal-sub">{pkg.recipient} · {pkg.address}</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <button className="ghost-btn" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Obteniendo tu ubicación…' : 'Usar mi ubicación actual'}
        </button>
        {locateError ? <span style={{ fontSize: 12, color: 'var(--brick)' }}>{locateError}</span> : null}
      </div>

      <PinPickerMap lat={coords?.lat} lon={coords?.lon} onChange={(lat, lon) => setCoords({ lat, lon })} />
      <div className="coord-readout">
        {!coords
          ? 'Toca el mapa para marcar el punto exacto, o usa tu ubicación actual arriba.'
          : `Punto marcado: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` +
            (resolvingAddress ? ' · buscando la dirección…' : resolvedAddress ? ` — ${resolvedAddress}` : ' · no se pudo obtener la dirección')}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar ubicación'}</button>
      </div>
    </Modal>
  );
}
