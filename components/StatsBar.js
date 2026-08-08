'use client';

function countsFor(list) {
  const c = { pendiente: 0, asignado: 0, en_camino: 0, entregado: 0, incidencia: 0 };
  list.forEach(p => { if (c[p.status] !== undefined) c[p.status]++; });
  return c;
}

// Barra de contadores por estado. Si se pasa onSelect, los chips son clicables (filtro).
export default function StatsBar({ list, activeStatus = 'all', onSelect }) {
  const c = countsFor(list);
  const chips = [
    { k: 'all', label: 'Todos', n: list.length },
    { k: 'pendiente', label: 'Pendientes', n: c.pendiente },
    { k: 'asignado', label: 'Asignados', n: c.asignado },
    { k: 'en_camino', label: 'En camino', n: c.en_camino },
    { k: 'entregado', label: 'Entregados', n: c.entregado },
    { k: 'incidencia', label: 'Incidencias', n: c.incidencia },
  ];
  return (
    <div className="stats-row">
      {chips.map(s => (
        <div
          key={s.k}
          className={`stat-chip${activeStatus === s.k ? ' active' : ''}`}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
          onClick={() => onSelect && onSelect(s.k)}
        >
          <div className="stat-num">{s.n}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
