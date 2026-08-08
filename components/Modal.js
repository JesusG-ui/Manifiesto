'use client';

// Shell genérico de modal. Cada módulo pone su contenido adentro.
// `wide` da más espacio horizontal — útil para el mapa de ruta.
export default function Modal({ onClose, wide = false, children }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-content${wide ? ' modal-content-wide' : ''}`}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
}
