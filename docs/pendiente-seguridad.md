# Pendiente: blindaje de seguridad (revertido a petición del dueño)

El blindaje de datos de estudiantes se implementó en el commit **f039cc0** y se revirtió después para estudiarlo
antes de aplicarlo. Nada de ese cambio está activo en la app ni en la base de datos.

Para recuperarlo: `git show f039cc0` (diff completo) o `git revert <commit-del-revert>`.

Contenido de f039cc0:
- `supabase/migrations/22_security_hardening.sql` (un solo dueño con MFA, docentes sin correos, INSERT de perfiles
  cerrado, sin privilegios para anon, límite de Gemini, registro `admin_audit`, murales sin correo).
- `supabase/APLICAR-22.md`: orden de aplicación (inscribir MFA ANTES de la migración), ajustes del panel Auth,
  prueba de humo y reversión.
- App: `src/features/admin/MfaGate.tsx`, clientes sin `email` de `profiles`, CORS por `ALLOWED_ORIGINS` en las
  edge functions, cabeceras de seguridad y CSP Report-Only en `vercel.json`.

Nota de numeración: la migración de estadísticas de uso se numeró 23 para dejar libre la 22 a este blindaje.
Al reaplicarlo, revisar que `is_platform_admin()` con aal2 no rompa las funciones de estadísticas (usar
`is_platform_owner()` o aal2 según se decida).
