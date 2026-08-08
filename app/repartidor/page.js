'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Masthead from '../../components/Masthead';
import { fetchDrivers } from '../../lib/data';

// Módulo de entrada del repartidor: elegir quién eres + PIN. Al validar,
// navega al módulo de lista de paquetes (/repartidor/[driverId]).
export default function RepartidorGatePage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // driver elegido, pendiente de PIN
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrivers().then(setDrivers).finally(() => setLoading(false));
  }, []);

  function pickDriver(d) {
    if (d.pin) { setPending(d); setPin(''); setError(''); }
    else router.push(`/repartidor/${d.id}`);
  }

  function submitPin() {
    if (pending && pending.pin === pin.trim()) router.push(`/repartidor/${pending.id}`);
    else { setError('PIN incorrecto. Intenta de nuevo.'); setPin(''); }
  }

  if (loading) return (<><Masthead /><div className="loading-screen">Cargando…</div></>);

  if (pending) {
    return (
      <>
        <Masthead />
        <div className="gate">
          <div className="gate-title">Hola, {pending.name}</div>
          <div className="gate-sub">Ingresa tu PIN para ver tus pedidos.</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 220 }}>
            <input
              type="password" inputMode="numeric" maxLength={6} placeholder="PIN" autoFocus
              value={pin} onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 20, letterSpacing: '.25em', border: '1px solid var(--line-strong)', borderRadius: 6, padding: 12 }}
            />
            <div style={{ fontSize: 12.5, color: 'var(--brick)', minHeight: 16 }}>{error}</div>
            <button className="btn btn-primary btn-block" onClick={submitPin}>Entrar</button>
            <button className="ghost-btn" onClick={() => setPending(null)}>Volver</button>
          </div>
        </div>
      </>
    );
  }

  if (drivers.length === 0) {
    return (
      <>
        <Masthead />
        <div className="gate">
          <div className="gate-title">Todavía no hay repartidores</div>
          <div className="gate-sub">Pide al despachador que te agregue desde su vista antes de continuar.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Masthead />
      <div className="gate">
        <div className="gate-title">¿Quién eres?</div>
        <div className="gate-sub">Elige tu nombre para ver solo tus paquetes.</div>
        <div className="chip-row">
          {drivers.map(d => <button key={d.id} className="chip" onClick={() => pickDriver(d)}>{d.name}</button>)}
        </div>
      </div>
    </>
  );
}
