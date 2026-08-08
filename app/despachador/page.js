'use client';

// Panel dinámico (lee Supabase en el navegador) — nunca pre-generar en el build.
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamicImport from 'next/dynamic';
import Masthead from '../../components/Masthead';
import StatsBar from '../../components/StatsBar';
import PackageCard from '../../components/PackageCard';
import IncidentModal from '../../components/IncidentModal';
import { useToast } from '../../components/Toast';
import { fetchDrivers, fetchPackages, reassignPackage, updatePackage, geocodeAddress } from '../../lib/data';
import { STATUS } from '../../components/StatusBadge';
import TileIcon from '../../components/TileIcon';

// Leaflet toca `window` al cargarse, así que este mapa solo puede existir en el navegador.
const FullMap = dynamicImport(() => import('../../components/map/FullMap'), { ssr: false });

import AssignByScanModal from './_components/AssignByScanModal';
import ImportModal from './_components/ImportModal';
import AddPackageModal from './_components/AddPackageModal';
import DriversModal from './_components/DriversModal';
import EditLocationModal from './_components/EditLocationModal';
import EvidenceViewModal from './_components/EvidenceViewModal';
import DeleteConfirmModal from './_components/DeleteConfirmModal';
import QuickAssignModal from './_components/QuickAssignModal';

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Módulo Despachador: stats + toolbar + lista de paquetes (o mapa). Todos los "extras"
// (captura rápida, importar, nuevo paquete, repartidores, evidencia, etc.) son sub-módulos
// que se abren como modales desde acá.
export default function DespachadorPage() {
  const showToast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [view, setView] = useState('list');

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

  /* ----- Lector USB en modo teclado: escanea sin hacer clic en nada ----- */
  useEffect(() => {
    let buffer = '';
    let lastKey = 0;

    async function processScan(code) {
      const norm = code.trim().toUpperCase();
      const pkg = packages.find(p => (p.trackingCode || '').trim().toUpperCase() === norm || p.id.toUpperCase() === norm);
      if (pkg) setModal({ type: 'quick-assign', data: pkg });
      else {
        showToast('Código nuevo detectado: ' + code);
        setModal({ type: 'add-package', data: { initialTrackingCode: code } });
      }
    }

    function onKeyDown(e) {
      if (modal.type) return; // no capturar mientras hay un modal abierto
      if (isEditableTarget(e.target)) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock'].includes(e.key)) return;
      const now = Date.now();
      const delta = now - lastKey;
      lastKey = now;
      if (e.key === 'Enter') {
        const code = buffer;
        buffer = '';
        if (code.length >= 4) processScan(code);
        return;
      }
      if (e.key === 'Escape') { buffer = ''; return; }
      if (e.key.length === 1) {
        if (delta > 100) buffer = '';
        buffer += e.key;
      }
    }
    document.body.addEventListener('keydown', onKeyDown);
    return () => document.body.removeEventListener('keydown', onKeyDown);
  }, [packages, modal.type, showToast]);

  const filteredPackages = useMemo(() => {
    return packages.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterDriver !== 'all' && p.driver !== filterDriver) return false;
      if (filterText) {
        const t = filterText.toLowerCase();
        const hay = (p.recipient + ' ' + p.address + ' ' + p.id + ' ' + (p.phone || '') + ' ' + (p.trackingCode || '')).toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [packages, filterStatus, filterDriver, filterText]);

  async function handleReassign(pkgId, driverName) {
    const driverObj = driverName ? drivers.find(d => d.name === driverName) : null;
    try { await reassignPackage(pkgId, driverObj ? driverObj.id : null); showToast('Reasignado.'); refresh(); }
    catch (e) { showToast('Error al reasignar: ' + e.message, 'err'); }
  }

  function handleExport() {
    const rows = [['Codigo interno', 'Codigo de rastreo', 'Destinatario', 'Telefono', 'Direccion', 'Repartidor', 'Estado', 'Notas', 'Creado']];
    packages.forEach(p => rows.push([p.id, p.trackingCode || '', p.recipient, p.phone || '', p.address, p.driver || '', STATUS[p.status].label, (p.notes || '').replace(/\n/g, ' '), p.createdAt]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'paquetes_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exportado como CSV.');
  }

  async function handleBulkGeocode() {
    const targets = packages.filter(p => !p.lat || !p.lon).slice(0, 30);
    if (targets.length === 0) { showToast('Todos los paquetes ya tienen ubicación.'); return; }
    showToast('Ubicando ' + targets.length + ' direcciones… tardará un par de minutos.');
    let done = 0;
    for (const pkg of targets) {
      try {
        const r = await geocodeAddress(pkg.address);
        if (r) { await updatePackage(pkg.id, { lat: r.lat, lon: r.lon }); done++; }
      } catch (e) {}
      await new Promise(res => setTimeout(res, 1100));
    }
    const d = await fetchDrivers();
    setDrivers(d);
    const fresh = await fetchPackages(d);
    setPackages(fresh);
    const remaining = fresh.filter(p => !p.lat || !p.lon).length;
    showToast('Ubicadas ' + done + ' direcciones' + (remaining > 0 ? ' · quedan ' + remaining + ', vuelve a tocar el botón' : '.'));
  }

  if (loading) {
    return (<><Masthead roleLabel="Despachador" /><div className="loading-screen">Cargando datos…</div></>);
  }

  return (
    <>
      <Masthead roleLabel="Despachador" />

      <StatsBar list={packages} activeStatus={filterStatus} onSelect={setFilterStatus} />

      <div className="section-label">Herramientas</div>
      <div className="tile-grid">
        <button className="tile" onClick={() => setModal({ type: 'add-package', data: {} })}>
          <TileIcon icon="box" color="pink" size={48} />
          <span className="tile-label">Nuevo paquete</span>
        </button>
        <button className="tile" onClick={() => setModal({ type: 'assign-scan' })}>
          <TileIcon icon="scan" color="orange" size={48} />
          <span className="tile-label">Asignar por escaneo</span>
        </button>
        <button className="tile" onClick={() => setModal({ type: 'import' })}>
          <TileIcon icon="upload" color="teal" size={48} />
          <span className="tile-label">Importar CSV</span>
        </button>
        <button className="tile" onClick={() => setModal({ type: 'drivers' })}>
          <TileIcon icon="users" color="purple" size={48} />
          <span className="tile-label">Repartidores</span>
        </button>
        <button className="tile" onClick={() => setView(v => v === 'list' ? 'map' : 'list')}>
          <TileIcon icon="map" color="green" size={48} />
          <span className="tile-label">{view === 'list' ? 'Ver mapa' : 'Ver lista'}</span>
        </button>
        <button className="tile" onClick={handleBulkGeocode}>
          <TileIcon icon="pin" color="yellow" size={48} />
          <span className="tile-label">Ubicar direcciones</span>
        </button>
        <button className="tile" onClick={handleExport}>
          <TileIcon icon="download" color="blue" size={48} />
          <span className="tile-label">Exportar</span>
        </button>
      </div>

      <div className="section-label">Paquetes</div>
      <div className="scanner-hint">Lector de códigos conectado: escanea cualquier paquete (sin hacer clic en nada) para asignarlo al instante.</div>
      <div className="toolbar">
        <input className="tf-input" placeholder="Buscar por destinatario, dirección o código de rastreo…" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <select className="tf-select" value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}>
          <option value="all">Todos los repartidores</option>
          {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      {view === 'map' ? (
        <FullMap packages={packages} />
      ) : packages.length === 0 ? (
        <div className="empty-state">
          <h3>Aún no hay paquetes cargados</h3>
          <p>Agrega repartidores y luego crea tu primer paquete con &quot;+ Nuevo paquete&quot;, o usa &quot;Importar CSV&quot; para cargar varios de una vez.</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="empty-state"><h3>Sin resultados</h3><p>Ajusta la búsqueda o los filtros.</p></div>
      ) : (
        <div className="card-grid">
          {filteredPackages.slice(0, 150).map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              role="admin"
              drivers={drivers}
              actions={{
                onReassign: handleReassign,
                onEditLocation: (p) => setModal({ type: 'edit-location', data: p }),
                onViewEvidence: (p) => setModal({ type: 'view-evidence', data: p }),
                onMarkIncident: (p) => setModal({ type: 'incident', data: p }),
                onDelete: (p) => setModal({ type: 'delete', data: p }),
              }}
            />
          ))}
        </div>
      )}

      {modal.type === 'assign-scan' && <AssignByScanModal drivers={drivers} packages={packages} onClose={closeModal} onAssigned={refresh} />}
      {modal.type === 'import' && <ImportModal drivers={drivers} existingPackages={packages} onClose={closeModal} onImported={refresh} />}
      {modal.type === 'add-package' && (
        <AddPackageModal drivers={drivers} initialTrackingCode={modal.data?.initialTrackingCode || ''} onClose={closeModal} onSaved={refresh} />
      )}
      {modal.type === 'drivers' && <DriversModal drivers={drivers} onClose={closeModal} onChanged={refresh} />}
      {modal.type === 'edit-location' && <EditLocationModal pkg={modal.data} onClose={closeModal} onSaved={refresh} />}
      {modal.type === 'view-evidence' && <EvidenceViewModal pkg={modal.data} onClose={closeModal} />}
      {modal.type === 'incident' && <IncidentModal pkg={modal.data} onClose={closeModal} onSaved={refresh} />}
      {modal.type === 'delete' && <DeleteConfirmModal pkg={modal.data} onClose={closeModal} onDeleted={refresh} />}
      {modal.type === 'quick-assign' && <QuickAssignModal pkg={modal.data} drivers={drivers} onClose={closeModal} onAssigned={refresh} />}
    </>
  );
}
