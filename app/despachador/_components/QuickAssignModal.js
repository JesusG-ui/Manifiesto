'use client';

import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { reassignPackage } from '../../../lib/data';

// Se abre cuando el lector USB (modo teclado) detecta un código que ya existe:
// un clic asigna el paquete al repartidor y queda listo para el siguiente escaneo.
export default function QuickAssignModal({ pkg, drivers, onClose, onAssigned }) {
  const showToast = useToast();

  async function handleAssign(driver) {
    try { await reassignPackage(pkg.id, driver.id); }
    catch (e) { showToast('Error al asignar: ' + e.message, 'err'); return; }
    showToast('Asignado a ' + driver.name + '. Listo para el siguiente escaneo.');
    onAssigned();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Asignación rápida</div>
      <div className="modal-sub">{pkg.recipient} · {pkg.trackingCode || pkg.id}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>{pkg.address}</div>
      {drivers.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Todavía no hay repartidores creados. Ve a &quot;Repartidores&quot; primero.</p>
      ) : (
        <div className="chip-row" style={{ justifyContent: 'flex-start' }}>
          {drivers.map(d => <button key={d.id} className="chip" onClick={() => handleAssign(d)}>{d.name}</button>)}
        </div>
      )}
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar sin asignar</button></div>
    </Modal>
  );
}
