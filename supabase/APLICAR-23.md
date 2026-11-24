# Aplicar la migración 23 (estadísticas de uso)

Requisito: ya tener aplicadas `01`–`21` (no hace falta la 22) y ser dueña/dueño (`platform_admins`).

1. Supabase, **SQL Editor, New query**.
2. Pega **todo** el contenido de `supabase/migrations/23_usage_analytics.sql` y pulsa **Run**.
   (Es idempotente: puedes repetirlo. `supabase/setup.sql` ya la incluye.)
3. Verifica, pegando esto en otra consulta:

```sql
-- Debe devolver 1 fila (tabla creada, RLS activa)
select relname, relrowsecurity from pg_class where relname = 'usage_events';
-- Debe devolver una sola política: INSERT para authenticated
select policyname, cmd, roles from pg_policies where tablename = 'usage_events';
-- Las 5 funciones existen
select proname from pg_proc where proname like 'usage\_%' order by 1;
```

4. Abre la app con tu sesión, navega unas pantallas, espera ~20 s (o cambia de pestaña) y entra a `/admin/stats`
   (Perfil, Admin, "Estadísticas de uso"). Si aún dice "Aplica supabase/migrations/23_usage_analytics.sql",
   espera un minuto a que PostgREST recargue el esquema o ejecuta `notify pgrst, 'reload schema';`.
5. Comprueba que un alumno no puede leer: con una sesión de alumno, `GET /rest/v1/usage_events` debe dar 401/403.

Notas
- La app deja de intentar enviar durante 1 hora si la tabla no existe: tras aplicar la migración, recarga.
- Solo se guardan ids de funcionalidad y acciones; nunca correos ni texto de alumnos.
- Retención opcional: `delete from public.usage_events where created_at < now() - interval '365 days';`
