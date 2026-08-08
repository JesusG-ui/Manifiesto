'use client';

import Modal from '../../../components/Modal';
import { fmtDate } from '../../../lib/format';

export default function EvidenceViewModal({ pkg, onClose }) {
  const ev = pkg.evidence;
  if (!ev) return null;
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Evidencia de entrega</div>
      <div className="modal-sub">{pkg.recipient} · {pkg.trackingCode || pkg.id}</div>
      {ev.photo ? <img src={ev.photo} className="evidence-photo" alt="Evidencia de entrega" /> : <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sin foto adjunta.</p>}
      <div className="evidence-meta">Entregado: {fmtDate(ev.timestamp)}</div>
      {ev.note ? <div className="evidence-meta" style={{ marginTop: 4 }}>Nota: {ev.note}</div> : null}
      {ev.lat ? <div className="evidence-meta" style={{ marginTop: 4 }}>Ubicación registrada al confirmar: {ev.lat.toFixed(5)}, {ev.lon.toFixed(5)}</div> : null}
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar</button></div>
    </Modal>
  );
}
