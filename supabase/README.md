# Backend (Supabase)

Un solo proyecto de Supabase para toda la plataforma: **ECYR English** y el
**IELTS Simulator** (en `public/apps/ielts`) comparten usuarios, perfiles y clase.

## Migraciones — SQL Editor, en orden

| Archivo | Qué hace |
|---|---|
| `migrations/01_schema.sql` | Perfiles, progreso IELTS, entregas, feedback y tareas, con RLS y trigger de alta. *(del IELTS Simulator)* |
| `migrations/02_roles_and_tasks.sql` | Límites de escritura entre estudiante y docente; `join_class`, `leave_class`, etc. *(IELTS)* |
| `migrations/03_history_visibility.sql` | Quién puede leer su propio historial. *(IELTS)* |
| `migrations/04_audio_library.sql` | Bucket privado de audios de Listening por clase. *(IELTS)* |
| `migrations/05_ecyr_platform.sql` | **Nuevo:** `learner_state` (progreso de la plataforma, sincronizado) y `ai_usage` + `bump_ai_usage()` (límite diario del AI Coach). |

Todos son re-ejecutables (create-if-not-exists / drop-then-create).

## Edge Functions

| Función | Qué hace |
|---|---|
| `functions/gemini` | Proxy de Gemini del IELTS Simulator (corrección, generación de exámenes, voces TTS). |
| `functions/coach` | **Nuevo:** AI Coach de la plataforma: conversación, corrección, explicaciones y feedback de writing por nivel CEFR. |

```bash
supabase link --project-ref eecqfbxisquimaowhbmg
supabase functions deploy gemini --no-verify-jwt
supabase functions deploy coach  --no-verify-jwt
supabase secrets set GEMINI_API_KEY=AIza...        # compartida por ambas
# opcionales
supabase secrets set COACH_DAILY_LIMIT=40 COACH_REQUIRE_CLASS=off GEMINI_MODEL=gemini-3.5-flash-lite
```

La clave de Gemini **nunca** llega al navegador: el frontend (estático en
Vercel) envía la sesión del usuario y la función añade la clave del lado servidor.

## Recomendado para clases

Authentication → Providers → Email → desactivar **Confirm email** (el remitente
por defecto de Supabase solo entrega a correos del propio equipo). Ver el README
del IELTS Simulator para más detalle.
