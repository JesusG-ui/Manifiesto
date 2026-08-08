'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { createPackage, geocodeAddress, updatePackage } from '../../../lib/data';
import { useReverseGeocode } from '../../../hooks/useReverseGeocode';

// Leaflet toca `window` al cargarse, así que este mapa solo puede existir en el navegador.
const PinPickerMap = dynamic(() => import('../../../components/map/PinPickerMap'), { ssr: false });

// Alta manual de un paquete, con mapa para marcar el punto exacto de entrega.
export default function AddPackageModal({ drivers, initialTrackingCode = '', onClose, onSaved }) {
  const showToast = useToast();
  const [tracking, setTracking] = useState(initialTrackingCode);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('');
  const { address: resolvedAddress, loading: resolvingAddress } = useReverseGeocode(coords?.lat, coords?.lon);

  async function handleVerifyAddress() {
    const addr = address.trim();
    if (!addr) { setVerifyStatus('Escribe una dirección primero.'); return; }
    setVerifyStatus('Buscando…');
    try {
      const r = await geocodeAddress(addr);
      if (r) { setCoords({ lat: r.lat, lon: r.lon }); setVerifyStatus('Ubicada. Ajusta el pin si no quedó exacto.'); }
      else setVerifyStatus('No se encontró la dirección. Marca el punto directo en el mapa.');
    } catch (e) { setVerifyStatus('Error al buscar. Marca el punto directo en el mapa.'); }
  }

  async function handleSave() {
    if (!recipient.trim() || !address.trim()) { showToast('Falta el destinatario o la dirección.', 'err'); return; }
    const driverObj = driverName ? drivers.find(d => d.name === driverName) : null;
    let created;
    try {
      created = await createPackage({
        trackingCode: tracking.trim(), recipient: recipient.trim(), phone: phone.trim(),
        address: address.trim(), notes: notes.trim(),
        driverId: driverObj ? driverObj.id : null,
        lat: coords?.lat, lon: coords?.lon,
      });
    } catch (e) { showToast('Error al guardar: ' + e.message, 'err'); return; }
    showToast('Paquete guardado.');
    onSaved();
    onClose();

    if (!created.lat) {
      try {
        const r = await geocodeAddress(address.trim());
        if (r) { await updatePackage(created.id, { lat: r.lat, lon: r.lon }); onSaved(); }
      } catch (e) {}
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Nuevo paquete</div>
      <div className="modal-sub">Se guarda como pendiente hasta que asignes un repartidor.</div>
      <div className="form-row">
        <label>Código de rastreo</label>
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Ej. MLPE086292745R" />
      </div>
      <div className="form-row">
        <label>Destinatario</label>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Nombre y apellido" />
      </div>
      <div className="form-row">
        <label>Teléfono</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+51 9…" />
      </div>
      <div className="form-row">
        <label>Dirección</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, referencia, distrito" />
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ghost-btn" onClick={handleVerifyAddress}>Buscar dirección en el mapa</button>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{verifyStatus}</span>
        </div>
        <PinPickerMap lat={coords?.lat} lon={coords?.lon} onChange={(lat, lon) => setCoords({ lat, lon })} />
        <div className="coord-readout">
          {!coords
            ? 'Toca el mapa o arrastra el pin para marcar el punto exacto de entrega.'
            : `Punto marcado: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` +
              (resolvingAddress ? ' · buscando la dirección…' : resolvedAddress ? ` — ${resolvedAddress}` : ' · no se pudo obtener la dirección')}
        </div>
      </div>
      <div className="form-row">
        <label>Repartidor</label>
        <select value={driverName} onChange={(e) => setDriverName(e.target.value)}>
          <option value="">Sin asignar</option>
          {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones de entrega, piso, referencia…" />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Guardar paquete</button>
      </div>
    </Modal>
  );
}
