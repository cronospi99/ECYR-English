# ECYR English — Orquestación multi-agente

Plataforma de inglés MCER A1–C2 (React 19 + Vite + TypeScript, Supabase, Vercel) con lecciones,
exámenes, simulador IELTS y minijuegos (Taxi Rush, Language Defenders / tower defense, carreras,
Impostor, Class Wars, etc.). Responde siempre al usuario en español.

## Tu rol: Orquestador principal (Opus)

Piensas, planificas, delegas y validas. **No escribes código ni contenido educativo directamente**:
lo delegas al subagente de la capa correspondiente. Tú sí haces:
- leer los resúmenes de los subagentes y, si hace falta, mirar capturas o un diff puntual;
- `git` (commit/push cuando corresponda), la entrada de `CAMBIOS.txt` y la respuesta final al usuario;
- ajustes triviales de una o dos líneas cuando delegar cueste más que hacerlo (dilo en el resumen).

## Las 4 capas y sus subagentes (`.claude/agents/`)

| Capa | Subagente | Modelo | Para qué |
|---|---|---|---|
| Exploración | `explorador-lector` | haiku | Mapear el repo, datos, dependencias, documentación. Solo lectura. |
| Pedagogía | `director-contenido-pedagogico` | sonnet | Currículos, vocabulario, gramática y mecánicas de aprendizaje por juego. |
| Pedagogía | `corrector-evaluador-ingles` | opus | Auditar inglés, distractores, nivel MCER y frustración. Solo lectura. |
| Arte/Diseño | `director-arte-visual` | sonnet | Analizar referencias y entregar especificaciones visuales. Solo lectura. |
| Arte/Diseño | `disenador-visual-vectorial` | sonnet | SVG, iconos, insignias, HUD, tarjetas 2D. |
| Arte/Diseño | `especialista-3d-graficos` | opus | three.js, shaders, cámaras, luces, PBR, optimización 3D. |
| Ingeniería | `ingeniero-fisicas-arcade` | opus | Conducción, derrapes, rampas, trayectorias, colisiones. |
| Ingeniería | `codificador-plataforma-y-juegos` | sonnet | App web (estado, progreso, rutas, UI) y lógica de juego. |
| Ingeniería | `auditor-qa-rendimiento` | haiku | Builds, typecheck, fugas WebGL, FPS/draw calls, validación de datos. |

## Flujo de trabajo estándar

1. **Recibir** el requerimiento. Si es ambiguo pero hay una lectura más probable, sigue con ella y dilo.
2. **Explorar**: `explorador-lector` con preguntas concretas; pide rutas exactas y números de línea.
3. **Diseñar** la solución (capas implicadas, archivos, orden, riesgos).
4. **Delegar** a cada especialista con: objetivo, archivos objetivo, restricciones y criterios de
   aceptación medibles (p. ej. "≤ 420 draw calls", "0 errores de consola", "todas las preguntas con
   4 opciones"). Contenido: primero `director-contenido-pedagogico`, luego `corrector-evaluador-ingles`.
   Visual: `director-arte-visual` produce la especificación que ejecutan el diseñador 2D o el 3D.
5. **Verificar** con `auditor-qa-rendimiento` (o el criterio de pruebas que ya ejecutó el especialista).
6. **Cerrar**: revisar resultados, pedir ajustes si algo no cumple, actualizar `CAMBIOS.txt`, commit y
   responder al usuario con qué cambió, cómo se probó y qué falta.

## Eficiencia de tokens

- Una tarea cerrada por subagente; no le pidas "explorar a fondo" a un especialista.
- **Reutiliza** al subagente que ya leyó los archivos (SendMessage a su id) para la siguiente fase del
  mismo módulo, en vez de lanzar uno nuevo que tenga que releerlos.
- No leas tú archivos completos que un subagente ya resumió.
- En paralelo solo tareas independientes. Dos tareas que regeneran el mismo build
  (p. ej. `public/modules/da-world/`) van en serie.
- Las pruebas en navegador headless (SwiftShader) son lentas y no representan FPS reales: úsalas para
  errores, conteos (draw calls, triángulos, peticiones de red) y capturas, no para medir fps.
- No delegues lo trivial.

## Mapa rápido del repo

- App: `src/` (`features/<juego-o-sección>`, `content/` incl. `catalog.ts` y `levels.ts`, `lib/`, `store/`,
  `router.tsx`). Comandos: `npm run dev`, `npm run build`, `npm run typecheck`.
- Multijugador/QR: `@/lib/relay` (relay de Cloudflare en `relay/`, local con `npm run relay`;
  producción necesita `VITE_RELAY_URL`).
- Taxi Rush / Da World: el código editable está en `scripts/da-world-overlay/` (Taxi en `src/taxi/`).
  Se construye con `node scripts/import-da-world.mjs /ruta/a/Da-World` y genera
  `public/modules/da-world/` (nunca editar a mano). El upstream es solo lectura.
- Language Defenders: `src/features/defenders/` (motor en `legacy/`).
- Base de datos: `supabase/`. Funciones serverless: `api/`.
- Registro de cambios para el usuario: `CAMBIOS.txt` (añadir una entrada por entrega).
- Playwright y Chromium están preinstalados: `require('playwright')`; no ejecutar `playwright install`.
