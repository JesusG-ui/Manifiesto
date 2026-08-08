'use client';

import { useRef, useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { createPackage } from '../../../lib/data';

const FIELDS = ['tracking', 'recipient', 'address', 'phone', 'notes'];

// Captura rápida: alta veloz de un paquete a la vez. Enter salta al siguiente campo;
// al guardar, el formulario se limpia solo para el próximo paquete.
export default function QuickCaptureModal({ onClose, onAnySaved }) {
  const showToast = useToast();
  const [values, setValues] = useState({ tracking: '', recipient: '', address: '', phone: '', notes: '' });
  const [count, setCount] = useState(0);
  const refs = useRef({});

  function setField(name, val) { setValues(v => ({ ...v, [name]: val })); }

  async function handleSave() {
    const recipient = values.recipient.trim();
    const address = values.address.trim();
    if (!recipient || !address) {
      showToast('Falta destinatario o dirección.', 'err');
      (recipient ? refs.current.address : refs.current.recipient)?.focus();
      return;
    }
    try {
      await createPackage({
        trackingCode: values.tracking.trim(),
        recipient,
        phone: values.phone.trim(),
        address,
        notes: values.notes.trim(),
        driverId: null,
      });
    } catch (e) {
      showToast('Error al guardar: ' + e.message, 'err');
      return;
    }
    const next = count + 1;
    setCount(next);
    setValues({ tracking: '', recipient: '', address: '', phone: '', notes: '' });
    refs.current.tracking?.focus();
    showToast('Guardado (' + next + ').');
    onAnySaved();
  }

  function handleKeyDown(e, fieldName) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const idx = FIELDS.indexOf(fieldName);
    const next = FIELDS[idx + 1];
    if (!next) handleSave();
    else refs.current[next]?.focus();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Captura rápida</div>
      <div className="modal-sub">
        Cargados en esta sesión: {count}. Escanea el código o escribe y presiona Enter para pasar al siguiente campo.
        Al guardar, el formulario se limpia solo para el próximo paquete.
      </div>
      <div className="form-row">
        <label>Código de rastreo</label>
        <input ref={(el) => (refs.current.tracking = el)} value={values.tracking} placeholder="Escanea aquí o escribe"
          onChange={(e) => setField('tracking', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'tracking')} autoFocus />
      </div>
      <div className="form-row">
        <label>Destinatario</label>
        <input ref={(el) => (refs.current.recipient = el)} value={values.recipient}
          onChange={(e) => setField('recipient', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'recipient')} />
      </div>
      <div className="form-row">
        <label>Dirección</label>
        <input ref={(el) => (refs.current.address = el)} value={values.address}
          onChange={(e) => setField('address', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'address')} />
      </div>
      <div className="form-row">
        <label>Teléfono</label>
        <input ref={(el) => (refs.current.phone = el)} value={values.phone}
          onChange={(e) => setField('phone', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'phone')} />
      </div>
      <div className="form-row">
        <label>Notas</label>
        <input ref={(el) => (refs.current.notes = el)} value={values.notes}
          onChange={(e) => setField('notes', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'notes')} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Terminar</button>
        <button className="btn btn-primary" onClick={handleSave}>Guardar y siguiente</button>
      </div>
    </Modal>
  );
}
