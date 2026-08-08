'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { extractLabelFromPhoto, compressImageFile, bulkCreatePackages } from '../../../lib/data';

// Importar varios paquetes de un jalón a partir de fotos de sus etiquetas.
// Cada foto se manda a Claude (vía /api/extract-label) para sacar destinatario,
// teléfono, dirección y código de rastreo; el despachador revisa/corrige antes
// de guardar todo junto. La ubicación en el mapa se resuelve después, igual
// que con la importación por CSV (botón "Ubicar direcciones").
export default function ImportPhotosModal({ drivers, onClose, onImported }) {
  const showToast = useToast();
  const [step, setStep] = useState('input'); // input | reading | review
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState([]); // { include, recipient, phone, address, trackingCode, error }
  const [driverName, setDriverName] = useState('');
  const [saving, setSaving] = useState(false);

  function handlePickFiles(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleReadAll() {
    if (files.length === 0) { showToast('Selecciona al menos una foto.', 'err'); return; }
    setStep('reading');
    setProgress({ done: 0, total: files.length });
    const results = [];
    for (const file of files) {
      try {
        const dataUrl = await compressImageFile(file);
        const fields = await extractLabelFromPhoto(dataUrl);
        results.push({
          include: true,
          recipient: fields.recipient || '',
          phone: fields.phone || '',
          address: fields.address || '',
          trackingCode: fields.trackingCode || '',
          error: (!fields.recipient && !fields.address) ? 'No se pudo leer bien esta etiqueta — revísala a mano.' : '',
        });
      } catch (e) {
        results.push({ include: true, recipient: '', phone: '', address: '', trackingCode: '', error: 'Error al leer: ' + e.message });
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setRows(results);
    setStep('review');
  }

  function updateRow(idx, field, value) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  async function handleConfirm() {
    const driverObj = driverName ? drivers.find(d => d.name === driverName) : null;
    const toInsert = rows
      .filter(r => r.include && r.recipient.trim() && r.address.trim())
      .map(r => ({
        tracking_code: r.trackingCode.trim() || null,
        recipient: r.recipient.trim(),
        phone: r.phone.trim() || null,
        address: r.address.trim(),
        notes: null,
        driver_id: driverObj ? driverObj.id : null,
        status: driverObj ? 'asignado' : 'pendiente',
      }));
    if (toInsert.length === 0) { showToast('No hay paquetes válidos para importar (falta destinatario o dirección).', 'err'); return; }
    setSaving(true);
    try {
      await bulkCreatePackages(toInsert);
    } catch (e) { showToast('Error al importar: ' + e.message, 'err'); setSaving(false); return; }
    showToast(`Importados ${toInsert.length} paquetes desde fotos.`);
    onImported();
    onClose();
  }

  if (step === 'input') {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">Importar por fotos</div>
        <div className="modal-sub">Selecciona varias fotos de etiquetas — la IA saca destinatario, teléfono, dirección y código de cada una.</div>
        <div className="form-row">
          <label>Fotos</label>
          <input type="file" accept="image/*" multiple onChange={handlePickFiles} />
          {files.length > 0 ? <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>{files.length} foto(s) seleccionada(s).</div> : null}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleReadAll}>Leer etiquetas</button>
        </div>
      </Modal>
    );
  }

  if (step === 'reading') {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">Leyendo etiquetas…</div>
        <div className="modal-sub">Foto {progress.done} de {progress.total}. No cierres esta ventana.</div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-title">Revisar antes de importar</div>
      <div className="modal-sub">{rows.length} foto(s) leídas. Corrige lo que haga falta y desmarca las que no quieras guardar.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', margin: '10px 0' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ border: '1px solid var(--line-strong)', borderRadius: 6, padding: 10, opacity: r.include ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={r.include} onChange={(e) => updateRow(i, 'include', e.target.checked)} />
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Foto {i + 1}</span>
              {r.error ? <span style={{ fontSize: 12, color: 'var(--brick)' }}>{r.error}</span> : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input placeholder="Destinatario" value={r.recipient} onChange={(e) => updateRow(i, 'recipient', e.target.value)}
                style={{ border: '1px solid var(--line-strong)', borderRadius: 5, padding: '7px 9px', fontSize: 13.5 }} />
              <input placeholder="Teléfono" value={r.phone} onChange={(e) => updateRow(i, 'phone', e.target.value)}
                style={{ border: '1px solid var(--line-strong)', borderRadius: 5, padding: '7px 9px', fontSize: 13.5 }} />
              <input placeholder="Dirección" value={r.address} onChange={(e) => updateRow(i, 'address', e.target.value)}
                style={{ gridColumn: '1 / -1', border: '1px solid var(--line-strong)', borderRadius: 5, padding: '7px 9px', fontSize: 13.5 }} />
              <input placeholder="Código de rastreo" value={r.trackingCode} onChange={(e) => updateRow(i, 'trackingCode', e.target.value)}
                style={{ border: '1px solid var(--line-strong)', borderRadius: 5, padding: '7px 9px', fontSize: 13.5, fontFamily: 'var(--f-mono)' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="form-row">
        <label>Asignar todos a (opcional)</label>
        <select value={driverName} onChange={(e) => setDriverName(e.target.value)}>
          <option value="">Sin asignar</option>
          {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Guardando…' : `Importar ${rows.filter(r => r.include).length} paquetes`}
        </button>
      </div>
    </Modal>
  );
}
