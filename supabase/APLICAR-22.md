# Aplicar el blindaje de seguridad (migración 22)

Objetivo: los nombres y **correos** de todo el alumnado solo se ven desde la cuenta dueña (la única fila de
`platform_admins`) y con verificación en dos pasos. Cada alumno sigue viendo lo suyo; los docentes ven **nombre y
progreso** de sus alumnos, ya no el correo.

Orden obligatorio. Si te saltas el paso 1, después de la migración no podrás entrar al panel de administración.

## 1. Inscribir la verificación en dos pasos (antes de tocar la base)

1. Supabase → **Authentication → Sign In / Providers → Multi-Factor (MFA)**: comprueba que **TOTP** está activado (lo está por defecto).
2. Despliega esta versión de la app en Vercel (rama principal).
3. Entra en la app desplegada con la cuenta dueña → **Perfil → Códigos para docentes** (`/admin/teachers`).
   Verás «Protege la cuenta dueña»: escanea el QR con Google Authenticator, Authy o 1Password, escribe el código de 6
   dígitos y pulsa **Activar verificación**. Guarda también la clave manual en tu gestor de contraseñas.
4. Cierra sesión, vuelve a entrar y abre `/admin/teachers`: te pedirá el código. Si entra, el MFA funciona.

(Esto funciona antes y después de la migración: antes de ella el panel simplemente exige el código también.)

## 2. Comprobar que `platform_admins` tiene 1 sola fila

SQL Editor:

```sql
select user_id, created_at from public.platform_admins;
```

Debe salir **una** fila, la tuya. Si hay más, bórralas (la migración se detiene con un mensaje si sobran):

```sql
delete from public.platform_admins where user_id = '<uuid de la sobrante>';
```

## 3. Pegar la migración 22

SQL Editor → New query → pega **solo** `supabase/migrations/22_security_hardening.sql` → Run. Es idempotente (se puede
repetir). No repegues `setup.sql` en producción.

Qué cambia al ejecutarla:

- `is_platform_admin()` exige sesión `aal2`; `is_platform_owner()` (sin aal) solo sirve para que la app te reconozca y pida el código.
- `list_shared_students()` ya no devuelve correo. `profiles`: `authenticated` lee todo menos `email`; sin INSERT desde el cliente.
- `anon` pierde todo salvo `check_teacher_invite(text)` (el formulario de registro la usa sin sesión).
- `authenticated` conserva exactamente las funciones que ya podía ejecutar. No se hizo `grant execute on all functions`
  porque reabriría ayudantes internos que las migraciones 15–21 cerraron a propósito (`link_student_to_teacher`,
  `spend_teacher_invite`, `live_board_check`…).
- Nuevas tablas: `gemini_usage` (límite diario) y `admin_audit` (solo el dueño con MFA la lee).
- Atención: las migraciones futuras deben incluir su propio `grant execute … to authenticated` (las actuales ya lo hacen),
  porque las nuevas funciones ya no nacen ejecutables por `PUBLIC`.

## 4. Desplegar las funciones edge y los secretos

```
supabase functions deploy gemini  --no-verify-jwt
supabase functions deploy coach   --no-verify-jwt
supabase functions deploy podcast --no-verify-jwt
supabase secrets set GEMINI_DAILY_LIMIT=60
supabase secrets set ALLOWED_ORIGINS=https://ecyr-english.vercel.app,https://TU-DOMINIO-PROPIO
```

- `GEMINI_DAILY_LIMIT`: generaciones por usuario y día con la clave compartida (por defecto 60, máximo 2000).
- `ALLOWED_ORIGINS`: lista separada por comas; **reemplaza** la lista por defecto (`https://ecyr-english.vercel.app` y
  `localhost` 5173/4173). Si usas otro dominio (o previews de Vercel que necesiten IA), añádelo o la IA devolverá 403.
- `gemini` ahora mide los bytes reales del cuerpo (límite 30 MB) y cuenta cada generación con `bump_gemini_usage`.
- Si despliegas las funciones antes de la migración, `gemini` deja pasar (y lo registra en el log) hasta que exista `bump_gemini_usage`.

## 5. Ajustes del dashboard de Auth (manuales)

Supabase → **Authentication**:

- **Sign In / Providers → Email → Confirm email: ON**, con **SMTP propio** configurado (Settings → Auth → SMTP; el remitente por defecto solo entrega a 2 correos/hora al equipo). Esto revierte la recomendación antigua del README.
- **Attack Protection → CAPTCHA** (hCaptcha o Turnstile) activado. Para que el registro funcione con CAPTCHA, la app necesitará enviar el token (`captchaToken`); hoy no lo hace: actívalo cuando se añada el widget, o el registro fallará.
- **Attack Protection → Leaked password protection: ON**.
- **Sign In / Providers → Allow anonymous sign-ins: OFF**.
- **Policies → Minimum password length**: 10 o más (la app solo avisa de 6; sube el mínimo aquí).
- **URL Configuration**: Site URL y Redirect URLs solo con tu dominio de producción.

## 6. Prueba de humo

- **Alumno**: registro/entrada, Perfil muestra su correo (viene de la sesión), progreso se sincroniza, unirse a una clase con código, muro en vivo (su tarjeta sale con su nombre, no con correo), AI Coach responde. En la consola del navegador no debe haber errores 401/403 de `profiles`.
- **Docente**: entra a «Mi clase»: ve nombres y progreso, **sin correos**; asigna una tarea; «Estudiantes compartidos» lista nombre + docente; el IELTS (panel docente) lista alumnos sin correo.
- **Dueño**: `/admin/teachers` pide el código de 6 dígitos y después muestra docentes y alumnos **con** correo; crear un código de invitación funciona; sin pasar el código no se ve nada.
- Anónimo (ventana privada, sin sesión): el registro como docente valida el código (`check_teacher_invite`).

## 7. SQL de verificación

```sql
-- Privilegios de anon: debe salir solo check_teacher_invite(text) y ninguna tabla.
select 'tabla' as tipo, table_name::text as objeto, privilege_type::text as privilegio
  from information_schema.role_table_grants
 where grantee = 'anon' and table_schema = 'public'
union all
select 'funcion', p.oid::regprocedure::text, 'EXECUTE'
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute');

-- profiles: ninguna columna email para authenticated, sin INSERT.
select column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
 order by privilege_type, column_name;

-- Políticas de profiles (no debe existir profiles_insert_own) y de las tablas nuevas.
select tablename, policyname, cmd, roles from pg_policies
 where schemaname = 'public' and tablename in ('profiles', 'admin_audit', 'gemini_usage')
 order by tablename, policyname;

-- Un solo dueño y su índice único.
select count(*) as duenos from public.platform_admins;
select indexname from pg_indexes where indexname = 'platform_admins_one_owner';

-- Funciones internas que NO deben ser ejecutables por authenticated (debe devolver 'false' en todas).
select p.oid::regprocedure::text, has_function_privilege('authenticated', p.oid, 'execute') as authenticated_puede
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('link_student_to_teacher', 'spend_teacher_invite', 'live_board_check', 'bump_podcast_usage');
```

## Cómo revertir

Solo si algo crítico falla; cada bloque es independiente (SQL Editor):

```sql
-- MFA del dueño y único dueño
drop index if exists public.platform_admins_one_owner;
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.platform_admins where user_id = auth.uid()); $$;

-- Correos legibles otra vez y perfiles insertables (estado anterior a la 22)
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (id = auth.uid());

-- anon como antes
grant select, insert, update, delete on all tables in schema public to anon;  -- RLS sigue decidiendo las filas
-- (no reabras las funciones a PUBLIC/anon en bloque: reabriría ayudantes internos; concede solo la que necesites)
```

Para volver a `list_shared_students()` con correo y a los muros con el correo de respaldo, vuelve a ejecutar `21_shared_students.sql`
y `18_live_boards_v2.sql` (recrean esas funciones). La app nueva sigue funcionando con la base antigua (no pide `email`).
Las tablas `gemini_usage` y `admin_audit` pueden quedarse. Para volver a CORS abierto, redespliega las funciones con
`ALLOWED_ORIGINS` ampliado (no hay modo `*`).

Si te quedas sin acceso al panel por perder el autenticador: en el SQL Editor,
`delete from auth.mfa_factors where user_id = '<tu uuid>';` y vuelve a inscribir (paso 1), o aplica el bloque de revertir MFA de arriba.
