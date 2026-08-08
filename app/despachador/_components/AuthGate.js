'use client';

import { useEffect, useState } from 'react';
import Masthead from '../../../components/Masthead';
import { supabase } from '../../../lib/supabaseClient';

// Puerta de acceso del despachador: exige una sesión real de Supabase Auth
// (correo + contraseña) antes de mostrar cualquier dato de paquetes o repartidores.
// Mientras no haya sesión, no se monta el panel (`children`) y por lo tanto
// tampoco se disparan las consultas a Supabase.
export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading'); // loading | out | in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? 'in' : 'out'));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'in' : 'out');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (err) setError('Correo o contraseña incorrectos.');
  }

  if (status === 'loading') {
    return (<><Masthead /><div className="loading-screen">Verificando acceso…</div></>);
  }

  if (status === 'out') {
    return (
      <>
        <Masthead />
        <div className="gate">
          <div className="gate-title">Acceso despachador</div>
          <div className="gate-sub">Ingresa con tu correo y contraseña para continuar.</div>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 260 }}
          >
            <input
              type="email" required placeholder="Correo" autoFocus autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="tf-input" style={{ width: '100%' }}
            />
            <input
              type="password" required placeholder="Contraseña" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="tf-input" style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12.5, color: 'var(--brick)', minHeight: 16 }}>{error}</div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </>
    );
  }

  return children;
}
