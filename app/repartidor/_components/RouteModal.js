'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { setRoutePositions } from '../../../lib/data';

const RouteMap = dynamic(() => import('../../../components/map/RouteMap'), { ssr: false });

// El repartidor elige los pedidos y luego ordena las paradas viendo el mapa en
// vivo. El orden se guarda solamente al confirmar la ruta.
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
    const removedIds = eligible
      .filter(p => p.routePosition != null && !orderedIds.includes(p.id))
      .map(p => p.id);
    const updates = [
      ...orderedIds.map((id, i) => ({ id, position: i + 1 })),
      ...removedIds.map(id => ({ id, position: null })),
    ];
    if (updates.length === 0) return true;
    setSaving(true);
    try {
      await setRoutePositions(updates);
      await onSaved?.();
      return true;
    } catch (e) {
      showToast('Error al guardar el orden: ' + e.message, 'err');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function move(index, direction) {
    const next = [...selectedIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedIds(next);
  }

  function removeFromRoute(id) {
    setSelectedIds(ids => ids.filter(currentId => currentId !== id));
  }

  async function confirmRoute() {
    if (await persistOrder(selectedIds)) {
      showToast('Ruta confirmada y guardada.');
      onClose();
    }
  }

  const selectedPackages = selectedIds.map(id => eligible.find(p => p.id === id)).filter(Boolean);
  const withoutLocation = selectedPackages.filter(p => !(p.lat && p.lon));
  const stops = selectedPackages.map((pkg, index) => ({ pkg, order: index + 1 }));

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
          <button className="btn btn-primary" disabled={selectedIds.length === 0} onClick={() => setStep('order')}>
            Ver y ordenar ({selectedIds.length})
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-title">Ordenar la ruta</div>
      <div className="modal-sub">Revisa las paradas numeradas en el mapa y usa las flechas para escoger el orden. El cambio se guarda al confirmar.</div>

      <div className="route-builder">
        <div className="route-builder-map">
          <RouteMap stops={stops} />
        </div>
        <div className="route-builder-list">
          {selectedPackages.map((p, index) => (
            <div key={p.id} className="route-order-row">
              <span className="route-marker-dot">{index + 1}</span>
              <span className="route-order-info">
                <strong>{p.recipient}</strong>
                <small>{p.address}{!(p.lat && p.lon) ? ' · sin ubicación' : ''}</small>
              </span>
              <span className="route-order-actions">
                <button className="ghost-btn route-arrow" aria-label={`Subir parada ${index + 1}`} onClick={() => move(index, -1)} disabled={index === 0 || saving}>↑</button>
                <button className="ghost-btn route-arrow" aria-label={`Bajar parada ${index + 1}`} onClick={() => move(index, 1)} disabled={index === selectedPackages.length - 1 || saving}>↓</button>
                <button className="ghost-btn route-remove" onClick={() => removeFromRoute(p.id)} disabled={saving}>Quitar</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {withoutLocation.length > 0 ? (
        <div className="scanner-hint" style={{ marginTop: 10 }}>
          {withoutLocation.length} pedido(s) sin ubicación no aparecen en el mapa. Puedes volver y retirarlos o pedir que se corrija su ubicación.
        </div>
      ) : null}

      <div className="modal-actions route-confirm-actions">
        <button className="btn" onClick={() => setStep('select')} disabled={saving}>Volver</button>
        <button className="btn btn-primary btn-big" disabled={selectedPackages.length === 0 || saving} onClick={confirmRoute}>
          {saving ? 'Guardando…' : `Confirmar ruta (${selectedPackages.length})`}
        </button>
      </div>
    </Modal>
  );
}
