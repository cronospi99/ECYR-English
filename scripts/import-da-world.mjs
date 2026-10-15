#!/usr/bin/env node
/**
 * Imports Da World (github.com/cronospi99/Da-World) into public/modules/da-world,
 * so the platform plays it like its other games while the original repository
 * stays untouched and independent.
 *
 *   git clone --depth 1 https://github.com/cronospi99/Da-World /tmp/da-world
 *   node scripts/import-da-world.mjs /tmp/da-world [--keep]
 *
 * Da World is a Vite + TypeScript app, so unlike English Defenders it has to be
 * built: the checkout is copied to a temporary directory (the checkout itself
 * is never written to), patched, `npm ci`-ed and built with
 * `vite build --base=/modules/da-world/`, and only the built output lands in
 * public/modules/da-world (plus ECYR-IMPORT.json with the provenance).
 *
 * What it changes (every patch asserts its anchor and fails loudly if the
 * upstream code moved, so a silent half-integration can't ship):
 *   1. A new front door: one screen, three big mode cards (Vocabulary,
 *      Directions, Family Detective) that go straight into the city, plus a
 *      smaller "Clase (multijugador)" entry for the teacher-led QR mode. The old
 *      home → "Choose a mode" → Play steps, the mission book, the race and
 *      teacher tiles and the graphics sub-page are gone from it (see menu.ts).
 *   2. A session plays only the chosen mode: each mode has its own save slot,
 *      so citizens helped / missions finished in one mode never show up in
 *      another; the teacher panel (mode switcher, race, class goal) is only
 *      reachable by whoever runs a class (👩‍🏫 in the HUD), and the solo race is
 *      off. 🏠 goes back to the chooser.
 *   3. The ECYR bridge (public/modules/_bridge/ecyr-bridge.js) is loaded before
 *      the bundle and reports start → every first attempt → result.
 *   4. Served from /modules/da-world/: assets resolve under the base, and the
 *      Class-mode QR link points at the game's own index.html.
 *   5. Lean output: no source maps, and only the GLB models the city actually
 *      requests (read from the game's own KIT_REQUESTS) are kept.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TAG = '[import-da-world]';
const BASE = '/modules/da-world/';
const SLUG = 'da-world';

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const srcArg = args.find((a) => !a.startsWith('--'));
const src = resolve(srcArg ?? '');
if (!srcArg || !existsSync(join(src, 'index.html')) || !existsSync(join(src, 'src/main.ts')) || !existsSync(join(src, 'package.json'))) {
  console.error('Usage: node scripts/import-da-world.mjs <path to a Da-World checkout> [--keep]');
  process.exit(1);
}
const platform = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(platform, 'public/modules', SLUG);

// ------------------------------------------------------------ work copy ----
const work = mkdtempSync(join(process.env.ECYR_TMP || tmpdir(), 'ecyr-da-world-'));
console.log(`${TAG} building in ${work}`);
cpSync(src, work, {
  recursive: true,
  filter: (p) => {
    const rel = relative(src, p).split(/[\\/]/)[0];
    return !['.git', 'node_modules', 'dist', '.ecyr-kits'].includes(rel);
  },
});

const read = (f) => readFileSync(join(work, f), 'utf8');
const write = (f, s) => writeFileSync(join(work, f), s);
const applied = [];
function patch(file, label, find, replace) {
  const s = read(file);
  const hits = typeof find === 'string' ? s.split(find).length - 1 : (s.match(new RegExp(find.source, find.flags.replace('g', '') + 'g')) || []).length;
  if (hits !== 1) throw new Error(`${TAG} anchor for "${label}" in ${file} matched ${hits} times (expected exactly 1) — upstream moved, review the patch`);
  write(file, s.replace(find, replace));
  applied.push(`${file}: ${label}`);
  console.log(`  ✓ ${file}: ${label}`);
}
function expect(file, label, ...needles) {
  const s = read(file);
  for (const n of needles) if (!s.includes(n)) throw new Error(`${TAG} ${file} no longer contains ${JSON.stringify(n)} (${label}) — upstream moved, review the patch`);
}

const pkg = JSON.parse(read('package.json'));
if (pkg.name !== 'da-world') throw new Error(`${TAG} package.json name is "${pkg.name}", expected "da-world"`);

// ============================================================ 1. bridge glue
// One small module owns the conversation with the platform; the game calls it
// from four places (mode start, first attempt, mode complete, back to menu) and
// it ends the session itself on pagehide.
write('src/ecyr.ts', `/**
 * ECYR English platform bridge — added by scripts/import-da-world.mjs.
 *
 * Talks to public/modules/_bridge/ecyr-bridge.js (a classic script loaded
 * before this bundle). Outside the platform the bridge is a no-op, and if it
 * is missing altogether every call here is too.
 *
 *   start   when a mode begins (chooser card, or a class room opening)
 *   answer  on the FIRST attempt at every question — correct only when that
 *           attempt was right and no hint was used, which is exactly the
 *           game's own "first try" number in the teacher report
 *   result  once: the mode's mission set completed (won), back to the chooser,
 *           or the page going away (abandoned)
 */
import { SKILL_LABEL } from "./game/state";

interface Bridge {
  start(o: unknown): void;
  answer(correct: boolean, info: unknown): void;
  end(r: unknown): void;
}
const bridge = (): Bridge | undefined =>
  (window as unknown as { ECYRBridge?: Bridge }).ECYRBridge;

export interface EcyrProgress {
  done: number;
  total: number;
  xpLevel: number;
  casesSolved: number;
  cluesFound: number;
}

interface Run {
  gameMode: string;
  cls: boolean;
  t0: number;
  asked: number;
  correct: number;
  doneAtStart: number;
  freeplay: boolean;
}

let run: Run | null = null;
/** After a completed mission set, the next answer opens a free-play session. */
let freeplayNext: { gameMode: string; cls: boolean } | null = null;
let progress: () => EcyrProgress = () => ({ done: 0, total: 0, xpLevel: 1, casesSolved: 0, cluesFound: 0 });

const KIND: Record<string, string> = {
  find: "vocabulary",
  grammar: "grammar",
  directions: "directions",
  clue: "grammar",
};

export function ecyrBind(get: () => EcyrProgress): void {
  progress = get;
  addEventListener("pagehide", () => ecyrFinish("left"));
}

/** The race to N missions is a classroom rule; solo play never fades out on one. */
export function ecyrSoloRace(): boolean {
  return false;
}

export function ecyrActive(): string | null {
  return run ? run.gameMode : null;
}

export function ecyrBegin(gameMode: string, cls: boolean, freeplay = false): void {
  if (run && run.gameMode === gameMode && run.cls === cls) return;
  if (run) ecyrFinish("switch");
  freeplayNext = null;
  const p = progress();
  run = { gameMode, cls, t0: Date.now(), asked: 0, correct: 0, doneAtStart: p.done, freeplay };
  const meta: Record<string, unknown> = { gameMode, missionsDone: p.done, missionsTotal: p.total };
  if (freeplay) meta.freeplay = true;
  bridge()?.start({ mode: cls ? "class" : "solo", meta });
}

export function ecyrAnswer(correct: boolean, tag: string, kind: string): void {
  if (!run && freeplayNext) ecyrBegin(freeplayNext.gameMode, freeplayNext.cls, true);
  if (!run) return;
  run.asked++;
  if (correct) run.correct++;
  bridge()?.answer(correct, { topic: SKILL_LABEL[tag] ?? tag, kind: KIND[kind] ?? kind });
}

/** The mode's whole mission set has just been finished. True if that won a session. */
export function ecyrComplete(): boolean {
  if (!run || run.cls || run.freeplay) return false;
  const p = progress();
  if (run.doneAtStart >= p.total || p.done < p.total) return false;
  const again = { gameMode: run.gameMode, cls: run.cls };
  ecyrFinish("complete");
  freeplayNext = again;
  return true;
}

export function ecyrFinish(reason: "complete" | "menu" | "left" | "switch"): void {
  if (!run) {
    freeplayNext = null;
    return;
  }
  const r = run;
  run = null;
  const p = progress();
  const won = reason === "complete";
  // Closing the page mid-session is abandoning it. A session with no answer at
  // all is closed the same way, so it never shows up as a flagged result.
  const abandoned = !won && (reason === "left" || r.asked === 0);
  const meta: Record<string, unknown> = {
    gameMode: r.gameMode,
    missionsDone: p.done,
    missionsTotal: p.total,
    missionsThisSession: Math.max(0, p.done - r.doneAtStart),
    durationSec: Math.round((Date.now() - r.t0) / 1000),
    xpLevel: p.xpLevel,
    endedBy: reason,
  };
  if (r.gameMode === "detective") {
    meta.casesSolved = p.casesSolved;
    meta.cluesFound = p.cluesFound;
  }
  if (r.freeplay) meta.freeplay = true;
  if (abandoned) meta.abandoned = true;
  const accuracy = r.asked ? r.correct / r.asked : 0;
  bridge()?.end({
    won: r.cls ? undefined : won,
    asked: r.asked,
    correct: r.correct,
    mode: r.cls ? "class" : "solo",
    stars: won ? (accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1) : undefined,
    meta,
  });
}
`);
console.log('  ✓ src/ecyr.ts (bridge glue)');

// ============================================ 2. one save slot per mode
patch('src/game/state.ts', 'save key per mode (slot)',
  'const SAVE_KEY = "da-world:save:v1";\n',
  `const SAVE_KEY = "da-world:save:v1";

/**
 * ECYR: one save per mode. The thirty-two citizens are the same people in
 * every mode, so a shared save marked the ones helped in Vocabulary as already
 * helped (and silent) in Directions, and finished missions leaked across.
 * With a slot per mode, a session only ever sees its own mode's progress.
 */
let saveSlot = "";
const saveKey = (): string => (saveSlot ? SAVE_KEY + ":" + saveSlot : SAVE_KEY);
export function useSaveSlot(id: string): void {
  saveSlot = id;
}
`);
patch('src/game/state.ts', 'saveState writes the slot', 'localStorage.setItem(SAVE_KEY, JSON.stringify(payload));', 'localStorage.setItem(saveKey(), JSON.stringify(payload));');
patch('src/game/state.ts', 'loadState reads the slot', 'const raw = localStorage.getItem(SAVE_KEY);', 'const raw = localStorage.getItem(saveKey());');
patch('src/game/state.ts', 'clearSave clears the slot', 'localStorage.removeItem(SAVE_KEY);', 'localStorage.removeItem(saveKey());');
write('src/game/state.ts', read('src/game/state.ts') + `
/** ECYR: the missions finished in another mode's slot, for the chooser's cards. */
export function slotMissions(id: string): string[] | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY + ":" + id);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveShape;
    return Array.isArray(data.missionsDone) ? data.missionsDone : null;
  } catch {
    return null;
  }
}
`);

// =================================================== 3. the new front door
expect('src/ui/menu.ts', 'the menu being replaced',
  'type View = "home" | "modes" | "missions" | "graphics" | "race";',
  'export interface MenuHandlers {',
  'onStart(mode: GameMode): void;',
  'onQuality(name: QualityName): void;',
  'onTeacher(): void;',
  'onCharacter(): void;',
  'onSetTarget(missions: number): void;',
  'setRaceTarget(target: number): void {',
);
expect('src/game/modes.ts', 'mode ids', 'export type GameModeId = "vocabulary" | "directions" | "detective" | "multiplayer";');
write('src/ui/menu.ts', `import { missionsFor } from "../game/missions";
import { MODES, type GameMode, type GameModeId } from "../game/modes";
import { QUALITY, type QualityName } from "../core/quality";
import { slotMissions, type GameState } from "../game/state";
import { el } from "./dom";

/**
 * The front door — rewritten for ECYR English by scripts/import-da-world.mjs.
 *
 * One question: what do you want to practise? Three big cards go straight into
 * the city in that mode; the teacher-led class (QR) is a smaller entry under
 * them. Your character and the graphics level are two small links, never a
 * step you have to pass. Everything else the old menu had is reachable where
 * it is used: the missions are 🎯 in the city (and only the chosen mode's),
 * the race and the class goal are in the teacher panel (👩‍🏫, for whoever runs
 * a class), and the character is also in the lobby and in the city's ? card.
 */

export interface MenuHandlers {
  onStart(mode: GameMode): void;
  onQuality(name: QualityName): void;
  onTeacher(): void;
  /** Open the character customiser. */
  onCharacter(): void;
  /** How many missions win the match. 0 is no race. */
  onSetTarget(missions: number): void;
}

const CARDS: { id: GameModeId; line: string }[] = [
  {
    id: "vocabulary",
    line: "Lugares de la ciudad, there is / there are, some / any, much / many y preposiciones de lugar.",
  },
  {
    id: "directions",
    line: "Da indicaciones a turistas perdidos: go straight on, turn left / right y cuenta las cuadras.",
  },
  {
    id: "detective",
    line: "Adverbios de frecuencia y la familia: reúne pistas por la ciudad y descubre quién se esconde.",
  },
];

const QUALITY_ES: Record<QualityName, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  ultra: "Ultra",
};

export class Menu {
  private readonly root: HTMLElement;
  private readonly counts = new Map<GameModeId, HTMLElement>();
  private readonly qualityButton: HTMLButtonElement;
  private quality: QualityName;

  constructor(
    parent: HTMLElement,
    _state: GameState,
    quality: QualityName,
    _target: number,
    private readonly handlers: MenuHandlers,
  ) {
    this.quality = quality;

    const cards = CARDS.map(({ id, line }) => {
      const mode = MODES[id];
      const count = el("span", { class: "ecyr-card-count" });
      this.counts.set(id, count);
      const card = el("button", { class: "ecyr-card ecyr-card-" + id, type: "button", "data-mode": id }, [
        el("span", { class: "ecyr-card-icon", text: mode.icon, "aria-hidden": "true" }),
        el("span", { class: "ecyr-card-text" }, [
          el("span", { class: "ecyr-card-name", text: mode.name }),
          el("span", { class: "ecyr-card-line", text: line }),
          count,
        ]),
        el("span", { class: "ecyr-card-go", text: "Jugar", "aria-hidden": "true" }),
      ]);
      card.addEventListener("click", () => this.handlers.onStart(mode));
      return card;
    });

    const together = MODES.multiplayer;
    const classButton = el("button", { class: "ecyr-class", type: "button", "data-mode": together.id }, [
      el("span", { class: "ecyr-class-icon", text: together.icon, "aria-hidden": "true" }),
      el("span", { class: "ecyr-card-text" }, [
        el("span", { class: "ecyr-class-name", text: "Clase (multijugador)" }),
        el("span", {
          class: "ecyr-card-line",
          text: "Para el docente: un navegador abre la ciudad y los alumnos entran escaneando un código QR.",
        }),
      ]),
      el("span", { class: "ecyr-class-go", text: "›", "aria-hidden": "true" }),
    ]);
    classButton.addEventListener("click", () => this.handlers.onStart(together));

    const character = el("button", { class: "ecyr-link", type: "button", text: "🧍 Tu personaje" });
    character.addEventListener("click", () => this.handlers.onCharacter());
    this.qualityButton = el("button", { class: "ecyr-link", type: "button" }) as HTMLButtonElement;
    this.qualityButton.addEventListener("click", () => this.cycleQuality());

    this.root = el("div", { class: "menu-screen ecyr-chooser" }, [
      el("div", { class: "menu-panel ecyr-panel" }, [
        el("header", { class: "menu-head" }, [
          el("h1", { class: "menu-title", text: "Da World" }),
          el("p", {
            class: "menu-sub",
            text: "Una ciudad en 3D para recorrer a pie: los ciudadanos con ❓ necesitan tu inglés. ¿Qué quieres practicar?",
          }),
        ]),
        el("div", { class: "ecyr-cards" }, cards),
        classButton,
        el("div", { class: "ecyr-links" }, [character, this.qualityButton]),
      ]),
    ]);

    parent.append(this.root);
    this.refresh();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("is-gone");
  }

  hide(): void {
    this.root.classList.add("is-gone");
  }

  show(): void {
    this.root.classList.remove("is-gone");
    this.refresh();
  }

  /** Kept for the class code that pushes the race number here; the chooser has no race. */
  setRaceTarget(_target: number): void {}

  private cycleQuality(): void {
    const names = Object.keys(QUALITY) as QualityName[];
    this.quality = names[(names.indexOf(this.quality) + 1) % names.length];
    this.handlers.onQuality(this.quality);
    this.refresh();
  }

  private refresh(): void {
    this.qualityButton.textContent = "⚙️ Gráficos: " + QUALITY_ES[this.quality];
    for (const [id, node] of this.counts) {
      const missions = missionsFor(MODES[id]);
      const done = new Set(slotMissions(id) ?? []);
      const n = missions.filter((m) => done.has(m.id)).length;
      node.textContent =
        n >= missions.length
          ? "✓ " + missions.length + " misiones completadas"
          : n > 0
            ? n + " de " + missions.length + " misiones"
            : missions.length + " misiones";
      node.classList.toggle("is-done", n >= missions.length);
    }
  }
}
`);
applied.push('src/ui/menu.ts: replaced by the mode chooser');
console.log('  ✓ src/ui/menu.ts (mode chooser)');

expect('src/styles.css', 'menu styles the chooser builds on', '.menu-screen {', '.menu-panel {', '.menu-title {', '.menu-sub {');
write('src/styles.css', read('src/styles.css') + `
/* --- ECYR: the mode chooser (scripts/import-da-world.mjs) ------------------ */

.ecyr-panel {
  max-width: 960px;
}

.ecyr-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.ecyr-card {
  --card: var(--accent);
  --card-deep: var(--accent-deep);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-height: 250px;
  padding: 22px 20px 18px;
  border: 2px solid #e5d9c0;
  border-radius: 10px;
  background-color: var(--paper-2);
  box-shadow: 4px 4px 0 #e5d9c0;
  color: var(--ink);
  text-align: left;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.ecyr-card-directions {
  --card: #5e9c8f;
  --card-deep: #3f7a6e;
}

.ecyr-card-detective {
  --card: #9a7bb8;
  --card-deep: #75589a;
}

.ecyr-card:hover,
.ecyr-card:focus-visible {
  transform: translate(-2px, -2px);
  border-color: var(--card);
  background-color: #fffaee;
  box-shadow: 6px 6px 0 var(--card-deep);
  outline: none;
}

.ecyr-card-icon {
  font-size: 46px;
  line-height: 1;
}

.ecyr-card-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ecyr-card-name {
  font-size: 27px;
  letter-spacing: -0.03em;
}

.ecyr-card-line {
  font-size: 15px;
  line-height: 1.38;
  color: var(--ink-soft);
}

.ecyr-card-count {
  margin-top: auto;
  padding-top: 6px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #b4aa97;
}

.ecyr-card-count.is-done {
  color: var(--good);
}

.ecyr-card-go {
  align-self: stretch;
  padding: 11px 0;
  border-radius: 24px;
  background-color: var(--card);
  color: #fffdf8;
  font-size: 18px;
  letter-spacing: -0.01em;
  text-align: center;
  box-shadow: 0 3px 0 var(--card-deep);
}

.ecyr-class {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-top: 18px;
  padding: 13px 18px;
  border: 2px dashed #d9cbb0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.ecyr-class:hover,
.ecyr-class:focus-visible {
  border-color: var(--accent);
  background-color: #fffaee;
  outline: none;
}

.ecyr-class-icon {
  font-size: 28px;
  line-height: 1;
}

.ecyr-class-name {
  font-size: 18px;
  letter-spacing: -0.02em;
}

.ecyr-class-go {
  margin-left: auto;
  font-size: 28px;
  line-height: 1;
  color: var(--ink-soft);
}

.ecyr-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin-top: 14px;
}

.ecyr-link {
  padding: 6px 2px;
  border: none;
  background: none;
  color: var(--ink-soft);
  font-size: 15px;
  text-decoration: underline;
  text-decoration-color: #d9cbb0;
  text-underline-offset: 4px;
}

.ecyr-link:hover {
  color: var(--ink);
}

@media (max-width: 760px), (orientation: portrait) and (max-width: 900px) {
  .ecyr-cards {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 18px;
  }

  .ecyr-card {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    min-height: 0;
    padding: 14px 14px 14px 12px;
    box-shadow: 3px 3px 0 #e5d9c0;
  }

  .ecyr-card-icon {
    flex: 0 0 auto;
    width: 46px;
    font-size: 34px;
    text-align: center;
  }

  .ecyr-card-name {
    font-size: 21px;
  }

  .ecyr-card-line {
    font-size: 14px;
    line-height: 1.32;
  }

  .ecyr-card-count {
    padding-top: 2px;
    font-size: 12px;
  }

  .ecyr-card-go {
    display: none;
  }

  .ecyr-class {
    margin-top: 12px;
    padding: 12px 14px;
  }
}
`);
applied.push('src/styles.css: chooser styles appended');
console.log('  ✓ src/styles.css (chooser styles)');

// =============================================== 4. game wiring (main.ts)
const M = 'src/main.ts';
patch(M, 'import the bridge glue', 'import { createEnvironment } from "./world/environment";\n',
  'import { createEnvironment } from "./world/environment";\nimport { useSaveSlot } from "./game/state";\nimport { ecyrBegin, ecyrBind, ecyrComplete, ecyrFinish, ecyrSoloRace } from "./ecyr";\n');

patch(M, 'track which save slot is loaded', '  let playing = false;\n',
  '  let playing = false;\n  /** ECYR: which mode\'s save slot is loaded ("" until a mode is chosen). */\n  let ecyrSlot = "";\n');

patch(M, '🏠 ends the session and returns to the chooser',
  '    onMenu: () => {\n      saveState(state);\n      menu.show();\n      syncInput();\n    },\n',
  '    onMenu: () => {\n      ecyrFinish("menu");\n      saveState(state);\n      menu.show();\n      syncInput();\n    },\n    // ECYR: the teacher panel lives here now, shown only to whoever runs a class.\n    onTeacher: () => {\n      teacher.toggle(true);\n      syncInput();\n    },\n');

patch(M, 'match-over → menu ends the session',
  '    onMenu: () => {\n      matchOver.hide();\n      saveState(state);\n      menu.show();\n',
  '    onMenu: () => {\n      matchOver.hide();\n      ecyrFinish("menu");\n      saveState(state);\n      menu.show();\n');

patch(M, 'finishing the mode\'s mission set wins the session',
  '      hud.showToast("👑", "City champion!", "Every mission in Da World is done.");\n',
  '      hud.showToast("👑", "City champion!", "Every mission in this mode is done.");\n      if (playing && net === NO_SESSION && ecyrComplete()) ecyrShowDone();\n');

patch(M, 'no solo race (checkMissions)', '      !net.connected &&\n      winTarget > 0 &&\n',
  '      !net.connected &&\n      ecyrSoloRace() &&\n      winTarget > 0 &&\n');
patch(M, 'no solo race (start toast)', 'if (!net.connected && winTarget > 0 && raceArmedAt >= winTarget) {',
  'if (!net.connected && ecyrSoloRace() && winTarget > 0 && raceArmedAt >= winTarget) {');

patch(M, 'startMode loads the mode\'s own save slot',
  '  function startMode(next: GameMode): void {\n    mode = next;\n',
  `  function startMode(next: GameMode): void {
    // ECYR: each mode keeps its own progress. Class play (any room, whatever
    // topic the teacher sets) is one more slot of its own.
    const ecyrMode = net !== NO_SESSION ? "multiplayer" : next.id;
    if (ecyrMode !== ecyrSlot) {
      if (ecyrSlot) saveState(state);
      ecyrSlot = ecyrMode;
      useSaveSlot(ecyrMode);
      const keepFocus = net !== NO_SESSION ? state.focusMissionId : null;
      Object.assign(state, createState(), { clock: state.clock });
      loadState(state);
      state.focusMissionId = keepFocus;
      detective = null;
    }
    mode = next;
`);

patch(M, 'startMode opens the platform session',
  /(\n    if \(!net\.connected && ecyrSoloRace\(\)[\s\S]*?\n    \}\n)(    syncInput\(\);\n  \}\n)/,
  '$1    ecyrBegin(ecyrMode, net !== NO_SESSION);\n$2');

patch(M, 'a solo card leaves any room first',
  '    onStart: (chosen) => {\n',
  '    onStart: (chosen) => {\n      // ECYR: a solo mode is a solo session — leave any room that is still open.\n      if (!chosen.networked && net !== NO_SESSION) leaveRoom();\n');

patch(M, 'a host walking back into an open room reopens the class session',
  '    onEnter: () => syncInput(),\n',
  '    onEnter: () => {\n      if (net !== NO_SESSION && playing) ecyrBegin("multiplayer", true);\n      syncInput();\n    },\n');

patch(M, 'cancelling the class lobby closes any class session',
  '    onCancel: () => menu.show(),\n',
  '    onCancel: () => {\n      ecyrFinish("menu");\n      menu.show();\n    },\n');

patch(M, 'teacher panel button for the host', '      teacher.unlock();\n', '      teacher.unlock();\n      hud.setTeacher(true);\n');
patch(M, 'teacher panel button for a class-server teacher', '      leaveRoom();\n      myName = details.name;\n',
  '      leaveRoom();\n      myName = details.name;\n      hud.setTeacher(details.asTeacher);\n');
patch(M, 'no teacher button outside a room', '    classmates.clear();\n    hud.setLeaderboard(false);\n    refreshRoom();\n  }\n',
  '    classmates.clear();\n    hud.setLeaderboard(false);\n    hud.setTeacher(false);\n    refreshRoom();\n  }\n');

patch(M, 'the teacher mode switch only works inside a class',
  '    onSwitchMode: (chosen) => {\n      teacher.toggle(false);\n',
  `    onSwitchMode: (chosen) => {
      teacher.toggle(false);
      // ECYR: switching mode in solo play means choosing again.
      if (net === NO_SESSION) {
        ecyrFinish("menu");
        saveState(state);
        menu.show();
        syncInput();
        return;
      }
`);

patch(M, 'bind the bridge to the mission progress', '  engine.start();\n  checkMissions();\n',
  `  engine.start();
  checkMissions();

  // ECYR: what the platform is told at the end of a session.
  ecyrBind(() => ({
    done: missions.filter((m) => state.missionsDone.has(m.id)).length,
    total: missions.length,
    xpLevel: state.level,
    casesSolved: state.casesSolved,
    cluesFound: state.cluesFound,
  }));

  /** ECYR: the mode's mission set is done — say so once the card in front is closed. */
  function ecyrShowDone(): void {
    if (dialog.open || confirm.isOpen || matchOver.isOpen) {
      window.setTimeout(ecyrShowDone, 500);
      return;
    }
    confirm.ask(
      "🏆 " + mode.name + " complete!",
      "All " + missions.length + " missions of this mode are done. Keep exploring the city, or choose another mode.",
      "Choose another mode",
      () => {
        ecyrFinish("menu");
        saveState(state);
        menu.show();
        syncInput();
      },
      "Keep exploring",
    );
    syncInput();
  }
`);

patch(M, 'expose the save slot to the console', '    get mode() {\n      return mode;\n    },\n',
  '    get mode() {\n      return mode;\n    },\n    ecyrSlot: () => ecyrSlot,\n');

// ------------------------------------------------- dialog: graded answers
patch('src/ui/dialog.ts', 'import the bridge glue', 'import { closeButton, el } from "./dom";\n',
  'import { closeButton, el } from "./dom";\nimport { ecyrAnswer } from "../ecyr";\n');
patch('src/ui/dialog.ts', 'report the first attempt at every question',
  '    quest.attempts = (quest.attempts ?? 0) + 1;\n',
  `    quest.attempts = (quest.attempts ?? 0) + 1;
    // ECYR: one graded answer per question — the first attempt, scored the way
    // the teacher report scores "first try" (right, and without the hint).
    if (quest.attempts === 1) ecyrAnswer(option === quest.correct && !quest.hintUsed, quest.tag, quest.kind);
`);

// ------------------------------------------------------- confirm: labels
patch('src/ui/confirm.ts', 'cancel label can be named',
  '  ask(title: string, body: string, confirmLabel: string, onYes: () => void): void {\n',
  '  ask(title: string, body: string, confirmLabel: string, onYes: () => void, cancelLabel = "Cancel"): void {\n    const no = this.root.querySelector(".lesson-actions .pill-button.ghost");\n    if (no) no.textContent = cancelLabel;\n');

// ------------------------------------------------------------ city HUD
const H = 'src/ui/cityHud.ts';
patch(H, 'teacher option', '  onWipe: () => void;\n}\n',
  '  onWipe: () => void;\n  /** ECYR: open the teacher panel — only shown to whoever runs a class. */\n  onTeacher?: () => void;\n}\n');
patch(H, 'teacher button field', '  private readonly wipeButton: HTMLButtonElement;\n',
  '  private readonly wipeButton: HTMLButtonElement;\n  private readonly teacherButton: HTMLButtonElement;\n');
patch(H, 'teacher button', '    const buttons = el("nav", { class: "hud-corner hud-top-right" }, [\n',
  `    // ECYR: the teacher panel used to be a tile on the front menu. It is a
    // classroom tool, so it lives here, for the host of a room only.
    this.teacherButton = el("button", {
      class: "tile-button is-gone",
      type: "button",
      "aria-label": "Teacher panel",
      text: "👩‍🏫",
    });
    this.teacherButton.addEventListener("click", () => this.options.onTeacher?.());

    const buttons = el("nav", { class: "hud-corner hud-top-right" }, [
`);
patch(H, 'teacher button in the bar', '      this.boardButton,\n      this.roomButton,\n',
  '      this.boardButton,\n      this.roomButton,\n      this.teacherButton,\n');
patch(H, 'setTeacher()', '  /** True when this city is nobody else\'s — which is when 🧹 is offered. */\n',
  '  /** ECYR: show the teacher panel button (room host / class-server teacher). */\n  setTeacher(visible: boolean): void {\n    this.teacherButton.classList.toggle("is-gone", !visible);\n  }\n\n  /** True when this city is nobody else\'s — which is when 🧹 is offered. */\n');
patch(H, '🏠 says where it goes', '"aria-label": "Back to the main menu",', '"aria-label": "Choose another mode",\n      title: "Choose another mode",');
patch(H, 'drop "Start the city again" (🧹 does it, without reloading the page)',
  /\n    const reset = el\("button", \{\n      class: "pill-button ghost",\n      type: "button",\n      text: "Start the city again",\n    \}\);\n    reset\.addEventListener\("click", \(\) => this\.options\.onReset\(\)\);\n/,
  '\n');
patch(H, 'info card actions', 'el("div", { class: "lesson-actions" }, [character, reset]),', 'el("div", { class: "lesson-actions" }, [character]),');
patch(H, 'info card: what 🏠 does', 'el("li", { text: "Back to the menu — 🏠. Nothing is lost." }),',
  'el("li", { text: "Choose another mode — 🏠. Your progress in this mode is kept." }),');

// ------------------------------------------- class QR link under the base
patch('src/net/peer.ts', 'join link names index.html under the base',
  'return `${location.origin}${location.pathname}${location.search}#join=${code}`;',
  '// ECYR: served from /modules/da-world/ — name the page, so the link works on any static host.\n  const path = location.pathname.endsWith("/") ? location.pathname + "index.html" : location.pathname;\n  return `${location.origin}${path}${location.search}#join=${code}`;');

// ---------------------------------------------------- page title / lang
patch('index.html', 'page title', '<title>Da World — walk the city</title>', '<title>Da World</title>');

// ======================================================= 5. install + build
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const env = { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1', CI: '1' };
const run = (cmd, argv) => execFileSync(cmd, argv, { cwd: work, stdio: 'inherit', env });
try {
  run(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error']);
} catch {
  console.warn(`${TAG} npm ci failed — trying npm install`);
  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error']);
}

// Which models does the city actually download? Ask the game itself: evaluate
// KIT_REQUESTS from src/city/kit.ts with a throwaway SSR build.
write('ecyr-kits.ts', 'export { KIT_REQUESTS } from "./src/city/kit";\n');
run(npx, ['vite', 'build', '--ssr', 'ecyr-kits.ts', '--outDir', '.ecyr-kits', '--logLevel', 'warn']);
const { KIT_REQUESTS } = await import(pathToFileURL(join(work, '.ecyr-kits/ecyr-kits.js')).href);
if (!Array.isArray(KIT_REQUESTS) || !KIT_REQUESTS.length) throw new Error(`${TAG} KIT_REQUESTS did not evaluate`);
const wanted = new Set(KIT_REQUESTS.flatMap((r) => r.models.map((n) => `${r.kit}/${n}.glb`)));
const modelsDir = join(work, 'public/models');
let pruned = 0;
let prunedBytes = 0;
for (const kit of readdirSync(modelsDir)) {
  const dir = join(modelsDir, kit);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.glb') || wanted.has(`${kit}/${f}`)) continue;
    prunedBytes += statSync(join(dir, f)).size;
    rmSync(join(dir, f));
    pruned++;
  }
}
const missing = [...wanted].filter((w) => !existsSync(join(modelsDir, w)));
if (missing.length) throw new Error(`${TAG} requested models are missing: ${missing.join(', ')}`);
if (!existsSync(join(modelsDir, 'character.glb'))) throw new Error(`${TAG} public/models/character.glb is missing`);
rmSync(join(modelsDir, 'README.md'), { force: true });
console.log(`  ✓ models: kept ${wanted.size} requested GLBs + character.glb, dropped ${pruned} unused (${(prunedBytes / 1e6).toFixed(1)} MB)`);

run(npx, ['tsc', '--noEmit']);
run(npx, ['vite', 'build', `--base=${BASE}`, '--outDir', 'dist', '--emptyOutDir', '--logLevel', 'warn']);

// ---------------------------------------------- built page: bridge first
const dist = join(work, 'dist');
const htmlPath = join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
const moduleTag = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (!moduleTag) throw new Error(`${TAG} built index.html has no module script`);
if (!moduleTag[1].startsWith(`${BASE}assets/`)) throw new Error(`${TAG} bundle is not under ${BASE}: ${moduleTag[1]}`);
html = html.replace(moduleTag[0], `<script src="/modules/_bridge/ecyr-bridge.js" data-slug="${SLUG}"></script>\n    ${moduleTag[0]}`);
writeFileSync(htmlPath, html);
console.log('  ✓ dist/index.html: ECYR bridge loads before the bundle');

// Nothing in the output may point at the site root outside the base.
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dist);
const maps = files.filter((f) => f.endsWith('.map'));
if (maps.length) throw new Error(`${TAG} source maps in the output: ${maps.join(', ')}`);
for (const f of files.filter((p) => /\.(js|css|html)$/.test(p))) {
  const s = readFileSync(f, 'utf8');
  const bad = s.match(/["'(]\/(assets|models|src)\//);
  if (bad) throw new Error(`${TAG} ${relative(dist, f)} references the site root: ${bad[0]}`);
}
const bundle = readFileSync(join(dist, moduleTag[1].slice(BASE.length)), 'utf8');
for (const needle of [`${BASE}models/`, 'ecyr-card', 'ECYRBridge', 'da-world:save:v1']) {
  if (!bundle.includes(needle)) throw new Error(`${TAG} built bundle lacks ${JSON.stringify(needle)}`);
}

// --------------------------------------------------------------- publish
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(dist, out, { recursive: true });

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD']).toString().trim();
} catch {
  /* not a git checkout */
}
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
writeFileSync(
  join(out, 'ECYR-IMPORT.json'),
  JSON.stringify(
    {
      upstream: 'github.com/cronospi99/Da-World',
      commit,
      importedAt: new Date().toISOString(),
      base: BASE,
      build: `vite build --base=${BASE} (no source maps)`,
      files: files.length,
      bytes,
      modelsDropped: pruned,
      patches: applied,
    },
    null,
    2,
  ) + '\n',
);

if (!keep) rmSync(work, { recursive: true, force: true });
else console.log(`${TAG} kept the build directory: ${work}`);
console.log(`Da World ${commit} → public/modules/${SLUG} (${files.length} files, ${(bytes / 1e6).toFixed(1)} MB)`);
