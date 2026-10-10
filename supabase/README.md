# Backend (Supabase)

Un solo proyecto de Supabase para toda la plataforma: **ECYR English** y el
**IELTS Simulator** integrado (`src/features/ielts`) comparten usuarios, perfiles,
clases, sesión y el mismo cliente.

## Puesta en marcha en un proyecto nuevo

### 1. Base de datos — una sola pegada

Supabase → **SQL Editor → New query** → pega **todo** [`setup.sql`](setup.sql) → **Run**.

Incluye las seis migraciones en orden y se puede re-ejecutar sin perder datos.
(Si prefieres hacerlo por partes, ejecuta `migrations/01` … `06` **en orden**:
`05` depende de la tabla `profiles` que crea `01`.)

| Migración | Qué hace |
|---|---|
| `01_schema.sql` | Perfiles, progreso IELTS, entregas, feedback, tareas, RLS y trigger de alta. *(IELTS)* |
| `02_roles_and_tasks.sql` | Límites de escritura estudiante/docente; `join_class`, `leave_class`, etc. *(IELTS)* |
| `03_history_visibility.sql` | Quién puede leer su propio historial. *(IELTS)* |
| `04_audio_library.sql` | Bucket privado de audios de Listening por clase. *(IELTS)* |
| `05_ecyr_platform.sql` | `learner_state` (progreso sincronizado) y `ai_usage` + `bump_ai_usage()` (límite diario del AI Coach). |
| `06_api_grants.sql` | Permisos explícitos de la Data API (proyectos nuevos no los dan por defecto). |

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
supabase link --project-ref <tu-ref>
supabase functions deploy gemini --no-verify-jwt   # IELTS Simulator
supabase functions deploy coach  --no-verify-jwt   # AI Coach
supabase secrets set GEMINI_API_KEY=AIza...         # compartida por ambas
# opcionales
supabase secrets set COACH_DAILY_LIMIT=40 COACH_REQUIRE_CLASS=off GEMINI_MODEL=gemini-3.5-flash-lite
```

Sin CLI: **Edge Functions → Deploy a new function → Via editor**, nombre exacto
`gemini` / `coach`, pega `functions/<nombre>/index.ts`, y desactiva **Verify JWT**
(las funciones validan la sesión ellas mismas). Luego **Edge Functions → Secrets**
→ `GEMINI_API_KEY`.

La clave de Gemini nunca llega al navegador.

## Errores frecuentes

| Error | Causa / solución |
|---|---|
| `relation "public.profiles" does not exist` | Se ejecutó `05` antes que `01`–`04`. Ejecuta `setup.sql` completo. |
| `permission denied for table …` | Faltan permisos de la Data API → ejecuta `06_api_grants.sql` (incluido en `setup.sql`). |
| El correo de confirmación no llega | Desactiva *Confirm email* (paso 2). |
| `Invalid JWT` al usar el Coach | Desactiva *Verify JWT* en la función. |
