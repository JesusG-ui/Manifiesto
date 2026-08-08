'use client';

import { useState } from 'react';
import Modal from './Modal';
import { useToast } from './Toast';
import { updatePackage } from '../lib/data';

// Compartido entre el módulo despachador y el módulo repartidor.
export default function IncidentModal({ pkg, onClose, onSaved }) {
  const showToast = useToast();
  const [note, setNote] = useState('');

  async function handleConfirm() {
    try { await updatePackage(pkg.id, { status: 'incidencia', incident_note: note.trim() || null }); }
    catch (e) { showToast('Error al guardar: ' + e.message, 'err'); return; }
    showToast('Incidencia registrada.');
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Reportar incidencia</div>
      <div className="modal-sub">Describe qué pasó (dirección incorrecta, cliente ausente, paquete dañado, etc.)</div>
      <div className="form-row">
        <textarea placeholder="Detalle de la incidencia…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={handleConfirm}>Guardar incidencia</button>
      </div>
    </Modal>
  );
}
