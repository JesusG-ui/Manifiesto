'use client';

import { useMemo, useState } from 'react';
import Modal from '../../../components/Modal';

const MONTH_FORMAT = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
function monthKey(date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function percent(value, total) { return total ? Math.round((value / total) * 100) : 0; }

export default function TareoModal({ drivers, packages, onClose }) {
  const currentMonth = monthKey(new Date());
  const availableMonths = useMemo(() => {
    const values = new Set(packages.map(p => monthKey(p.createdAt)).filter(Boolean));
    values.add(currentMonth);
    return [...values].sort().reverse();
  }, [packages, currentMonth]);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || currentMonth);

  const report = useMemo(() => {
    const monthPackages = packages.filter(p => monthKey(p.createdAt) === selectedMonth);
    const rows = drivers.map(driver => {
      const list = monthPackages.filter(p => p.driverId === driver.id);
      const delivered = list.filter(p => p.status === 'entregado').length;
      const rejected = list.filter(p => p.status === 'incidencia').length;
      const active = list.filter(p => p.status === 'asignado' || p.status === 'en_camino').length;
      const pending = list.filter(p => p.status === 'pendiente').length;
      const resolved = delivered + rejected;
      return {
        id: driver.id, name: driver.name, total: list.length, delivered, rejected, active, pending,
        activeDays: new Set(list.map(p => new Date(p.createdAt).toDateString())).size,
        effectiveness: percent(delivered, resolved),
      };
    }).filter(row => row.total > 0).sort((a, b) => b.delivered - a.delivered || b.total - a.total);
    const totals = rows.reduce((acc, row) => {
      acc.total += row.total; acc.delivered += row.delivered; acc.rejected += row.rejected;
      acc.active += row.active; acc.pending += row.pending; return acc;
    }, { total: 0, delivered: 0, rejected: 0, active: 0, pending: 0 });
    totals.unassigned = monthPackages.filter(p => !p.driverId).length;
    totals.effectiveness = percent(totals.delivered, totals.delivered + totals.rejected);
    return { rows, totals };
  }, [drivers, packages, selectedMonth]);

  function exportCsv() {
    const lines = [
      ['Repartidor', 'Pedidos', 'Entregados', 'Rechazados / incidencias', 'En proceso', 'Pendientes', 'Dias activos', 'Efectividad'],
      ...report.rows.map(r => [r.name, r.total, r.delivered, r.rejected, r.active, r.pending, r.activeDays, `${r.effectiveness}%`]),
    ];
    const csv = lines.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `tareo_${selectedMonth}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="tareo-head">
        <div><div className="modal-title">Tareo mensual</div><div className="modal-sub">Rendimiento de los repartidores según los pedidos creados en el mes.</div></div>
        <label className="tareo-month"><span>Periodo</span><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {availableMonths.map(value => <option key={value} value={value}>{MONTH_FORMAT.format(new Date(`${value}-01T12:00:00`))}</option>)}
        </select></label>
      </div>
      <div className="tareo-period">Resumen de {MONTH_FORMAT.format(new Date(`${selectedMonth}-01T12:00:00`))}</div>
      <div className="tareo-kpis">
        <div><strong>{report.totals.total}</strong><span>Pedidos asignados</span></div>
        <div className="success"><strong>{report.totals.delivered}</strong><span>Entregados</span></div>
        <div className="danger"><strong>{report.totals.rejected}</strong><span>Rechazados / incidencias</span></div>
        <div><strong>{report.totals.active}</strong><span>En proceso</span></div>
        <div><strong>{report.totals.effectiveness}%</strong><span>Efectividad</span></div>
      </div>
      {report.rows.length === 0 ? <div className="empty-state"><h3>Sin actividad en este mes</h3><p>No hay pedidos asignados durante el periodo elegido.</p></div> :
        <div className="tareo-table-wrap"><table className="tareo-table"><thead><tr><th>Repartidor</th><th>Pedidos</th><th>Entregados</th><th>Rechazados</th><th>En proceso</th><th>Días activos</th><th>Efectividad</th></tr></thead>
          <tbody>{report.rows.map((row, index) => <tr key={row.id}><td><span className="tareo-rank">{index + 1}</span><strong>{row.name}</strong></td><td>{row.total}</td><td className="success">{row.delivered}</td><td className="danger">{row.rejected}</td><td>{row.active + row.pending}</td><td>{row.activeDays}</td><td><span className="tareo-rate">{row.effectiveness}%</span></td></tr>)}</tbody>
        </table></div>}
      {report.totals.unassigned > 0 && <div className="tareo-note">Además hay {report.totals.unassigned} pedido(s) sin repartidor asignado en este mes.</div>}
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar</button><button className="btn btn-primary" onClick={exportCsv} disabled={!report.rows.length}>Exportar tareo</button></div>
    </Modal>
  );
}
