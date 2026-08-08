'use client';

import Link from 'next/link';

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Encabezado compartido por todos los módulos. `roleLabel` es opcional
// (p. ej. "Despachador" o "Repartidor · Ana"); si se pasa, muestra el botón "Cambiar rol".
export default function Masthead({ roleLabel }) {
  return (
    <>
      <div className="masthead">
        <div className="brand">
          <span className="brand-mark">MFT</span>
          <div>
            <div className="brand-title">Manifiesto</div>
            <div className="brand-sub">{todayLabel()}</div>
          </div>
        </div>
        {roleLabel ? (
          <div className="masthead-right">
            <span>{roleLabel}</span>
            <Link href="/" className="role-pill">Cambiar rol</Link>
          </div>
        ) : null}
      </div>
      <div className="route-divider"></div>
    </>
  );
}
