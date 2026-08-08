import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copia .env.example a .env.local (o configúralas en Vercel) con tus credenciales de Supabase."
  );
}

// Si faltan las variables (por ejemplo, durante un build sin configurar todavía),
// usamos una URL de relleno con formato válido para que createClient() no truene
// el build entero — la app simplemente no podrá leer datos reales hasta que
// completes las variables de verdad.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
