import { createClient } from '@supabase/supabase-js';

// SOLO para usarse dentro de rutas de servidor (app/api/**/route.js).
// La service_role key ignora TODA política de RLS — nunca debe importarse
// desde un componente 'use client' ni exponerse con el prefijo NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL) en las variables de entorno del servidor.'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
