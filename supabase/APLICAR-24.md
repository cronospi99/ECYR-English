# Aplicar la migración 24 (estadísticas por estudiante)

Requisito: tener aplicada la `23` (y `01`–`21`) y ser dueña/dueño (`platform_admins`).

1. Supabase, **SQL Editor, New query**.
2. Pega **todo** `supabase/migrations/24_usage_by_student.sql` y pulsa **Run**.
   (Idempotente; no toca datos. `supabase/setup.sql` ya la incluye.)
3. Verifica:

```sql
select proname from pg_proc
 where proname in ('usage_students','usage_student_detail','usage_student_daily','usage_student_timeline')
 order by 1;   -- 4 filas
```

4. Abre `/admin/stats`, pestaña **Por estudiante**. Si dice que falta la migración, espera un minuto o ejecuta
   `notify pgrst, 'reload schema';`.
5. Comprueba que un alumno no puede: con su sesión, `POST /rest/v1/rpc/usage_students` debe dar 42501 (403).

Qué registra la app para saber con qué profesor trabajó cada alumno (en `usage_events.meta`):
- `board`: id del muro en vivo (el profesor se resuelve con `live_boards.teacher_id`).
- `room` + `role` (`host`/`player`): código de sala de juegos en vivo (Class Wars, Impostor, Doodle, You Draw,
  Racers, Defenders). El profesor es quien abrió esa sala como anfitrión (mismo código, hasta 8 h antes).
- `assignment`: id de la tarea (profesor = `assignments.teacher_id`). `teacher`: uid directo cuando se conoce.
- Los eventos anteriores a este cambio no tienen contexto: aparecen sin profesor.
- El correo solo lo devuelve `usage_students` y solo a la cuenta dueña.
