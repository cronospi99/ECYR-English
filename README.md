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

- **Inicio** — nivel actual, montaña con escalador animado, racha, XP diaria, anillos por
  destreza, plan del día, juegos, IELTS y AI Coach.
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
- **Juegos** — Star Medic Jeopardy, Phrasal Verb Roulette, Verb Quest, Two Truths & a Lie
  (Colombia), Too Good To Be True, Would You Rather Arena, Time Machine, Time & Family,
  Earth Modals Explorer, Modal Verbs Zone, más los 5 libros interactivos y el curso de cómic.
- **IELTS** — el [IELTS Simulator](https://cronospi99.github.io/IELTS-Simulator-app/)
  completo integrado (mock tests, práctica libre, modo docente, Language desk, gráficos 3D…),
  con sus bandas reflejadas en el dashboard y la misma cuenta de Supabase.
- **AI Coach** — conversación, corrección y explicaciones adaptadas al nivel CEFR.
- **Progreso** — montaña, XP y rangos, racha, niveles, destrezas, metas e historial.
- **Perfil** — cuenta (estudiante/docente, código de clase), tema, pistas en español,
  acento y velocidad de voz, exportar/importar progreso.

## Estructura

```
src/
  components/      ui/ (iOS kit), layout/, mountain/, charts/, learning/, brand/
  content/         types.ts, levels.ts, catalog.ts, generated/*.json (contenido extraído)
  features/        home, learn, foundations, practice, games, ielts, coach, progress, profile
  lib/             supabase, sync, ai, speech, ielts, date
  store/           progress (XP/racha/unidades), auth, settings
public/
  modules/         juegos y libros originales (HTML interactivos, servidos tal cual)
  apps/ielts/      IELTS Simulator (repo cronospi99/IELTS-Simulator-app)
  vendor/          React, Babel, three, d3, Chart.js… alojados localmente (sin CDNs)
  covers/          portadas de los juegos
scripts/extract-content.mjs   extrae el contenido de los módulos a JSON tipado
supabase/          setup.sql, migrations/ (01–06) y functions/ (gemini, coach)
```

El contenido de los libros vive dentro de los módulos originales (`public/modules`).
`npm run content:extract` lo evalúa en un sandbox `vm` y genera `src/content/generated/*.json`,
que la app importa por nivel (cada nivel es un chunk independiente y cacheable).

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
