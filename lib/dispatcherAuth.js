// Los despachadores inician sesión con "usuario + PIN" en vez de correo real.
// Por debajo seguimos usando Supabase Auth (sesiones reales, RLS de verdad),
// así que convertimos el usuario en un correo sintético que nadie recibe.
const DISPATCHER_EMAIL_DOMAIN = 'dispatchers.manifiesto.local';

export function usernameToEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${clean}@${DISPATCHER_EMAIL_DOMAIN}`;
}
