'use client';

// Íconos planos, mínimos, dibujados a mano en SVG (sin depender de una librería de íconos).
const PATHS = {
  truck: 'M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 15.5 15.5 8.5M6 13v-1a4 4 0 0 1 4-4h1',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M23 20a6 6 0 0 0-6.5-6',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  pin: 'M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  box: 'M21 8 12 3 3 8l9 5 9-5ZM3 8v9l9 5m9-14v9l-9 5m0-9v9',
  scan: 'M4 4h4M4 4v4M20 4h-4M20 4v4M4 20h4M4 20v-4M20 20h-4M20 20v-4M6 9v6M9 8v8M12 8v8M15 9v6M18 8v8',
  lock: 'M6 11V7a6 6 0 0 1 12 0v4M4 11h16v9H4Zm8 5v-3',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4Zm8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
};

const COLORS = {
  purple: '#7C5CFC',
  orange: '#F5A623',
  teal: '#17A2A0',
  green: '#22A06B',
  blue: '#3B82F6',
  pink: '#E85D8A',
  red: '#E5484D',
  yellow: '#F2C94C',
};

export default function TileIcon({ icon = 'box', color = 'purple', size = 48 }) {
  const bg = COLORS[color] || color;
  const d = PATHS[icon] || PATHS.box;
  return (
    <div className="tile-icon" style={{ width: size, height: size, background: bg }}>
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </div>
  );
}
