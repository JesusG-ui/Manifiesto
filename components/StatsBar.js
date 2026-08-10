'use client';

function countsFor(list) {
  const c = { pendiente: 0, asignado: 0, en_camino: 0, entregado: 0, incidencia: 0 };
  list.forEach(p => { if (c[p.status] !== undefined) c[p.status]++; });
  return c;
}

export default function StatsBar({ list, activeStatus = 'all', onSelect, activeLocation = 'all', onLocationSelect }) {
  const c = countsFor(list);
  const lc = list.reduce((acc, p) => {
    const key = p.locationStatus || 'unprocessed';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { confirmed: 0, approximate: 0, not_found: 0, unprocessed: 0 });
  const chips = [
    { k: 'all', label: 'Todos', n: list.length },
    { k: 'pendiente', label: 'Pendientes', n: c.pendiente },
    { k: 'asignado', label: 'Asignados', n: c.asignado },
    { k: 'en_camino', label: 'En camino', n: c.en_camino },
    { k: 'entregado', label: 'Entregados', n: c.entregado },
    { k: 'incidencia', label: 'Incidencias', n: c.incidencia },
  ];
  const locations = [
    { k: 'confirmed', label: 'Ubicación confirmada', n: lc.confirmed, tone: 'confirmed' },
    { k: 'approximate', label: 'Ubicación aproximada', n: lc.approximate, tone: 'approximate' },
    { k: 'not_found', label: 'Sin ubicación', n: lc.not_found, tone: 'missing' },
    { k: 'unprocessed', label: 'Sin procesar', n: lc.unprocessed, tone: 'unprocessed' },
  ];
  return <div className="stats-row">
    {chips.map(s => <div key={s.k} className={`stat-chip${activeStatus === s.k ? ' active' : ''}`} style={{ cursor: onSelect ? 'pointer' : 'default' }} onClick={() => onSelect?.(s.k)}><div className="stat-num">{s.n}</div><div className="stat-label">{s.label}</div></div>)}
    <div className="stats-divider" aria-hidden="true" />
    {locations.map(s => <div key={s.k} className={`stat-chip stat-chip-location ${s.tone}${activeLocation === s.k ? ' active' : ''}`} style={{ cursor: onLocationSelect ? 'pointer' : 'default' }} onClick={() => onLocationSelect?.(activeLocation === s.k ? 'all' : s.k)}><div className="stat-num">{s.n}</div><div className="stat-label">{s.label}</div></div>)}
  </div>;
}
