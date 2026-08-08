'use client';

import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { deletePackage, removeEvidencePhoto } from '../../../lib/data';

export default function DeleteConfirmModal({ pkg, onClose, onDeleted }) {
  const showToast = useToast();

  async function handleConfirm() {
    try { await deletePackage(pkg.id); }
    catch (e) { showToast('Error al eliminar: ' + e.message, 'err'); return; }
    if (pkg.evidence && pkg.evidence.photo) removeEvidencePhoto(pkg.evidence.photo);
    showToast('Paquete eliminado.');
    onDeleted();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Eliminar paquete</div>
      <div className="modal-sub">{pkg.recipient} · {pkg.id}. Esta acción no se puede deshacer.</div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={handleConfirm}>Eliminar</button>
      </div>
    </Modal>
  );
}
