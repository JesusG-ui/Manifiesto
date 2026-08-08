import Link from 'next/link';
import Masthead from '../components/Masthead';
import TileIcon from '../components/TileIcon';

// Módulo Inicio: gate de rol, como un selector de apps. No toca Supabase —
// solo decide a qué módulo entrar.
export default function Home() {
  return (
    <>
      <Masthead />
      <div className="gate">
        <div className="gate-title">¿Cómo vas a entrar?</div>
        <div className="gate-sub">
          Un mismo manifiesto para todo el equipo: el despachador asigna, cada repartidor confirma sus entregas.
        </div>
        <div className="tile-grid" style={{ maxWidth: 320 }}>
          <Link href="/despachador" className="tile">
            <TileIcon icon="route" color="purple" size={60} />
            <span className="tile-label">Despachador</span>
            <span className="tile-sub">Cargar, asignar y ver el mapa</span>
          </Link>
          <Link href="/repartidor" className="tile">
            <TileIcon icon="truck" color="teal" size={60} />
            <span className="tile-label">Repartidor</span>
            <span className="tile-sub">Tus pedidos y entregas del día</span>
          </Link>
        </div>
      </div>
    </>
  );
}
