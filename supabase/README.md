# Backend (Supabase)

Un solo proyecto de Supabase para toda la plataforma: **ECYR English** y el
**IELTS Simulator** integrado (`src/features/ielts`) comparten usuarios, perfiles,
clases, sesión y el mismo cliente.

## Puesta en marcha en un proyecto nuevo

### 1. Base de datos — una sola pegada

Supabase → **SQL Editor → New query** → pega **todo** [`setup.sql`](setup.sql) → **Run**.

Incluye las once migraciones en orden y se puede re-ejecutar sin perder datos.
(Si prefieres hacerlo por partes, ejecuta `migrations/01` … `12` **en orden** (no hay `10`):
`05` y de `07` a `12` dependen de la tabla `profiles` que crea `01`.)

> **¿Ya tenías la base creada?** Ejecuta las que te falten de `07_portfolio.sql` a `12_notes.sql` (las nuevas: `11_podcasts.sql` y `12_notes.sql`)
> (o volver a pegar `setup.sql` completo: es seguro re-ejecutarlo).

| Migración | Qué hace |
|---|---|
| `01_schema.sql` | Perfiles, progreso IELTS, entregas, feedback, tareas, RLS y trigger de alta. *(IELTS)* |
| `02_roles_and_tasks.sql` | Límites de escritura estudiante/docente; `join_class`, `leave_class`, etc. *(IELTS)* |
| `03_history_visibility.sql` | Quién puede leer su propio historial. *(IELTS)* |
| `04_audio_library.sql` | Bucket privado de audios de Listening por clase. *(IELTS)* |
| `05_ecyr_platform.sql` | `learner_state` (progreso sincronizado) y `ai_usage` + `bump_ai_usage()` (límite diario del AI Coach). |
| `06_api_grants.sql` | Permisos explícitos de la Data API (proyectos nuevos no los dan por defecto). |
| `07_portfolio.sql` | **Mis trabajos**: tabla `portfolio_items`, bucket privado `portfolio` (20 MB/archivo) y `review_portfolio_item()` para que el docente comente y califique. |
| `08_migrations_log.sql` | Registro de importaciones y migraciones (desde el IELTS Simulator original o archivos), visible para el docente. |
| `09_assignments.sql` | **Tareas**: `assignments`, destinatarios y estado por estudiante (entregas con archivo, detección automática, retroalimentación con `review_assignment()`). Sin ella, el botón "Asignar tarea" avisa que falta. |
| `11_podcasts.sql` | **Podcasts**: `podcast_quizzes` (preguntas generadas por IA, una vez por episodio y nivel, compartidas) y `podcast_usage`. |
| `12_notes.sql` | **Mis notas**: `student_notes`, privadas (cada cuenta solo ve las suyas; el docente no las ve). |

`setup.sql` se genera con `npm run db:bundle`; edita siempre `migrations/*`.

### 2. Autenticación

**Authentication → Sign In / Providers → Email** → desactiva **Confirm email**
(el remitente por defecto solo entrega a correos del equipo y está limitado a
2 correos/hora). Con SMTP propio puedes reactivarlo.

**Authentication → URL Configuration** → *Site URL*: tu dominio de Vercel
(p. ej. `https://ecyr-english.vercel.app`) y añádelo también en *Redirect URLs*.

### 3. Conectar la app

**Project Settings → API**: copia *Project URL* y la clave *publishable/anon*.
En **Vercel → Settings → Environment Variables** (y en `.env` local):

```
VITE_SUPABASE_URL=https://<tu-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

El simulador IELTS usa el mismo cliente de Supabase que la app, así que con esas
dos variables todo queda en tu proyecto. Vuelve a desplegar tras cambiarlas.
Nunca uses la clave `service_role`/secret en el frontend.

### 4. IA — Edge Functions

```bash
supabase link --project-ref btfncmarxdlortmlfdko
supabase functions deploy gemini --no-verify-jwt   # IELTS Simulator
supabase functions deploy coach  --no-verify-jwt   # AI Coach (texto; la voz la hace /api/tts)
supabase functions deploy podcast --no-verify-jwt  # preguntas de podcasts
supabase secrets set GEMINI_API_KEY=AIza...         # compartida por ambas
# opcionales
supabase secrets set COACH_DAILY_LIMIT=40 COACH_REQUIRE_CLASS=off GEMINI_MODEL=gemini-3.5-flash-lite
supabase secrets set PODCAST_DAILY_LIMIT=10
```

Sin CLI: **Edge Functions → Deploy a new function → Via editor**, nombre exacto
`gemini` / `coach` / `podcast`, pega `functions/<nombre>/index.ts`, y desactiva **Verify JWT**
(las funciones validan la sesión ellas mismas). Luego **Edge Functions → Secrets**
→ `GEMINI_API_KEY`.

La clave de Gemini nunca llega al navegador, y Gemini solo genera **texto**: no
produce audio. `podcast` usa además `SUPABASE_SERVICE_ROLE_KEY`, que Supabase
inyecta solo dentro de las funciones: no hay que configurarla ni ponerla nunca en Vercel.

### 5. Voces naturales — `/api/tts` (Vercel, no Supabase)

Las voces las genera la función de Vercel [`api/tts.ts`](../api/tts.ts) con las
voces neuronales de Microsoft Edge (gratis, sin clave). Cada frase se genera una
vez y luego la sirve el CDN de Vercel a todos. Solo los usuarios con sesión
iniciada pueden generar audios nuevos.

En **Vercel → Settings → Environment Variables** agrega:

```
TTS_SIGNING_SECRET=<cadena larga al azar, p. ej. `openssl rand -hex 32`>
```

No es una clave de Supabase (nunca uses la `service_role` aquí) y no lleva el
prefijo `VITE_`, así que no llega al navegador. La función usa además
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (ya configuradas) para comprobar la
sesión. Opcionales: `EDGE_TTS_VERSION` (si Microsoft cambia la versión que exige)
y `EDGE_TTS_FORMAT`. Sin `TTS_SIGNING_SECRET`, la app usa la voz del dispositivo.

Si ya ejecutaste la antigua `10_voice_cache.sql` (voces de Gemini), lo que creó
(el bucket `voice-cache` y `voice_usage`) ya no se usa; puedes dejarlo o borrarlo.

## Errores frecuentes

| Error | Causa / solución |
|---|---|
| `relation "public.profiles" does not exist` | Se ejecutó `05` antes que `01`–`04`. Ejecuta `setup.sql` completo. |
| `permission denied for table …` | Faltan permisos de la Data API → ejecuta `06_api_grants.sql` (incluido en `setup.sql`). |
| El correo de confirmación no llega | Desactiva *Confirm email* (paso 2). |
| `Invalid JWT` al usar el Coach | Desactiva *Verify JWT* en la función. |
