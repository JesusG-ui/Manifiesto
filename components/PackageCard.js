'use client';

import StatusBadge from './StatusBadge';
import { fmtDate } from '../lib/format';

// Tarjeta de paquete. `role` decide qué acciones se muestran.
// admin: { drivers, onReassign, onEditLocation, onViewEvidence, onMarkIncident, onDelete }
// driver: { onMarkEnCamino, onOpenEvidence, onMarkIncident, onFixLocation }
export default function PackageCard({ pkg, role, drivers = [], actions = {} }) {
  const hasLocation = !!(pkg.lat && pkg.lon);
  const dirUrl = hasLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${pkg.lat},${pkg.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pkg.address)}`;
  const mapBtnStyle = hasLocation
    ? { color: 'var(--forest)', borderColor: 'var(--forest)' }
    : { color: 'var(--amber)', borderColor: 'var(--amber)' };

  return (
    <div className="wcard">
      <div className="wcard-top">
        <span className="wcard-code">{pkg.trackingCode ? `COD. ${pkg.trackingCode}` : `REF. ${pkg.id.slice(0, 8)}`}</span>
        <StatusBadge status={pkg.status} />
      </div>
      <div className="wcard-recipient">{pkg.recipient}</div>
      <div className="wcard-address">{pkg.address}</div>
      <div className="wcard-meta">
        {pkg.phone ? `Tel. ${pkg.phone} · ` : ''}
        {role === 'admin' ? (pkg.driver || 'Sin asignar') : fmtDate(pkg.createdAt)}
      </div>
      {pkg.notes ? <div className="wcard-notes">{pkg.notes}</div> : null}
      {pkg.status === 'incidencia' && pkg.incidentNote ? (
        <div className="wcard-notes" style={{ color: 'var(--brick)' }}>Incidencia: {pkg.incidentNote}</div>
      ) : null}

      <div className="wcard-foot">
        {role === 'admin' ? (
          <>
            <select
              className="tf-select wcard-driver-select"
              value={pkg.driver || ''}
              onChange={(e) => actions.onReassign && actions.onReassign(pkg.id, e.target.value)}
            >
              <option value="">Sin asignar</option>
              {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <a
              className="ghost-btn"
              href={dirUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={mapBtnStyle}
              title={hasLocation ? 'Ya tiene ubicación marcada' : 'Sin ubicación exacta — usa "Ajustar ubicación"'}
            >
              Ver mapa
            </a>
            <button className="ghost-btn" onClick={() => actions.onEditLocation && actions.onEditLocation(pkg)}>Ajustar ubicación</button>
            {pkg.evidence ? <button className="ghost-btn" onClick={() => actions.onViewEvidence && actions.onViewEvidence(pkg)}>Ver evidencia</button> : null}
            {pkg.status !== 'incidencia' ? <button className="ghost-btn" onClick={() => actions.onMarkIncident && actions.onMarkIncident(pkg)}>Incidencia</button> : null}
            <button className="ghost-btn" style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }} onClick={() => actions.onDelete && actions.onDelete(pkg)}>Eliminar</button>
          </>
        ) : (
          <>
            <a className="ghost-btn btn-big" href={dirUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            <button className="ghost-btn btn-big" disabled={pkg.status !== 'asignado'} onClick={() => actions.onMarkEnCamino && actions.onMarkEnCamino(pkg)}>En camino</button>
            <button className="ghost-btn btn-big" disabled={!(pkg.status === 'asignado' || pkg.status === 'en_camino')} onClick={() => actions.onOpenEvidence && actions.onOpenEvidence(pkg)}>Entregado</button>
            <button className="ghost-btn" onClick={() => actions.onMarkIncident && actions.onMarkIncident(pkg)}>Reportar incidencia</button>
            <button className="ghost-btn" onClick={() => actions.onFixLocation && actions.onFixLocation(pkg)}>Corregir ubicación</button>
          </>
        )}
      </div>
    </div>
  );
}
