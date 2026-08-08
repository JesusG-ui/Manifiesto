'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { reassignPackage } from '../../../lib/data';

// Asignación por escaneo: eliges un repartidor una sola vez, y cada código que
// lea el lector (modo teclado: escribe el código y manda Enter solo) se asigna
// al instante a ese repartidor. Pensado para tu lector de códigos de barras físico.
export default function AssignByScanModal({ drivers, packages, onClose, onAssigned }) {
  const showToast = useToast();
  const [driver, setDriver] = useState(null);
  const [scanValue, setScanValue] = useState('');
  const [log, setLog] = useState([]); // [{ code, ok, message, recipient }]
  const [count, setCount] = useState(0);
  const inputRef = useRef(null);
  const assignedAnyRef = useRef(false);

  useEffect(() => {
    if (driver) inputRef.current?.focus();
  }, [driver]);

  function logEntry(entry) {
    setLog(prev => [entry, ...prev].slice(0, 8));
  }

  async function processCode(raw) {
    const norm = raw.trim().toUpperCase();
    if (!norm) return;
    const pkg = packages.find(p => (p.trackingCode || '').trim().toUpperCase() === norm || p.id.toUpperCase() === norm);
    if (!pkg) {
      showToast('Código no encontrado: ' + raw, 'err');
      logEntry({ code: raw, ok: false, message: 'No encontrado' });
      return;
    }
    const wasOther = pkg.driver && pkg.driver !== driver.name;
    try {
      await reassignPackage(pkg.id, driver.id);
    } catch (e) {
      showToast('Error al asignar: ' + e.message, 'err');
      logEntry({ code: raw, ok: false, message: e.message });
      return;
    }
    assignedAnyRef.current = true;
    setCount(c => c + 1);
    logEntry({ code: pkg.trackingCode || pkg.id, ok: true, recipient: pkg.recipient, reassigned: wasOther, from: wasOther ? pkg.driver : null });
    showToast((wasOther ? 'Reasignado (antes ' + pkg.driver + '): ' : 'Asignado: ') + pkg.recipient);
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = scanValue;
    setScanValue('');
    processCode(code);
  }

  function handleClose() {
    if (assignedAnyRef.current) {
      onAssigned();
      showToast(count === 1 ? `Asignaste 1 paquete a ${driver.name}.` : `Asignaste ${count} paquetes a ${driver.name}.`);
    }
    onClose();
  }

  if (!driver) {
    return (
      <Modal onClose={handleClose}>
        <div className="modal-title">Asignar por escaneo</div>
        <div className="modal-sub">Elige a quién le vas a asignar. Después solo escaneas cada paquete y se va asignando solo.</div>
        {drivers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Todavía no hay repartidores creados. Ve a &quot;Repartidores&quot; primero.</p>
        ) : (
          <div className="chip-row" style={{ justifyContent: 'flex-start' }}>
            {drivers.map(d => <button key={d.id} className="chip" onClick={() => setDriver(d)}>{d.name}</button>)}
          </div>
        )}
        <div className="modal-actions"><button className="btn" onClick={handleClose}>Cerrar</button></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={handleClose}>
      <div className="modal-title">Asignando a {driver.name}</div>
      <div className="modal-sub">Escaneados en esta sesión: {count}. Apunta el lector y dispara — cada código se asigna sin que hagas nada más.</div>

      <div className="form-row">
        <label>Escanea aquí</label>
        <input
          ref={inputRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 50)}
          placeholder="Esperando lectura del código…"
          autoFocus
        />
      </div>

      {log.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, marginBottom: 10 }}>
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 12.5, color: entry.ok ? 'var(--forest)' : 'var(--brick)' }}>
              {entry.ok
                ? `✓ ${entry.code} — ${entry.recipient}${entry.reassigned ? ` (antes ${entry.from})` : ''}`
                : `✕ ${entry.code} — ${entry.message}`}
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button
          className="ghost-btn"
          onClick={() => {
            if (count > 0) {
              onAssigned();
              showToast(count === 1 ? `Asignaste 1 paquete a ${driver.name}.` : `Asignaste ${count} paquetes a ${driver.name}.`);
              assignedAnyRef.current = false;
            }
            setDriver(null); setLog([]); setCount(0);
          }}
        >
          Cambiar repartidor
        </button>
        <button className="btn btn-primary" onClick={handleClose}>Terminar</button>
      </div>
    </Modal>
  );
}
