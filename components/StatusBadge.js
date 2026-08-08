export const STATUS = {
  pendiente: { label: 'Pendiente', color: 'var(--amber)' },
  asignado: { label: 'Asignado', color: 'var(--route)' },
  en_camino: { label: 'En camino', color: 'var(--indigo)' },
  entregado: { label: 'Entregado', color: 'var(--forest)' },
  incidencia: { label: 'Incidencia', color: 'var(--brick)' },
};

export const STATUS_MAP_COLOR = {
  pendiente: '#B8792A', asignado: '#1F6F78', en_camino: '#4A55A0', entregado: '#3C7A52', incidencia: '#A8432B',
};

export default function StatusBadge({ status }) {
  const st = STATUS[status] || { label: status, color: 'var(--ink-soft)' };
  return <span className="stamp" style={{ color: st.color }}>{st.label}</span>;
}
