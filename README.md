# manifiesto-web

Panel del despachador. Next.js + Tailwind + Supabase. Ver `../Manifiesto.md` y `../schema.sql` para el contrato de datos compartido con `manifiesto-app`.

## Arranque

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear el proyecto en [supabase.com](https://supabase.com), correr `../schema.sql` en el SQL Editor.
3. Copiar `.env.example` a `.env.local` y completar con la URL y anon key de tu proyecto Supabase (Project Settings → API).
4. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abrir http://localhost:3000

## Estado actual

Scaffold base (estructura, Tailwind, cliente Supabase) más stubs de las 4 pantallas del despachador, en el orden sugerido por el manifiesto:

- `app/despachador/captura` — captura rápida
- `app/despachador/importar` — importar/exportar CSV
- `app/despachador/asignacion` — asignación manual y por escaneo
- `app/despachador/mapa` — mapa y ajuste de ubicación

Ninguna pantalla tiene lógica todavía — son placeholders con los TODO de qué debe hacer cada una, migrando función por función desde el prototipo HTML.

## Siguiente paso

Con Supabase conectado, construir la lógica real de `captura` primero (es la que genera datos para probar el resto).
