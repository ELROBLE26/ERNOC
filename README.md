# Reporte Oper

Módulo operativo de flota para Terminal El Roble y La Reina, construido con React + Vite y conectado a Supabase.

## Requisitos

- Node.js 20+
- Proyecto Supabase activo

## Configuración

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea tu archivo `.env` basado en `.env.example`.
3. Ejecuta el SQL de `supabase/schema.sql` en tu proyecto Supabase.
4. Inicia el proyecto:
   ```bash
   npm run dev
   ```

## Variables de entorno

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Qué incluye

- Tabla editable conectada a `reporte_oper_flota`
- Filtros por terminal, zona, servicio, estado y operatividad
- Contadores automáticos sobre datos filtrados
- Alta, edición, duplicado y eliminación
- Exportación CSV
- Realtime de Supabase
- Vista móvil en tarjetas
- Lectura NFC por lector USB HID tipo teclado
- Asociacion NFC a buses y log de lecturas

## Supabase

El esquema y trigger de `updated_at` están en `supabase/schema.sql`.
Ese script también:

- desactiva RLS para esta tabla mientras no exista login
- crea índices únicos para `cod` y `ppu`
- deja la tabla suscrita a `supabase_realtime`
- crea `bus_nfc_cards` para asociar UID NFC con buses
- crea `reporte_oper_nfc_log` para historial de lecturas

## Lectura NFC

El modo principal esta pensado para lectores USB configurados como teclado/HID. Al activar la lectura, la app escucha caracteres rapidos y procesa el UID cuando el lector envia `Enter`.

Tambien queda disponible Web Serial para lectores que expongan puerto serial y Web NFC como compatibilidad futura en Android.
