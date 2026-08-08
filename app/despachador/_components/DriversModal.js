'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { createDriver, updateDriverPin, deleteDriver } from '../../../lib/data';

// Alta y gestión de usuarios de repartidor (nombre + PIN).
export default function DriversModal({ drivers, onClose, onChanged }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinEdits, setPinEdits] = useState({}); // { [driverId]: valorEnEdicion }

  function pinValueFor(d) { return pinEdits[d.id] ?? d.pin ?? ''; }

  async function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) { showToast('Escribe el nombre del repartidor.', 'err'); return; }
    if (!/^\d{4,6}$/.test(pin)) { showToast('El PIN debe tener entre 4 y 6 números.', 'err'); return; }
    if (drivers.some(d => d.name === trimmedName)) { showToast('Ese repartidor ya existe.', 'err'); return; }
    try {
      await createDriver({ name: trimmedName, pin });
    } catch (e) { showToast('Error al crear: ' + e.message, 'err'); return; }
    setName(''); setPin('');
    showToast('Usuario creado para ' + trimmedName + '.');
    onChanged();
  }

  async function handleSavePin(driver) {
    const val = pinValueFor(driver);
    if (!/^\d{4,6}$/.test(val)) { showToast('El PIN debe tener entre 4 y 6 números.', 'err'); return; }
    try { await updateDriverPin(driver.id, val); } catch (e) { showToast('Error al guardar: ' + e.message, 'err'); return; }
    showToast('PIN guardado.');
    onChanged();
  }

  async function handleRemove(driver) {
    try { await deleteDriver(driver.id); } catch (e) { showToast('Error al eliminar: ' + e.message, 'err'); return; }
    showToast('Repartidor eliminado.');
    onChanged();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Usuarios de repartidores</div>
      <div className="modal-sub">
        Crea un usuario con PIN para cada repartidor. Es una traba simple para que no entren por error a un perfil que no es el suyo, no un sistema de seguridad avanzado.
      </div>

      {drivers.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sin repartidores todavía.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {drivers.map(d => (
            <div className="driver-row" key={d.id}>
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 100 }}>
                {d.name}{!d.pin ? <span style={{ color: 'var(--brick)', fontSize: 11 }}> (sin PIN)</span> : null}
              </span>
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="PIN"
                style={{ width: 80, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '6px 8px', fontSize: 13, fontFamily: 'var(--f-mono)' }}
                value={pinValueFor(d)}
                onChange={(e) => setPinEdits(m => ({ ...m, [d.id]: e.target.value }))}
              />
              <button className="ghost-btn" onClick={() => handleSavePin(d)}>Guardar</button>
              <button className="ghost-btn" style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }} onClick={() => handleRemove(d)}>Quitar</button>
            </div>
          ))}
        </div>
      )}

      <div className="form-row" style={{ marginTop: 14 }}>
        <label>Nuevo usuario</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre del repartidor" style={{ flex: 2, minWidth: 140, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '9px 10px', fontSize: 14 }}
            value={name} onChange={(e) => setName(e.target.value)} />
          <input inputMode="numeric" maxLength={6} placeholder="PIN (4-6 dígitos)" style={{ flex: 1, minWidth: 120, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '9px 10px', fontSize: 14, fontFamily: 'var(--f-mono)' }}
            value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn btn-primary" onClick={handleAdd}>Crear usuario</button>
        </div>
      </div>
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar</button></div>
    </Modal>
  );
}
