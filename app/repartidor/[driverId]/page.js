'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Masthead from '../../../components/Masthead';
import StatsBar from '../../../components/StatsBar';
import PackageCard from '../../../components/PackageCard';
import IncidentModal from '../../../components/IncidentModal';
import { useToast } from '../../../components/Toast';
import { fetchDrivers, fetchPackages, updatePackage } from '../../../lib/data';

import ClaimModal from '../_components/ClaimModal';
import EvidenceUploadModal from '../_components/EvidenceUploadModal';
import RouteModal from '../_components/RouteModal';

// Módulo de lista de paquetes del repartidor: sus pedidos, tomar uno nuevo,
// marcar en camino / entregado (con evidencia), o reportar incidencia.
export default function RepartidorDashboardPage({ params }) {
  const { driverId } = params;
  const showToast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ type: null, data: null });
  const closeModal = () => setModal({ type: null, data: null });

  const refresh = useCallback(async () => {
    try {
      const d = await fetchDrivers();
      setDrivers(d);
      const p = await fetchPackages(d);
      setPackages(p);
    } catch (e) {
      showToast('Error al cargar datos: ' + e.message, 'err');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const driver = useMemo(() => drivers.find(d => d.id === driverId), [drivers, driverId]);

  const mine = useMemo(() => {
    const own = packages.filter(p => p.driverId === driverId);
    const order = { pendiente: 0, asignado: 0, en_camino: 1, incidencia: 1, entregado: 2 };
    return [...own].sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
  }, [packages, driverId]);

  async function handleMarkEnCamino(pkg) {
    try { await updatePackage(pkg.id, { status: 'en_camino' }); showToast('Marcado en camino.'); refresh(); }
    catch (e) { showToast('Error: ' + e.message, 'err'); }
  }

  if (loading) return (<><Masthead roleLabel="Repartidor" /><div className="loading-screen">Cargando datos…</div></>);

  if (!driver) {
    return (
      <>
        <Masthead roleLabel="Repartidor" />
        <div className="empty-state"><h3>No se encontró ese repartidor</h3><p>Vuelve a elegir tu usuario.</p></div>
      </>
    );
  }

  return (
    <>
      <Masthead roleLabel={`Repartidor · ${driver.name}`} />

      <div className="driver-bar">
        <div className="driver-bar-name">{driver.name}<span>Repartidor</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setModal({ type: 'route' })}>Crear ruta</button>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'claim' })}>+ Tomar pedido</button>
        </div>
      </div>

      <StatsBar list={mine} activeStatus="all" />

      {mine.length === 0 ? (
        <div className="empty-state"><h3>No tienes paquetes asignados</h3><p>Cuando el despachador te asigne uno, aparecerá aquí.</p></div>
      ) : (
        <div className="card-grid">
          {mine.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              role="driver"
              actions={{
                onMarkEnCamino: handleMarkEnCamino,
                onOpenEvidence: (p) => setModal({ type: 'evidence', data: p }),
                onMarkIncident: (p) => setModal({ type: 'incident', data: p }),
              }}
            />
          ))}
        </div>
      )}

      {modal.type === 'claim' && (
        <ClaimModal driver={driver} packages={packages} onClose={closeModal} onClaimed={refresh} />
      )}
      {modal.type === 'evidence' && (
        <EvidenceUploadModal pkg={modal.data} onClose={closeModal} onConfirmed={refresh} />
      )}
      {modal.type === 'incident' && (
        <IncidentModal pkg={modal.data} onClose={closeModal} onSaved={refresh} />
      )}
      {modal.type === 'route' && (
        <RouteModal packages={mine} onClose={closeModal} onSaved={refresh} />
      )}
    </>
  );
}
