# Hilo de la clase v2 — especificación

Estado actual (v1): `src/lib/lessonThread.ts` + `src/features/teacher/LessonThreadPage.tsx`. Un texto central, un capítulo por punto gramatical, opener/closer, sin persistencia. Límites v1 que v2 resuelve: el hilo es "un texto que contiene todo" (forzado con temas sin relación), no hay PPP, no se edita ni se guarda, y la IA devuelve todo en una sola llamada.

**Idea de v2:** el hilo deja de ser una historia y pasa a ser un **contexto puente** (una situación concreta, p. ej. "una agencia de viajes escolar") sobre el que se monta un **plan PPP** editable. Cada recurso (historia, noticia, diálogo...) es una pieza independiente y regenerable que vive en ese contexto.

Nuevos archivos propuestos (todos bajo `src/lib/thread/` salvo la UI): `types.ts`, `bridge.ts`, `bridgeData.ts`, `plan.ts`, `resources.ts`, `prompts.ts`, `validate.ts`, `store.ts`; UI en `src/features/teacher/thread/`. `lessonThread.ts` queda como fachada de compatibilidad (§6).

---

## 1. Flujo del docente (mínimo de clics)

Una sola pantalla con 3 zonas: **Entrada** (izq. o arriba), **Plan** (centro), **Panel de recurso** (der., aparece al elegir una etapa).

1. **Nivel** (chips A1–C2; recordado del último uso). 1 clic.
2. **Anclas**: un único campo con autocompletado. El profesor puede
   - escribir una frase o tema libre ("Mis alumnos van a un viaje de fin de año") → ancla `free`;
   - escribir o buscar un punto/palabra y elegir de la lista (busca en `grammar[].name` y `vocab[].term` de **todas** las unidades del nivel) → ancla `grammar` / `vocab`;
   - abrir "Elegir por unidad" (el selector actual de unidades/puntos, reutilizado) para marcar varios.
   Cada ancla aparece como chip arrastrable con "×". Mínimo 1, máximo 5 (6 en C1/C2 solo si la duración ≥ 90 min).
3. **Duración** (30 / 45 / 60 / 90 / personalizada) y **Perfil del grupo** (reutiliza `Mix` de `engagement.ts`; por defecto el último guardado). Ajuste fino colapsado: estilo preferido de recurso central (reutiliza `STYLES`), "contexto sugerido por mí" (texto libre).
4. Botón **"Proponer plan"** → muestra 3 contextos puente candidatos (tarjetas con título, por qué encaja cada ancla, orden sugerido). 1 clic para elegir; si el docente no quiere decidir, "Plan con el mejor" salta este paso. Total mínimo: nivel + 1 ancla + "Plan con el mejor" = **3 clics** (más escribir el tema).
5. Se genera el **plan PPP**: esqueleto instantáneo (determinista, <100 ms) y, si hay IA activada, cada recurso se rellena por separado con indicadores de carga por tarjeta (no bloquea la pantalla ni el resto).
6. Edición, guardado, modo presentación, copiar/imprimir (§5).

Interruptor **"Usar IA"** visible siempre (por defecto activo si la edge function responde; si falla, se degrada solo y avisa por tarjeta, nunca todo el plan).

---

## 2. Lógica de conexión ("puente")

### 2.1 Principio
Un contexto puente es una **situación social reconocible** donde cada ancla tiene una *razón comunicativa real* para aparecer. No se conectan los temas entre sí; se conectan **a través de la situación**. Regla: nunca se explica la relación; se crea una escena donde cada ancla resuelve una necesidad distinta.

### 2.2 Perfil de cada ancla (`AnchorProfile`)
Para cada ancla se calcula `{ functions: Fn[], domains: Dom[], timeFocus: 'past'|'present'|'future'|'any', weight: number }`.

- `Fn` (función comunicativa): `narrate`, `describe`, `compare`, `advise`, `oblige`, `permit`, `plan`, `predict`, `hypothesize`, `report`, `request`, `opinion`, `argue`, `instruct`, `experience`, `routine`, `evaluate`, `persuade`.
- `Dom` (dominio): `travel`, `school`, `work`, `food`, `health`, `home`, `tech`, `shopping`, `sport`, `media`, `environment`, `city`, `family`, `culture`, `money`, `law`.
- Fuente 1 (prioritaria): tabla `GRAMMAR_PROFILES` en `bridgeData.ts`, clave = regex sobre `GrammarPoint.name` en minúsculas. Fuente 2 (para vocabulario y ancla libre): `KEYWORD_DOMAINS` (palabras → dominios), aplicado sobre `term`, `unit.theme`, `unit.title` y el texto libre. Fuente 3 (desconocido): `functions: ['describe']`, dominio de la unidad de origen, y se marca `confidence: 'low'` (la UI avisa).

Tabla inicial (ampliar al implementar; cubrir los puntos reales de `levels.ts` con un script de auditoría, §7):

```ts
export const GRAMMAR_PROFILES: [RegExp, { fn: Fn[]; time: Time }][] = [
  [/past simple|simple past/,            { fn: ['narrate','report'], time: 'past' }],
  [/past continuous/,                    { fn: ['narrate','describe'], time: 'past' }],
  [/present perfect/,                    { fn: ['experience','report','evaluate'], time: 'past' }],
  [/comparative|superlative|as .* as/,   { fn: ['compare','evaluate','opinion'], time: 'any' }],
  [/modal.*(obligation|must|have to)|must|have to/, { fn: ['oblige','instruct','advise'], time: 'present' }],
  [/should|ought|advice/,                { fn: ['advise','opinion'], time: 'present' }],
  [/can|could|may|permission|ability/,   { fn: ['permit','request'], time: 'present' }],
  [/will|going to|future/,               { fn: ['plan','predict'], time: 'future' }],
  [/first conditional|zero conditional/, { fn: ['predict','advise','instruct'], time: 'future' }],
  [/second conditional|third conditional|mixed conditional|wish/, { fn: ['hypothesize','evaluate'], time: 'any' }],
  [/passive/,                            { fn: ['report','describe','instruct'], time: 'any' }],
  [/reported speech|reporting/,          { fn: ['report','narrate'], time: 'past' }],
  [/relative clause|who|which|that/,     { fn: ['describe','compare'], time: 'any' }],
  [/inversion|cleft|emphasis/,           { fn: ['persuade','argue','evaluate'], time: 'any' }],
  [/collocation|phrasal|idiom/,          { fn: ['describe','opinion'], time: 'any' }],
  [/present simple|routine|adverbs of frequency/, { fn: ['routine','describe'], time: 'present' }],
  [/present continuous/,                 { fn: ['describe','plan'], time: 'present' }],
];
```

### 2.3 Catálogo de contextos puente (`BRIDGES`, por nivel)
Cada contexto: `{ id, levels, title, setting, doms: Dom[], fns: Fn[] (las que "pide" naturalmente), roles: string[], conflict (1 línea), resourceHints }`. Mínimo 12 por nivel A1–B2 y 10 por C1–C2 (≈ 70). En A1–A2: situaciones cotidianas y concretas (un viaje de curso, un mercadillo del cole, un club, un restaurante, una mudanza, un cumpleaños sorpresa). B1–B2: proyectos y problemas (un festival, una app nueva, un intercambio, una campaña del barrio, un negocio pequeño). C1–C2: debates y contextos profesionales o académicos (un panel de expertos, una auditoría, una conferencia, un informe, un caso judicial ficticio). Sin referencias culturales opacas en A1–B1.

### 2.4 Algoritmo determinista (`chooseBridges(anchors, level) → Bridge[3]`)
1. Calcular `AnchorProfile` de cada ancla (2.2). El ancla `free` aporta dominios por palabras clave y se trata como **ancla de contexto** (tiene prioridad: si coincide con algún contexto por palabras, ese contexto recibe +5).
2. Para cada contexto del nivel: `score = Σ_anclas cover(ancla, ctx) + bonusFree`, con `cover = 1` si `ctx.fns ∩ ancla.fns ≠ ∅` (+0.5 si además `doms` coinciden; +0.5 si `timeFocus` encaja con el conflicto del contexto), `0` si no. **Descartar** contextos que no cubran todas las anclas (cover > 0 para todas); si ninguno, relajar: permitir 1 ancla cubierta solo por dominio.
3. Desempate por variedad: penalizar −1 los contextos usados en los últimos 5 hilos guardados (`store`); luego `seed` para elegir entre empatados. Devolver los 3 mejores con `rationale[anchorId]` (texto es: "past simple → cuentan qué pasó en el viaje").
4. **Orden de etapas (de lo conocido a lo nuevo):** puntaje `novelty` por ancla = (menor n° de unidad = más conocido) + penalización por `weight` (puntos con "deep"/chart grande pesan más) ; orden ascendente de novelty; si empatan, `routine/describe` antes de `narrate`, y `narrate` antes de `hypothesize/argue`. El docente puede reordenar (§5); las transiciones se regeneran solo para las etapas movidas.
5. **Transiciones** (`transitionFrom(prev, next, bridge)`): plantillas en `bridgeData.ts` por par de funciones (`narrate→compare`, `experience→oblige`, `oblige→hypothesize`, ...) con huecos `{setting}`, `{role}`, `{prevTask}`, `{nextNeed}`; cada plantilla **debe** contener `{setting}` o `{role}` (se valida §7). Ejemplo A2: *"We told the story of the trip. Now, back at the travel agency, our clients want to choose between two trips: how are they different?"*. Fallback genérico: *"Now, in {setting}, {role} needs to {nextNeed}."*

### 2.5 Versión con IA
Dos llamadas ligeras en vez de una gigante:
1. `bridge-propose` (prompt §4.3) recibe nivel, anclas con su perfil determinista y 5 contextos del catálogo como inspiración; devuelve 3 contextos `Bridge` (JSON), cada uno con `rationale` por ancla y `order`. Debe poder inventar un contexto nuevo si los del catálogo encajan mal, pero cumpliendo la regla "cada ancla con razón comunicativa real".
2. Un `resource` por llamada (§4), todos con el `bridge` y `characters` fijados (coherencia). Las transiciones las genera `bridge-propose` (1 por etapa) en la misma llamada 1.

Si falla la llamada 1 → versión determinista. Si falla un recurso → plantilla local de ese recurso (marcada "borrador local") o vacío con botón "Generar".

### 2.6 Ejemplos resueltos
| Nivel | Anclas "sin relación" | Contexto puente | Cómo entra cada ancla | Orden |
|---|---|---|---|---|
| A2 | past simple + comparatives | **School trip planning** (Maya's class, a trip to the coast) | Past simple: "Last year we went to the mountains; it rained." Comparatives: "The coast is warmer and cheaper than the mountains." | past simple → comparatives |
| B1 | present perfect + modals of obligation | **First week at a volunteer camp** | Present perfect: "I've already met the cook; I haven't seen the boss." Obligation: "You must wear a helmet; you don't have to cook." | present perfect (qué llevo hecho) → obligation (qué debo hacer) |
| B2 | passive + conditionals | **A museum's reopening after a robbery (fictional)** | Passive: "The painting was stolen in 2019 and has been restored." Conditionals: "If security were better, it wouldn't have happened." | passive → conditionals (2.º/3.º) |
| C1 | inversion + environment collocations | **A city council hearing on a river clean-up** | Inversion: "Never had the river been so polluted." Collocations: "tackle climate change, curb emissions, a growing body of evidence". | collocations → inversion (registro formal para el discurso) |
| A1 | there is/are + verb *like* | **Our dream classroom/room** | "There is a big window." "I like blue walls." | there is → like |
| C2 | mixed conditionals + hedging | **An ethics panel on AI in schools (fictional)** | "Had we regulated sooner, we would be facing fewer problems today." / "It would appear that..." | hedging → mixed conditionals |

Transición ejemplo (B1, de present perfect a obligation): *"So you've done some things at the camp already. But before the volunteers arrive, what must they do, and what do they not have to do?"*

---

## 3. Estructura PPP del plan

Plan = `warmup` + una **Etapa de ancla** por cada ancla (cada una con P-P-P) + `closing` + `homework`. Tiempos por defecto (porcentaje de la duración total `T`): warm-up 8 %, cierre 7 %, resto repartido por `weight` entre anclas; dentro de cada ancla: **Practice = minutos del libro (por defecto 10, mínimo 5 si el tiempo aprieta)** y el resto se reparte a partes iguales entre **Presentation y Production**. Mínimos: Presentation 4 min, Production 5 min; si no caben, el plan avisa "duración insuficiente para N anclas: sugerir quitar la de menor prioridad". Transición entre anclas: 1 min (incluida en la etapa que llega).

Cada etapa de ancla contiene:
- **Presentation** (`stage.kind: 'presentation'`): 1 recurso de contexto (por defecto `story` en A1–B1, `news` o `dialogue` en B2+, o el estilo preferido) con el lenguaje meta resaltado; 3–5 **CCQ** con respuesta (concept-checking: significado/tiempo/forma, nunca "¿entienden?"); recuadro **Form/Use** tomado de `GrammarPoint.form`, `rule`, `watch` (datos existentes, sin IA); **enlace al diagrama**: clave `"<LEVEL>-<unit>-<grammarIdx>"` en `generated/diagrams-<level>.json` (ya existe: array de diagramas con `kind`, `title`, `note_es`); si no existe, se oculta el botón.
- **Practice (cambio del profesor: práctica en el libro físico)**: NO se genera contenido, ni local ni con IA. La etapa es una tarjeta editable **"Práctica del libro"** con campos libres (`stage.book = {book, page, exercises}`), minutos (por defecto 10) y nota (`stage.notes`) que el docente rellena; sin ejercicios ni respuestas. Los recursos `exercise` (gap-fill, matching, transformación, ordenar, drills) siguen existiendo en el menú "Añadir recurso", pero **nunca** se incluyen por defecto. Las transiciones del puente enlazan Presentation → (libro) → Production. En modo presentación la tarjeta se proyecta grande: "Book · p. __ · ex. __".
- **Production**: tarea libre con **criterios de éxito** (3 criterios observables, p. ej. "Usa past simple ≥ 3 veces; menciona el viaje; el compañero entiende"), formato (role-play, entrevista, mini-redacción, debate), agrupación y **rol del docente** (monitorizar / pistas / corrección diferida en pizarra: anotar 3 errores y revisarlos al final).
- **Transición** de entrada: una frase al docente que mencione el contexto (§2.4) y 1 línea al alumno en inglés.

Elementos globales:
- **Warm-up** (hook + opener v1 + 1 recurso de activación en el contexto: pregunta de debate o `energizer` corto) 5–8 min.
- **Energizer** a mitad de clase (reutiliza `energizerForMix`) cuando T ≥ 60 y hay ≥ 3 anclas.
- **Cierre**: reutiliza `CLOSERS` + 3-2-1 exit ticket enlazado al contexto; mini reto `TeamChallenge`.
- **Tarea**: 1 tarea de Production escrita (60–120 palabras según nivel) más un enlace opcional a `homework` de la unidad si existe.
- **Agrupación** por etapa: `whole | pairs | groups | solo`, con alternancia obligatoria (no más de 2 etapas seguidas con la misma).

---

## 4. Generador de recursos

### 4.1 Menú y campos
Cada `Resource` tiene `{id, kind, title, body, items?, targets, level, source, locked, edited, meta}` (§6). Longitudes y número de ítems por nivel (palabras del texto principal):

| kind | Campos (`content`) | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|---|
| `examples` | `sentences[]` graduadas (simple→compleja) | 5 × 5–8 pal. | 6 × 6–10 | 6 × 8–14 | 6 × 10–18 | 6 × 12–22 | 6 × 14–26 |
| `story` | `text` (párrafos), `characters` | 80–110 | 110–160 | 160–220 | 220–280 | 260–340 | 300–380 |
| `news` | `headline`, `lede`, `body`, `quote`, `fictionalNote` | 70–100 | 100–150 | 150–210 | 200–270 | 250–330 | 290–370 |
| `dialogue` | `lines[{sp,line}]` | 8 | 10 | 12 | 14 | 16 | 18 |
| `message` | `kind: email/chat/post`, `subject`, `text` | 40–60 | 60–90 | 90–140 | 130–190 | 170–240 | 200–280 |
| `interview` | `intro`, `qa[{q,a}]` | 4 pares | 5 | 5 | 6 | 6 | 6 |
| `announcement` | `title`, `text` | 40–60 | 50–80 | 80–120 | 110–160 | 150–210 | 170–230 |
| `comprehension` | `questions[{q,answer,type}]` (literal/inferencia/opinión) | 5 | 5 | 6 | 6 | 6 | 6 |
| `ccq` | `items[{point,q,answer}]` | 3 | 3 | 4 | 4 | 5 | 5 |
| `exercise` | `type: gapfill/matching/transform/order`, `items[{prompt,answer,distractors?}]` | 6 | 6–8 | 8 | 8 | 8 | 8 |
| `game` | `name, mode, minutes, materials[], steps[], targetLanguage` | 1 por pedido, `minutes` ≤ 8 |
| `roleplay` | `cards[{role,situation,goal,usefulLanguage[]}]` | 2 | 2–3 | 3 | 3–4 | 3–4 | 4 |
| `debate` | `questions[]` (+ `stance` pro/contra) | 4 simples | 4 | 5 | 5 | 6 | 6 |
| `board` | `sections[{title,lines[]}]` (plan de pizarra, mínimo 3 secciones) | = | = | = | = | = | = |

El `source` indica `'local' | 'ia' | 'user'`; `edited` pasa a `true` en la primera edición manual.

### 4.2 Generador local (sin IA)
`resources.ts` exporta `localResource(kind, ctx)` que ensambla desde datos: `examples` ← `GrammarPoint.examples` + `unit.vocab[].examples`; `ccq` ← plantillas por `fn` (p. ej. past: "Is it finished or still happening?"); `exercise` ← `GrammarPoint.drill.items` y `fix`; `dialogue` ← `GrammarPoint.dialogue`; `story/news/message` ← plantillas con huecos por contexto puente (`bridge.setting`, `roles`) + los ejemplos del punto; `game/roleplay/debate/board` ← bancos pequeños indexados por `fn` y nivel (≥ 4 por kind). Un recurso local **siempre** marca `source:'local'` y, en `story/news`, advertencia "borrador".

### 4.3 Plantilla de prompt (común a todo recurso)
```
You are an EFL materials writer for Spanish-speaking students at CEFR {LEVEL} ONLY.
CONTEXT (fixed, do not change): setting "{bridge.setting}"; characters {names/roles}; conflict "{bridge.conflict}".
TARGET LANGUAGE (must appear naturally; each at least {minHits} times): {anchors: name + form + 2 model sentences}.
STAGE: {Presentation|Practice|Production} for "{anchor}". Group profile: {describeMix}. Teacher's own words: "{free text}".
RESOURCE: {kind} — {spec of fields and size from §4.1 for LEVEL}.
LEVEL RULES: use only vocabulary and grammar up to {LEVEL}; allowed exceptions: the target language and these words: {glossed words}.
Sentence length ≤ {maxSentence} words. No idioms or cultural references that need explanation (A1–B1). Natural, current English; no textbook-sounding sentences.
SAFETY: fictional people only; nothing offensive, political or unsuitable for school students. {NEWS ONLY: invent everything; no real people, places in real events, companies, or statistics; set "fictionalNote":"Fictional story written for class practice."}
HIGHLIGHT: wrap each occurrence of the target language in **double asterisks**, exactly as it appears.
Return ONLY valid JSON, no markdown, exactly this shape: {SHAPE[kind]}
```
`{SHAPE[kind]}` es un string por kind con claves y tipos exactos. Ejemplos:
- `story`: `{"title":"","text":"paragraphs separated by \n, targets in **bold**","targetsUsed":[{"anchorId":"","count":0}]}`
- `news`: `{"headline":"","lede":"","body":"","quote":{"speaker":"","text":""},"fictionalNote":"Fictional ...","targetsUsed":[...]}`
- `exercise`: `{"type":"gapfill","instructions":"English, ≤15 words","items":[{"prompt":"sentence with ____","answer":"","distractors":[]}]}`
- `ccq`: `{"items":[{"point":"","q":"yes/no or short answer","answer":""}]}`
- `bridge-propose`: `{"bridges":[{"title":"","setting":"","roles":[""],"conflict":"","rationale":{"<anchorId>":"Spanish, ≤ 18 words"},"order":["<anchorId>"],"transitions":[{"toAnchorId":"","teacher_es":"","student_en":"must mention setting or a role"}]}]}`

Parámetros: `temperature ≈ 0.7` si `examAi.generate` lo admite (si no, ignorar), 1 reintento automático con el error de validación pegado en el prompt ("Fix: ..."); tras el segundo fallo → `source:'local'`.

### 4.4 Validación local (`validate.ts`, aplica a IA y a edición manual)
1. JSON parseable y con las claves exactas (si no, error de forma).
2. Longitud dentro de rango §4.1 (± 15 %); nº de ítems exacto o dentro de ±1.
3. **Lenguaje meta**: cada ancla `grammar` se detecta con un `matcher` por punto (regex en `GRAMMAR_PROFILES`/`matchers` p. ej. `/\b(was|were|\w+ed)\b/` para past simple) y cada `vocab` por lemas simples; `hits ≥ minHits` (story/news/message 3, dialogue 3, examples todas las frases, exercise todos los ítems). Resaltado: los `**...**` se convierten a `<mark>` en la UI; si el modelo no resaltó, la app resalta por matcher.
4. **Nivel**: palabras fuera de la lista del nivel → aviso (no bloqueo) usando la lista de vocabulario del nivel acumulada (unidades ≤ nivel) + 1000 palabras comunes; se rechaza solo si > 8 % desconocidas en A1–A2.
5. Noticias: obligatorio `fictionalNote`; se rechaza si aparece un año reciente + nombre propio conocido (heurística) o cifras con "%" sin marca de ficción.
6. Respuestas: `answer` presente y, en gapfill, `distractors` no contienen la respuesta; una única respuesta correcta (verificación de cadena).
7. Resultado: `{ok, errors[], warnings[]}`; los avisos se muestran como insignia ámbar en la tarjeta.

---

## 5. Personalización

- **Edición en línea**: cada campo de texto es `contentEditable`/textarea con autoguardado (debounce 600 ms); al editar `edited = true`. Los resaltados se recalculan al salir del campo.
- **Regenerar**: botón "Otra versión" por recurso y por etapa (regenera P, Practice o Production por separado) y "Regenerar plan" global; **nunca** toca recursos con `locked`. "Otra versión" envía `avoid: [texto anterior resumido]` para variar, y conserva el contexto.
- **Bloquear**: candado por recurso o etapa; los bloqueados se saltan en toda regeneración y al cambiar el contexto puente (aviso si el nuevo puente no encaja).
- **Estructura**: reordenar etapas y anclas (arrastrar o ↑/↓); añadir ancla (se inserta etapa nueva con transición); quitar ancla/etapa; añadir recurso desde el menú (§4) a cualquier etapa; ajustar minutos con +/− (el plan muestra total vs. duración con barra roja si se excede).
- **Cambiar de contexto puente** después de generar: ofrece las otras 2 propuestas y regenera solo los recursos no bloqueados ni editados (los editados se muestran con diálogo "mantener/regenerar").
- **Guardado**: `localStorage` clave `ecyr.thread.v2.threads` (array de `Thread`, máx. 50, `version: 2`), `ecyr.thread.v2.draft` (autoguardado del plan actual), `ecyr.thread.v2.prefs`. Barra: Guardar con nombre, Abrir, Duplicar, Eliminar, **Exportar JSON** (archivo `hilo-<nombre>.json`) e **Importar JSON** (validar `version` y estructura; ids regenerados al importar para evitar choques; migración desde versiones futuras con `migrate()`).
- **Modo presentación** (`/ruta?present=1` o botón): pantalla completa, una etapa/recurso por diapositiva, letra grande (≥ 28 px; el texto central ≥ 36 px), lenguaje meta resaltado, teclas ←/→/Esc, botón "mostrar respuestas" (oculto por defecto), temporizador por etapa, sin controles de edición, notas del docente en un panel que solo se ve con la tecla `N`.
- **Copiar/Imprimir**: "Copiar plan" (texto plano, extiende `threadToText`) y "Imprimir" (CSS `@media print`, 1 etapa por bloque, respuestas al final en hoja separada, versión alumno vs. versión docente).
- Accesibilidad: todo operable por teclado, contraste AA, `aria-live` para estados de carga.

---

## 6. Modelo de datos (TypeScript)

```ts
import type { CefrLevel } from '@/content/types';
import type { Audience, Energizer, Mix } from '@/lib/engagement';

export type Fn = 'narrate'|'describe'|'compare'|'advise'|'oblige'|'permit'|'plan'|'predict'|'hypothesize'
  |'report'|'request'|'opinion'|'argue'|'instruct'|'experience'|'routine'|'evaluate'|'persuade';
export type Dom = 'travel'|'school'|'work'|'food'|'health'|'home'|'tech'|'shopping'|'sport'|'media'
  |'environment'|'city'|'family'|'culture'|'money'|'law';
export type Source = 'local' | 'ia' | 'user';

export type Anchor =
  | { id: string; type: 'free'; text: string; profile: AnchorProfile }
  | { id: string; type: 'grammar'; unit: number; point: number; name: string; profile: AnchorProfile } // point = índice en unit.grammar
  | { id: string; type: 'vocab'; unit: number; terms: string[]; profile: AnchorProfile };

export interface AnchorProfile { fns: Fn[]; doms: Dom[]; time: 'past'|'present'|'future'|'any'; weight: number; confidence: 'high'|'low' }

export interface Bridge {
  id: string; title: string; setting: string; roles: string[]; conflict: string;
  doms: Dom[]; fns: Fn[];
  rationale: Record<string, string>;          // anchorId -> es
  source: Source;
  characters: { name: string; role: string }[]; // compat con v1
}

export type ResourceKind = 'examples'|'story'|'news'|'dialogue'|'message'|'interview'|'announcement'
  |'comprehension'|'ccq'|'exercise'|'game'|'roleplay'|'debate'|'board';

export interface Resource {
  id: string; kind: ResourceKind; title: string;
  content: Record<string, unknown>;           // forma por kind (§4.1)
  targets: { anchorId: string; hits: number }[];
  source: Source; locked: boolean; edited: boolean;
  validation?: { ok: boolean; errors: string[]; warnings: string[] };
}

export type StageKind = 'warmup'|'presentation'|'practice'|'production'|'energizer'|'closing'|'homework';
export interface Stage {
  id: string; kind: StageKind; anchorId?: string;       // ausente en warmup/closing/homework/energizer
  title: string; minutes: number;
  grouping: 'whole'|'pairs'|'groups'|'solo';
  teacherRole: string;                                   // es
  transition?: { teacher_es: string; student_en: string };
  successCriteria?: string[];                            // solo production
  resources: Resource[];
  locked: boolean; notes?: string;                       // notas libres del docente
  grammarRef?: { unit: number; point: number; diagramKey?: string }; // para enlazar form/use y diagramas
}

export interface Thread {
  version: 2; id: string; name: string; createdAt: number; updatedAt: number;
  level: CefrLevel; duration: number; mix: Mix; audience: Audience;
  anchors: Anchor[]; bridge: Bridge; alternatives: Bridge[];  // las 2 no elegidas
  stages: Stage[];                                         // ya ordenadas
  hook: string; energizer: Energizer;                      // compatibles con v1
  teamChallenge: { enabled: boolean; vocab: string[]; grammar: string[] }; // alimenta <TeamChallenge/>
  homework: { title: string; task: string };
  source: Source; seed: number;
}
```

**Compatibilidad con v1:**
- `TeamChallenge` conserva sus props: se alimenta con `vocab` y `grammar` derivados de las anclas (`teamChallenge`), `audience` y `mix`.
- `energizer`, `hook`, `audience`, `mix` mantienen forma y origen (`energizerForMix`, `hookForMix`).
- `threadToText(t)` v1 se mantiene para hilos antiguos; v2 añade `planToText(t)`. Función puente `toV1(t: Thread): V1Thread` (central story = el recurso `story/news` de la primera Presentation; capítulos = etapas) para la ruta clásica mientras exista.
- `buildLocal`/`buildWithAi`/`STYLES` siguen exportados; v2 reutiliza `STYLES` como preferencia de formato central y `pointsOf`.
- Migración: un hilo v1 abierto (no hay persistencia previa) no requiere migración; se ofrece "convertir a v2" desde los resultados del modo clásico.
- Flag de ruta: v2 detrás de `?v=2` o ajuste hasta superar la aceptación (§7); luego v2 por defecto y v1 como "modo clásico".

---

## 7. Criterios de aceptación (medibles)

Automatizables en un script `scripts/check-thread-v2.mjs` (o test vitest) con una matriz de ≥ 30 combinaciones de anclas (5 por nivel, incluyendo los 6 ejemplos de §2.6):

1. **PPP completo**: con IA y sin IA, el 100 % de los planes tiene, por cada ancla, exactamente una Presentation y una Production con ≥ 1 recurso cada una, y entre ambas una Practice que es una tarjeta de libro (`stage.book` presente y vacío/editable, **0 recursos generados**, 0 `exercise` por defecto); Production con ≥ 3 `successCriteria`.
2. **Tiempo**: la suma de `stage.minutes` = `duration` ± 2 min; ninguna etapa < mínimos de §3.
3. **Lenguaje meta**: cada recurso de lectura/escucha (`story`, `news`, `dialogue`, `message`, `interview`, `announcement`) contiene el matcher de cada ancla asociada ≥ 3 veces (≥ 2 en A1); `examples` y `exercise` ≥ 1 por ítem.
4. **Longitud y nº de ítems** dentro de los rangos §4.1 en el 100 % de los recursos que pasan validación; los que no pasan se reintentan 1 vez y luego caen a local (0 recursos vacíos en el plan).
5. **Transiciones**: 100 % de las transiciones (determinísticas y IA) contienen `bridge.setting` o alguno de `bridge.roles` (comparación sin mayúsculas) y no contienen la palabra "unit"/"unidad".
6. **Puente**: `chooseBridges` devuelve 3 contextos distintos en ≥ 90 % de las combinaciones; cada contexto elegido cubre las N anclas (`cover > 0` en todas); los 6 ejemplos de §2.6 se reproducen (mismo contexto o uno con igual cobertura).
7. **Nivel**: ≤ 5 % de palabras fuera de la lista del nivel (B1+) / ≤ 8 % (A1–A2) en el texto de los recursos, con IA y local; 0 recursos `news` sin `fictionalNote`.
8. **Sin IA**: `buildPlanLocal` devuelve el plan completo en < 150 ms y funciona sin red; con la edge function fallando, la pantalla muestra el plan local y un aviso, sin errores de consola.
9. **Editable y persistente**: tras editar cualquier campo, recargar la página y reabrir (o recuperar el borrador) conserva el 100 % de los cambios, `locked` y `edited`; export → import produce un `Thread` igual (salvo ids).
10. **Regenerar/Bloquear**: regenerar una etapa cambia solo sus recursos no bloqueados; los otros hashes de contenido permanecen idénticos (test de snapshot).
11. **Estructura**: reordenar, añadir y quitar anclas/etapas mantiene un plan válido (aplica 1–2 de este listado) y regenera solo transiciones afectadas.
12. **Presentación e impresión**: modo presentación recorre todas las etapas con teclado sin scroll horizontal; tamaño de letra computado ≥ 28 px; vista de impresión sin controles; 0 errores de consola; `npm run typecheck` y `npm run build` sin errores.
13. **Auditoría de datos**: script que verifica que todos los puntos gramaticales de `levels.ts` (A1 16, A2 16, B1 16, B2 12, C1 12, C2 10 unidades) tienen perfil en `GRAMMAR_PROFILES` (o caen a `confidence:'low'` en < 15 %), que `BRIDGES` tiene ≥ 12 (A1–B2) / ≥ 10 (C1–C2) contextos por nivel sin ids duplicados ni campos vacíos.
14. **Revisión humana** (corrector-evaluador-ingles): muestra de 12 planes (2 por nivel) con la lista de comprobación de nivel MCER, distractores únicos y ausencia de datos falsos; 0 errores graves.

Orden de implementación sugerido: (1) tipos + store + UI de entrada + plan local; (2) `bridgeData` + `chooseBridges`; (3) recursos locales + validación; (4) IA (puente y recursos); (5) personalización; (6) presentación/impresión; (7) script de aceptación.
