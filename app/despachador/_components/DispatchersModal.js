'use client';

import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { fetchDispatchers, createDispatcher, deleteDispatcher } from '../../../lib/data';

// Alta y baja de usuarios de despachador (usuario + PIN). A diferencia de los
// repartidores, esto sí es una sesión real de Supabase Auth por debajo.
export default function DispatchersModal({ currentUserId, onClose }) {
  const showToast = useToast();
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try { setDispatchers(await fetchDispatchers()); }
    catch (e) { showToast('Error al cargar despachadores: ' + e.message, 'err'); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    const trimmedUser = username.trim();
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(trimmedUser)) { showToast('Usuario inválido: 3-20 caracteres, sin espacios.', 'err'); return; }
    if (!/^\d{4,6}$/.test(pin)) { showToast('El PIN debe tener entre 4 y 6 números.', 'err'); return; }
    setSaving(true);
    try {
      await createDispatcher({ username: trimmedUser, pin });
      setUsername(''); setPin('');
      showToast('Despachador creado: ' + trimmedUser + '.');
      refresh();
    } catch (e) { showToast('Error al crear: ' + e.message, 'err'); }
    finally { setSaving(false); }
  }

  async function handleRemove(d) {
    if (d.userId === currentUserId) { showToast('No puedes eliminar tu propio usuario.', 'err'); return; }
    try { await deleteDispatcher(d.userId); showToast('Despachador eliminado.'); refresh(); }
    catch (e) { showToast('Error al eliminar: ' + e.message, 'err'); }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Usuarios de despachador</div>
      <div className="modal-sub">Quienes tengan un usuario y PIN aquí pueden entrar al panel de despachador.</div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Cargando…</p>
      ) : dispatchers.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sin despachadores todavía.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dispatchers.map(d => (
            <div className="driver-row" key={d.id}>
              <span style={{ fontSize: 13.5, flex: 1, minWidth: 100 }}>
                {d.username}{d.userId === currentUserId ? <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}> (tú)</span> : null}
              </span>
              <button
                className="ghost-btn"
                style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }}
                disabled={d.userId === currentUserId}
                onClick={() => handleRemove(d)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="form-row" style={{ marginTop: 14 }}>
        <label>Nuevo despachador</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Usuario" style={{ flex: 2, minWidth: 140, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '9px 10px', fontSize: 14 }}
            value={username} onChange={(e) => setUsername(e.target.value)}
          />
          <input
            inputMode="numeric" maxLength={6} placeholder="PIN (4-6 dígitos)"
            style={{ flex: 1, minWidth: 120, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '9px 10px', fontSize: 14, fontFamily: 'var(--f-mono)' }}
            value={pin} onChange={(e) => setPin(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button>
        </div>
      </div>
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar</button></div>
    </Modal>
  );
}
