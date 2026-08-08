import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { usernameToEmail } from '../../../lib/dispatcherAuth';

// Nunca pre-generar: esta ruta siempre necesita leer el header Authorization en vivo.
export const dynamic = 'force-dynamic';

// Solo un despachador ya logueado puede crear o borrar despachadores.
// Verificamos su token de sesión y que exista en la tabla `dispatchers`.
async function requireDispatcher(request, admin) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: row } = await admin.from('dispatchers').select('id').eq('user_id', data.user.id).maybeSingle();
  if (!row) return null;
  return data.user;
}

export async function POST(request) {
  let admin;
  try { admin = getSupabaseAdmin(); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const caller = await requireDispatcher(request, admin);
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = (body.username || '').trim();
  const pin = (body.pin || '').trim();

  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
    return NextResponse.json({ error: 'Usuario inválido: 3 a 20 caracteres, sin espacios.' }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: 'El PIN debe tener entre 4 y 6 números.' }, { status: 400 });
  }

  const email = usernameToEmail(username);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { username },
  });
  if (createError) {
    const msg = /already registered|already exists/i.test(createError.message)
      ? 'Ese usuario ya existe.'
      : createError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: insertError } = await admin.from('dispatchers').insert({ user_id: created.user.id, username });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id); // evita dejar un auth user huérfano
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.user.id, username });
}

export async function DELETE(request) {
  let admin;
  try { admin = getSupabaseAdmin(); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const caller = await requireDispatcher(request, admin);
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Falta userId.' }, { status: 400 });
  if (userId === caller.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario mientras estás conectado con él.' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(userId); // dispatchers.user_id tiene ON DELETE CASCADE
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
