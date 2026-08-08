'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import RouteMap from '../../../components/map/RouteMap';
import { useToast } from '../../../components/Toast';
import { setRoutePositions } from '../../../lib/data';

// Armar ruta: primero eliges qué pedidos entran (selección explícita, para no
// mandar por error uno que no toca hoy), luego los ordenas con flechas, y por
// último los ves en el mapa como puntos numerados en ese orden.
// El orden se guarda en `packages.route_position`, así que sobrevive recargas.
export default function RouteModal({ packages, onClose, onSaved }) {
  const showToast = useToast();
  const eligible = packages.filter(p => p.status !== 'entregado');

  const [selectedIds, setSelectedIds] = useState(() =>
    eligible
      .filter(p => p.routePosition != null)
      .sort((a, b) => a.routePosition - b.routePosition)
      .map(p => p.id)
  );
  const [step, setStep] = useState('select');
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function persistOrder(orderedIds) {
    const removedIds = eligible.filter(p => p.routePosition != null && !orderedIds.includes(p.id)).map(p => p.id);
    const updates = [
      ...orderedIds.map((id, i) => ({ id, position: i + 1 })),
      ...removedIds.map(id => ({ id, position: null })),
    ];
    if (updates.length === 0) return;
    setSaving(true);
    try {
      await setRoutePositions(updates);
      onSaved && onSaved();
    } catch (e) {
      showToast('Error al guardar el orden: ' + e.message, 'err');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmSelection() {
    await persistOrder(selectedIds);
    setStep('order');
  }

  async function move(index, dir) {
    const arr = [...selectedIds];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setSelectedIds(arr);
    await persistOrder(arr);
  }

  async function removeFromRoute(id) {
    const arr = selectedIds.filter(x => x !== id);
    setSelectedIds(arr);
    await persistOrder(arr);
  }

  const selectedPackages = selectedIds.map(id => eligible.find(p => p.id === id)).filter(Boolean);
  const withoutLocation = selectedPackages.filter(p => !(p.lat && p.lon));

  if (step === 'select') {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">Armar ruta — elegir pedidos</div>
        <div className="modal-sub">Marca los pedidos que vas a entregar en esta ruta.</div>
        {eligible.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No tienes pedidos pendientes de entregar.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {eligible.map(p => (
              <label key={p.id} className="driver-row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} style={{ marginRight: 4 }} />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.recipient}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.address}</div>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={selectedIds.length === 0 || saving} onClick={handleConfirmSelection}>
            {saving ? 'Guardando…' : `Asignar (${selectedIds.length})`}
          </button>
        </div>
      </Modal>
    );
  }

  if (step === 'order') {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">Ordenar la ruta</div>
        <div className="modal-sub">Usa las flechas para ponerlos en el orden en que los vas a entregar. Se guarda solo.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedPackages.map((p, i) => (
            <div key={p.id} className="driver-row">
              <span className="route-marker-dot" style={{ marginRight: 10 }}>{i + 1}</span>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.recipient}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.address}{!(p.lat && p.lon) ? ' · sin ubicación' : ''}</div>
              </span>
              <button className="ghost-btn" onClick={() => move(i, -1)} disabled={i === 0 || saving}>↑</button>
              <button className="ghost-btn" onClick={() => move(i, 1)} disabled={i === selectedPackages.length - 1 || saving}>↓</button>
              <button className="ghost-btn" style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }} onClick={() => removeFromRoute(p.id)} disabled={saving}>Quitar</button>
            </div>
          ))}
        </div>
        {withoutLocation.length > 0 && (
          <div className="scanner-hint" style={{ marginTop: 10 }}>
            {withoutLocation.length} pedido(s) sin ubicación no van a aparecer en el mapa. Pide al despachador que los ajuste.
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={() => setStep('select')}>Volver</button>
          <button className="btn btn-primary" disabled={selectedPackages.length === 0} onClick={() => setStep('map')}>Crear ruta</button>
        </div>
      </Modal>
    );
  }

  const stops = selectedPackages.map((p, i) => ({ pkg: p, order: i + 1 }));
  return (
    <Modal onClose={onClose} wide>
      <div className="modal-title">Tu ruta</div>
      <div className="modal-sub">{selectedPackages.length} paradas, en el orden que armaste. Guardada — si recargas la página, sigue aquí.</div>
      <RouteMap stops={stops} />
      <div className="modal-actions">
        <button className="btn" onClick={() => setStep('order')}>Reordenar</button>
        <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
