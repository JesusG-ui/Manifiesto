'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { parseDelimitedText, guessColumnMap } from '../../../lib/csv';
import { bulkCreatePackages } from '../../../lib/data';

const FIELDS_META = [
  { key: 'tracking', label: 'Código de rastreo' },
  { key: 'recipient', label: 'Destinatario (obligatorio)' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'address', label: 'Dirección (obligatorio)' },
  { key: 'driver', label: 'Repartidor' },
  { key: 'notes', label: 'Notas' },
];

// Importar paquetes desde CSV o pegado de Excel/Sheets, con mapeo de columnas por sinónimos.
export default function ImportModal({ drivers, existingPackages, onClose, onImported }) {
  const showToast = useToast();
  const [step, setStep] = useState('input');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [columnMap, setColumnMap] = useState({});

  async function handleParse() {
    let text = '';
    if (file) text = await file.text();
    else if (pasteText.trim()) text = pasteText;
    if (!text.trim()) { showToast('Sube un archivo o pega los datos primero.', 'err'); return; }
    const parsed = parseDelimitedText(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) { showToast('No se encontraron filas para importar.', 'err'); return; }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setColumnMap(guessColumnMap(parsed.headers));
    setStep('mapping');
  }

  async function handleConfirm() {
    const recipientIdx = columnMap.recipient;
    const addressIdx = columnMap.address;
    if (recipientIdx === undefined || recipientIdx === -1 || addressIdx === undefined || addressIdx === -1) {
      showToast('Selecciona al menos las columnas de destinatario y dirección.', 'err');
      return;
    }
    const existingCodes = new Set(existingPackages.map(p => (p.trackingCode || '').trim().toUpperCase()).filter(Boolean));
    let imported = 0, skippedIncomplete = 0, skippedDuplicate = 0;
    const get = (row, idx) => (idx >= 0 && idx < row.length ? (row[idx] || '').trim() : '');
    const rowsToInsert = [];

    rows.forEach(row => {
      const recipient = get(row, recipientIdx);
      const address = get(row, addressIdx);
      if (!recipient || !address) { skippedIncomplete++; return; }
      const trackingCode = get(row, columnMap.tracking);
      if (trackingCode && existingCodes.has(trackingCode.toUpperCase())) { skippedDuplicate++; return; }
      const phone = get(row, columnMap.phone);
      const notes = get(row, columnMap.notes);
      const driverRaw = get(row, columnMap.driver);
      let driverId = null;
      if (driverRaw) {
        const match = drivers.find(d => d.name.toLowerCase() === driverRaw.toLowerCase());
        if (match) driverId = match.id;
      }
      rowsToInsert.push({
        tracking_code: trackingCode || null, recipient, phone: phone || null, address, notes: notes || null,
        driver_id: driverId, status: driverId ? 'asignado' : 'pendiente',
      });
      if (trackingCode) existingCodes.add(trackingCode.toUpperCase());
      imported++;
    });

    try {
      await bulkCreatePackages(rowsToInsert);
    } catch (e) { showToast('Error al importar: ' + e.message, 'err'); return; }
    showToast(`Importados: ${imported} · Duplicados omitidos: ${skippedDuplicate} · Incompletos: ${skippedIncomplete}`);
    onImported();
    onClose();
  }

  if (step === 'input') {
    return (
      <Modal onClose={onClose}>
        <div className="modal-title">Importar paquetes</div>
        <div className="modal-sub">Sube un archivo CSV o pega las filas copiadas desde Excel o Google Sheets (con encabezados en la primera fila).</div>
        <div className="form-row">
          <label>Archivo CSV</label>
          <input type="file" accept=".csv,.txt" onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        <div className="form-row">
          <label>O pega aquí</label>
          <textarea style={{ minHeight: 120 }} placeholder="Pega las filas copiadas de Excel…" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleParse}>Continuar</button>
        </div>
      </Modal>
    );
  }

  const previewRows = rows.slice(0, 5);
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Confirmar columnas</div>
      <div className="modal-sub">{rows.length} filas detectadas. Revisa que cada campo apunte a la columna correcta.</div>
      {FIELDS_META.map(f => (
        <div className="form-row" key={f.key}>
          <label>{f.label}</label>
          <select
            value={columnMap[f.key] ?? -1}
            onChange={(e) => setColumnMap(m => ({ ...m, [f.key]: parseInt(e.target.value, 10) }))}
          >
            <option value={-1}>— Ninguno —</option>
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
      ))}
      <div style={{ overflowX: 'auto', margin: '14px 0', border: '1px solid var(--line)', borderRadius: 5 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid var(--line-strong)', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {previewRows.map((r, ri) => (
              <tr key={ri}>{headers.map((h, i) => <td key={i} style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{(r[i] || '').slice(0, 40)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm}>Importar {rows.length} paquetes</button>
      </div>
    </Modal>
  );
}
