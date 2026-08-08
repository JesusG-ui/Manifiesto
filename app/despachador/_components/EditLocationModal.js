'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { updatePackage } from '../../../lib/data';
import { useReverseGeocode } from '../../../hooks/useReverseGeocode';

// Leaflet toca `window` al cargarse, así que este mapa solo puede existir en el navegador.
const PinPickerMap = dynamic(() => import('../../../components/map/PinPickerMap'), { ssr: false });

export default function EditLocationModal({ pkg, onClose, onSaved }) {
  const showToast = useToast();
  const [coords, setCoords] = useState(pkg.lat && pkg.lon ? { lat: pkg.lat, lon: pkg.lon } : null);
  const { address: resolvedAddress, loading: resolvingAddress } = useReverseGeocode(coords?.lat, coords?.lon);

  async function handleSave() {
    if (!coords) { showToast('Marca un punto en el mapa primero.', 'err'); return; }
    try { await updatePackage(pkg.id, { lat: coords.lat, lon: coords.lon }); }
    catch (e) { showToast('Error al guardar: ' + e.message, 'err'); return; }
    showToast('Ubicación actualizada.');
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Ajustar ubicación</div>
      <div className="modal-sub">{pkg.recipient} · {pkg.trackingCode || pkg.id}</div>
      <PinPickerMap lat={coords?.lat} lon={coords?.lon} onChange={(lat, lon) => setCoords({ lat, lon })} />
      <div className="coord-readout">
        {!coords
          ? 'Sin ubicación marcada todavía. Toca el mapa para fijarla.'
          : `Ubicación: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` +
            (resolvingAddress ? ' · buscando la dirección…' : resolvedAddress ? ` — ${resolvedAddress}` : ' · no se pudo obtener la dirección')}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Guardar ubicación</button>
      </div>
    </Modal>
  );
}
