'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { confirmDelivery } from '../../../lib/data';

function resizeImageFile(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

// Confirmar entrega: foto de evidencia (comprimida) + nota + ubicación GPS al momento de confirmar.
export default function EvidenceUploadModal({ pkg, onClose, onConfirmed }) {
  const showToast = useToast();
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { setPhotoDataUrl(await resizeImageFile(file, 640, 0.6)); }
    catch (err) { showToast('No se pudo procesar la foto.', 'err'); }
  }

  async function handleConfirm() {
    setSaving(true);
    let lat = null, lon = null;
    try {
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
            () => resolve(), { timeout: 3000 }
          );
        });
      }
    } catch (e) {}

    try {
      await confirmDelivery(pkg.id, { photoDataUrl, note: note.trim(), lat, lon });
    } catch (e) {
      showToast('Error al confirmar: ' + e.message, 'err');
      setSaving(false);
      return;
    }
    showToast('Entrega confirmada.');
    onConfirmed();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Confirmar entrega</div>
      <div className="modal-sub">Toma una foto como evidencia. Se comprime para no ocupar mucho espacio.</div>
      <div className="form-row">
        <label>Foto de la entrega</label>
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
        {photoDataUrl && <img src={photoDataUrl} className="evidence-photo" alt="Vista previa" style={{ marginTop: 8 }} />}
      </div>
      <div className="form-row">
        <label>Nota (opcional)</label>
        <textarea placeholder="Recibido por, observaciones…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>{saving ? 'Guardando…' : 'Confirmar entrega'}</button>
      </div>
    </Modal>
  );
}
