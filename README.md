# ECYR English

Plataforma web para aprender inglés de **A1 a C1** (MCER/CEFR): lecciones por nivel,
lecturas, audios, ejercicios, juegos, el **IELTS Simulator** completo y un **AI Coach**.
Diseño inspirado en Apple iOS (materiales translúcidos, listas agrupadas, tipografía SF,
modo claro/oscuro) y una montaña con un escalador que sube según tu progreso.

## Stack

| Capa | Tecnología | Función |
|---|---|---|
| Lenguaje | **TypeScript** (estricto) | Lógica de progreso, puntuación y contenido tipado |
| UI | **React 19** + React Router 7 | Pantallas, navegación y lecciones |
| Build | **Vite 8** | Desarrollo y compilación (code-splitting por nivel) |
| Estilos | **Tailwind CSS 4** | Sistema de diseño iOS con tokens claro/oscuro |
| Animación | Motion | Transiciones con resortes, escalador, anillos |
| Estado | Zustand (persistente) | Progreso local-first (XP, racha, unidades) |
| Backend | **Supabase** | Cuentas, perfiles/clases, progreso sincronizado |
| IA | **Supabase Edge Functions** | `coach` y `gemini`: llaman a Gemini sin exponer la clave |
| Hosting | **Vercel** | Frontend estático + cabeceras y reescrituras SPA |

## Qué incluye

- **Inicio** — “Go For It!”: la montaña a todo el ancho con el escalador y tu nivel, una franja
  compacta de racha/XP/rango/unidades, tu plan semanal, accesos a las destrezas y una fila “Explora”.
- **Mi plan (motor de planes semanales)** — eliges qué quieres lograr (avanzar, repasar unidades
  concretas, preparar el IELTS o un plan equilibrado), nivel, destrezas a reforzar, días y minutos.
  `src/lib/planner.ts` genera 7 días de tareas reales (unidades, gramática, lecturas, dictados,
  speaking, writing, Verb Lab, IELTS, juegos), las marca solas a partir del registro de actividad
  (cada `award()` lleva un `ref`), mide avance por día y destreza, calcula tu perfil de fortalezas
  (acierto + práctica de 30 días), da recomendaciones y adapta la semana siguiente a tus resultados.
- **Aprender** — 5 niveles (A1 Interchange Intro · A2 Interchange 1 · B1 Interchange 2 ·
  B2 Passages 1 · C1 Passages 2) con **72 unidades nativas**: resumen y objetivos,
  vocabulario (lista y flashcards con audio), gramática (tablas, errores comunes, diálogos
  narrados, pronunciación, explicación profunda), práctica con corrección inmediata y
  producción (speaking, writing con feedback de IA, dinámicas de clase y tarea).
  - **English Foundations (A1)** — 37 temas del curso de cómic con reglas en español,
    tarjetas, phonics, canción ABC, trazado de letras, emparejar, ordenar, completar,
    opción múltiple, lecturas y diálogos.
- **Práctica** — Reading (historias A1 + 32 guías de viaje con can/should/must),
  Listening (123 diálogos A1–C1 con dictado + audios reales de los meses), Speaking
  (3.600+ preguntas por nivel y tema con reconocimiento de voz), Writing (tareas por unidad
  con criterios y feedback del coach) y 487 Phrasal Verbs con quiz.
- **Gramática interactiva** (`/learn/grammar`) — Time Machine (fechas, meses, ordinales, años y
  pasado simple), Time & Family (la hora con reloj interactivo, familia y genitivo ’s) y Modal Verbs
  (modales core, marginales y semi-modales, reglas, trampas y fase bonus), reconstruidos en React
  a partir de los módulos originales con sus mecánicas y con los errores corregidos, más Verb Lab.
- **Juegos** — Star Medic Jeopardy, Phrasal Verb Roulette, Two Truths & a Lie
  (Colombia), Too Good To Be True, Would You Rather Arena y Earth Modals Explorer, más los 5 libros
  interactivos y el curso de cómic.
- **IELTS** — el [IELTS Simulator](https://github.com/cronospi99/IELTS-Simulator-app) absorbido
  dentro de la app (sin iframe): mock tests, práctica libre, modo docente, Language desk, gráficos
  3D, corrección con IA… con rutas propias (`/ielts/writing`, `/ielts/reading`…), el diseño iOS de la
  plataforma, la misma sesión de Supabase y sus bandas en el dashboard. El repositorio original
  sigue aparte como versión independiente.
- **Verb Lab** — las utilidades de Verb Quest reconstruidas en React: 750 verbos con sus 3 formas,
  pronunciación de -ed con ejercicio, quiz cronometrado, 32 familias de phrasal verbs y los 10
  patrones verbales con quizzes. Las lecciones insertan automáticamente la herramienta que
  corresponde a su gramática (pasado → -ed y verbos irregulares; gerundios → patrones; etc.).
- **Cortina de entrada** — la animación de apertura del simulador, ahora para toda la app, con el
  logotipo ECYR English y el lema “Go For It!”.
- **AI Coach** — conversación, corrección y explicaciones adaptadas al nivel CEFR.
- **Progreso** — montaña, XP y rangos, racha, niveles, destrezas, metas e historial.
- **Avatar** — foto de perfil con retratos ilustrados o un avatar vectorial personalizable (piel,
  peinado, color de pelo, gafas, ropa, fondo, marco…), visible en la barra lateral y el perfil.
- **Perfil** — cuenta (estudiante/docente, código de clase), tema, pistas en español,
  acento y velocidad de voz, exportar/importar progreso.

## Estructura

```
src/
  components/      ui/ (iOS kit), layout/, mountain/, charts/, learning/, brand/
  content/         types.ts, levels.ts, catalog.ts, generated/*.json (contenido extraído)
  features/        home, plan, learn, grammar, foundations, practice, games, ielts, coach, progress, profile, avatar
  lib/             planner (motor de planes), supabase, sync, ai, speech, ielts, date
  store/           progress (XP/racha/unidades), plan, avatar, auth, settings
public/
  modules/         juegos y libros originales (HTML interactivos, servidos tal cual)
  vendor/          React, Babel, three, d3, Chart.js… alojados localmente (sin CDNs)
  covers/          portadas de los juegos
src/features/ielts/  IELTS Simulator: engine/ (motor importado), styles/ (base aislada + skin iOS)
src/features/verblab/ Verb Lab (componentes reutilizables + mapeo a unidades)
content-src/       fuentes que no se publican (Verb Quest original)
scripts/extract-content.mjs   extrae el contenido de los módulos a JSON tipado
scripts/import-ielts.mjs      importa/actualiza el simulador desde su repositorio original
supabase/          setup.sql, migrations/ (01–06) y functions/ (gemini, coach)
```

El contenido de los libros vive dentro de los módulos originales (`public/modules`).
`npm run content:extract` lo evalúa en un sandbox `vm` y genera `src/content/generated/*.json`,
que la app importa por nivel (cada nivel es un chunk independiente y cacheable).

## IELTS Simulator: cómo se integra

`scripts/import-ielts.mjs` convierte el `index.html` del repositorio original en tres archivos
propios: el motor (`engine/ielts-engine.js`, con parches verificados para arrancar bajo demanda,
reportar cambios de módulo al router y leer los colores del tema), sus hojas modales y su CSS de
maquetación aislado bajo `.ielts-app` con cada color traducido a los tokens iOS. La piel visual
está en `styles/ielts-skin.css`. Para traer mejoras del original:

```bash
git clone https://github.com/cronospi99/IELTS-Simulator-app /tmp/ielts
node scripts/import-ielts.mjs /tmp/ielts/index.html
```

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run build        # dist/
```

## Despliegue en Vercel

1. **Add New → Project** e importa este repositorio. Vercel detecta Vite
   (`vercel.json` ya define build, salida, reescrituras SPA y cabeceras).
2. *(Opcional)* Variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   Sin ellas se usa el proyecto público compartido con el IELTS Simulator; con `off`
   la app funciona sin conexión (progreso solo en el navegador).
3. Deploy. Cada push a `main` despliega producción y cada PR una preview.

## Backend (Supabase)

Ver [`supabase/README.md`](supabase/README.md): pegar `supabase/setup.sql` en el SQL Editor (migraciones `01`–`06`), configurar las variables `VITE_SUPABASE_*`,
desplegar las funciones `gemini` y `coach`, y guardar `GEMINI_API_KEY` como secreto.

## Diseño

- Tokens semánticos iOS (`--bg`, `--card`, `--label`, `--separator`, colores de sistema)
  redefinidos para modo oscuro en `src/styles/index.css`.
- Colores de destreza validados para daltonismo (claro y oscuro); los anillos siempre
  llevan etiqueta y valor, así la identidad nunca depende solo del color.
- `prefers-reduced-motion` desactiva animaciones (incluida la caminata del escalador).

## Hoja de ruta

- Generación de lecturas y listening B1–C1 con IA (voces TTS del simulador).
- Panel docente de la plataforma (progreso de la clase desde `learner_state`).
- Logros/insignias, ligas semanales y notificaciones de racha (PWA).
- Banco de recursos descargables para docentes (PPTX de clase en Supabase Storage).
- Tests E2E (Playwright) en CI.
