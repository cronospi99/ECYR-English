// English Defenders — bootstrap, menus & HUD (Teacher Esteban Yepes)
import { TOPICS } from '../data/topics.js';
import { Quiz, tipsES, setTipsES, MODES, MODE_INFO, questionMode, setQuestionMode } from './quiz.js';
import { Game, PLANTS, THEMES, PLANT_DESC, ZOMBIE_INFO, availablePlants, ROWS, COLS,
         DIFFICULTIES, DEFAULT_DIFFICULTY, plantStats, zombieStats, EVOLVE,
         MAX_PLANT_LEVEL } from './game.js';
import { preloadSprites, spriteURL } from './sprites.js';
import { preloadModels } from './models3d.js';
import { SFX, setMuted, isMuted } from './audio.js';
import { startMusic, stopMusic, isMusicPlaying, getTracks, getTrackSelection, selectTrack } from './music.js';
import { ClassHost, ClassClient, joinURL, makeQR, testIce, getTurn, setTurn } from './net.js';

const musicWanted = () => localStorage.getItem('ed:music') !== 'off';

const $ = (id) => document.getElementById(id);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const LEVEL_NAMES = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper-Int.', C1: 'Advanced' };

/* ================= Persistence ================= */
const store = {
  get progress() { try { return JSON.parse(localStorage.getItem('ed:progress')) || {}; } catch { return {}; } },
  setStars(level, unit, stars) {
    const p = store.progress;
    p[level] = p[level] || {};
    p[level][unit] = Math.max(p[level][unit] || 0, stars);
    localStorage.setItem('ed:progress', JSON.stringify(p));
  },
  get global() { try { return JSON.parse(localStorage.getItem('ed:global')) || { asked: 0, correct: 0 }; } catch { return { asked: 0, correct: 0 }; } },
  addGlobal(asked, correct) {
    const g = store.global;
    g.asked += asked; g.correct += correct;
    localStorage.setItem('ed:global', JSON.stringify(g));
  },
};

/* ================= Stages per level ================= */
function stagesFor(level) {
  const byUnit = new Map();
  for (const t of TOPICS[level]) {
    if (!byUnit.has(t.unit)) byUnit.set(t.unit, []);
    byUnit.get(t.unit).push(t.topic);
  }
  return [...byUnit.entries()].map(([unit, topics]) => ({ unit, topics }));
}

/* ================= State ================= */
let current = null; // { level, levelIdx, stageIdx, stages, mode }
let pendingMini = null;
const quiz = new Quiz();
let game = null;

/* ================= UI helpers ================= */
function show(screenId) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('visible');
  if (screenId) $(screenId).classList.add('visible');
}
function starStr(n) { return '⭐'.repeat(n) + '☆'.repeat(3 - n); }

/* ================= HUD hooks ================= */
const hooks = {
  onSun(v) { $('sun-amount').textContent = v; renderCards(); },
  onWave(spawned, total, label) {
    $('wave-bar').style.width = `${Math.round((spawned / Math.max(total, 1)) * 100)}%`;
    $('wave-label').textContent = label;
  },
  onCards() { renderCards(); },
  onAmmo(n) { $('ammo-count').textContent = n; },
  onStreak(msg) {
    const el = $('streak-pop');
    el.textContent = msg;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 1700);
  },
  onEnd(won, stats) {
    store.addGlobal(stats.asked, stats.correct);
    const isClassic = current.mode === 'classic';
    // Las estrellas son de UNA unidad concreta: una partida a medida (mezcla de
    // niveles o de varias unidades) no corresponde a ninguna, así que no puntúa.
    const scores = isClassic && !current.mixEntries && !(current.multiUnits && current.multiUnits.length > 1);
    if (won && scores) store.setStars(current.level, current.stages[current.stageIdx].unit, stats.stars);
    // ECYR: the platform records the battle (stars only when a single unit was played).
    window.ECYRBridge && window.ECYRBridge.end({
      won, asked: stats.asked, correct: stats.correct,
      stars: won && scores ? stats.stars : undefined,
      level: current.level,
      unit: scores ? current.stages[current.stageIdx].unit : undefined,
      meta: { killed: stats.killed, bestStreak: stats.bestStreak, accuracy: stats.accuracy, gameMode: current.mode, difficulty: difficulty(), scored: !!scores },
    });
    $('end-title').textContent = won ? '🏆 VICTORY!' : '🧟 The zombies got in…';
    $('end-stars').textContent = won ? (scores ? starStr(stats.stars) : '🏆') : '💀';
    $('end-stats').innerHTML =
      `English accuracy: <b>${stats.accuracy}%</b> (${stats.correct}/${stats.asked})<br>` +
      `Best streak: <b>${stats.bestStreak}</b> · Zombies defeated: <b>${stats.killed}</b>` +
      (won && scores && stats.accuracy < 90 ? '<br><small>Reach 90% accuracy for 3 stars ⭐</small>' : '');
    // "Next stage" sólo tiene sentido cuando se jugaba una unidad concreta
    $('btn-next').style.display = won && scores && current.stageIdx < current.stages.length - 1 ? '' : 'none';
    $('end-modal').classList.remove('hidden');
  },
};

/* ================= Cards ================= */
function renderCards() {
  const tray = $('card-tray');
  if (!game || !game.cards) return;
  // La bandeja se reconstruye cuando cambia la BARAJA, no sólo cuando cambia su
  // tamaño: al empezar una segunda partida con otras plantas (mismo número de
  // cartas) se quedaban las cartas viejas apuntando a plantas que ya no estaban en
  // la baraja, el render reventaba y con él se caían los avisos de sol y de inicio.
  const deck = game.cards.map(c => c.id).join(',');
  if (tray.dataset.deck !== deck || tray.childElementCount !== game.cards.length) {
    tray.dataset.deck = deck;
    tray.innerHTML = '';
    for (const card of game.cards) {
      const def = PLANTS[card.id];
      const el = document.createElement('div');
      el.className = `plant-card tier-${def.tier}`;
      el.dataset.id = card.id;
      el.title = `${def.name} (${def.tier})`;
      el.innerHTML = `<img class="card-icon" src="${spriteURL(def.sprite)}" alt=""><span class="card-cost">☀️${def.cost}</span><span class="tier-dot"></span><div class="card-cd"></div>`;
      el.addEventListener('click', () => {
        const c = game.cards.find(x => x.id === card.id);
        if (!c || c.cd > 0 || game.sunAmount < def.cost) return;
        SFX.click();
        const already = game.selectedCard === card.id;
        game.selectCard(already ? null : card.id);
        renderCards();
      });
      tray.appendChild(el);
    }
  }
  for (const el of tray.children) {
    const card = game.cards.find(c => c.id === el.dataset.id);
    if (!card) continue;                 // carta huérfana: nunca tumbes el HUD por ella
    const def = PLANTS[card.id];
    el.classList.toggle('selected', game.selectedCard === card.id);
    el.classList.toggle('unaffordable', game.sunAmount < def.cost);
    el.querySelector('.card-cd').style.transform = `scaleY(${card.cd > 0 ? card.cd / def.cooldown : 0})`;
  }
  $('shovel').classList.toggle('selected', game.shovelMode);
}

/* ============ Tablero de selección de plantas (Improve / Shovel) ============ */
// Dibuja el tablero completo (5 filas × 9 columnas) para elegir una planta en su
// fila/columna real. Lo usan tanto el pop-up "Improve" como el de la pala.
function renderPlantBoard({ wrapId, noteId, emptyMsg, hint, decorate, onPick }) {
  const wrap = $(wrapId);
  const note = $(noteId);
  const plants = game.plantsForImprove();
  wrap.innerHTML = '';
  if (!plants.length) {
    wrap.innerHTML = `<div class="improve-empty">${emptyMsg}</div>`;
    if (note) note.textContent = '';
    return;
  }
  const byCell = new Map();
  for (const p of plants) byCell.set(`${p.r},${p.c}`, p);

  const board = document.createElement('div');
  board.className = 'improve-board';
  for (let r = 0; r < ROWS; r++) {
    const line = document.createElement('div');
    line.className = 'ib-row';
    const tag = document.createElement('span');
    tag.className = 'ib-rowlabel';
    tag.textContent = r + 1;           // fila 1..5, para ubicarse rápido
    line.appendChild(tag);
    for (let c = 0; c < COLS; c++) {
      const p = byCell.get(`${r},${c}`);
      const cell = document.createElement('button');
      cell.className = 'ib-cell' + ((r + c) % 2 ? ' alt' : '');
      if (!p) {
        cell.classList.add('empty');
        cell.disabled = true;
        cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}: empty`);
      } else {
        decorate(cell, p, r);
        cell.addEventListener('click', () => onPick(p, note));
      }
      line.appendChild(cell);
    }
    board.appendChild(line);
  }
  wrap.appendChild(board);
  if (note) note.textContent = hint;
}

/* ============ Improve plants pop-up ============ */
function renderImproveList() {
  $('improve-sun').textContent = game.sunAmount | 0;
  renderPlantBoard({
    wrapId: 'improve-list', noteId: 'improve-note',
    emptyMsg: 'No plants on the board yet — plant some first!',
    hint: 'Tap a plant on the board to level it up.',
    decorate(cell, p, r) {
      const affordable = !p.maxed && game.sunAmount >= p.cost;
      cell.classList.add(p.maxed ? 'maxed' : affordable ? 'ready' : 'poor');
      cell.title = p.maxed
        ? `${p.name} — MAX level (row ${r + 1})`
        : `${p.name} — Lv${p.level} → upgrade for ☀️${p.cost} (row ${r + 1})`;
      cell.innerHTML =
        `<img src="${spriteURL(p.sprite)}" alt="${p.name}">` +
        `<span class="ib-lvl">${p.maxed ? 'MAX' : 'Lv' + p.level}</span>` +
        (p.maxed ? '<span class="ib-star">⭐</span>' : `<span class="ib-cost">☀️${p.cost}</span>`);
    },
    async onPick(p, note) {
      if (p.maxed) { if (note) note.textContent = `⭐ ${p.name} is already MAX level.`; return; }
      if (game.sunAmount < p.cost) {
        if (note) note.textContent = `Not enough suns for ${p.name} — you need ☀️${p.cost}.`;
        return;
      }
      SFX.click();
      await game.improvePlant(p.index); // hace la pregunta y, si acierta, sube de nivel
      renderImproveList();               // refresca niveles y soles
    },
  });
}

/* ============ Pala: mismo tablero que "Improve" para quitar una planta ============ */
function renderShovelBoard() {
  renderPlantBoard({
    wrapId: 'shovel-list', noteId: 'shovel-note',
    emptyMsg: 'No plants on the board yet — nothing to dig up!',
    hint: 'Tap a plant on the board to dig it up.',
    decorate(cell, p, r) {
      cell.classList.add('digg');
      cell.title = `${p.name} — Lv${p.level} (row ${r + 1}) · tap to remove`;
      cell.innerHTML =
        `<img src="${spriteURL(p.sprite)}" alt="${p.name}">` +
        `<span class="ib-lvl">${p.maxed ? 'MAX' : 'Lv' + p.level}</span>` +
        '<span class="ib-star">⛏️</span>';
    },
    onPick(p, note) {
      SFX.shovel();
      const name = game.shovelPlant(p.index);
      renderShovelBoard();
      if (note && name) note.textContent = `⛏️ ${name} removed.`;
    },
  });
}

/* ================= Main menu ================= */
function buildMenu() {
  const wrap = $('level-buttons');
  wrap.innerHTML = '';
  for (const lvl of LEVELS) {
    const stages = stagesFor(lvl);
    const prog = store.progress[lvl] || {};
    const done = Object.keys(prog).length;
    const b = document.createElement('button');
    b.className = `level-btn level-${lvl}`;
    b.innerHTML = `${lvl}<small>${LEVEL_NAMES[lvl]}</small><small>${done}/${stages.length} ✔</small>`;
    b.addEventListener('click', () => { SFX.click(); openStages(lvl); });
    wrap.appendChild(b);
  }
  $('btn-tips').textContent = `🇪🇸 Spanish tips: ${tipsES() ? 'ON' : 'OFF'}`;
}

function openStages(level) {
  const stages = stagesFor(level);
  current = { level, levelIdx: LEVELS.indexOf(level), stageIdx: 0, stages, mode: 'classic' };
  $('stages-title').textContent = `Level ${level} — ${LEVEL_NAMES[level]}`;
  const grid = $('stage-grid');
  grid.innerHTML = '';
  const prog = store.progress[level] || {};
  stages.forEach((st, i) => {
    const el = document.createElement('div');
    el.className = 'stage-card';
    const stars = prog[st.unit] || 0;
    el.innerHTML =
      `<div class="stage-num">Stage ${i + 1} · Unit ${st.unit}</div>` +
      `<div class="stage-topics">${st.topics.join(' · ')}</div>` +
      `<div class="stage-stars">${starStr(stars)}</div>`;
    // entrar por una etapa concreta cancela cualquier selección múltiple previa
    el.addEventListener('click', () => {
      SFX.click();
      current.multiUnits = null; current.mixEntries = null;   // vuelve a una unidad concreta
      openPlantSelect(i);
    });
    grid.appendChild(el);
  });
  show('screen-stages');
}

/* ================= Plant loadout picker ================= */
let plantSel = { stageIdx: 0, list: [], chosen: [], max: 8 };
function openPlantSelect(stageIdx) {
  current.stageIdx = stageIdx;
  const list = availablePlants(current.levelIdx, stageIdx);
  plantSel = { stageIdx, list, max: Math.min(list.length, 8), chosen: [] };
  // reutiliza la última selección válida; si no, un set por defecto
  const prev = (current.loadout || []).filter(id => list.includes(id));
  plantSel.chosen = prev.length ? prev.slice(0, plantSel.max) : list.slice(0, Math.min(6, list.length));
  const st = current.stages[stageIdx];
  const multi = current.multiUnits;
  $('plants-title').textContent = current.mixEntries
    ? `Choose your plants — Mix ${current.mixEntries.map(e => e.level).join(' + ')}`
    : multi && multi.length > 1
      ? `Choose your plants — Units ${multi.join(', ')}`
      : `Choose your plants — Unit ${multi ? multi[0] : st.unit}`;
  $('plant-desc').textContent = 'Tap a plant to see what it does.';
  renderPlantSelect();
  renderDifficulty('diff-row', 'diff-desc');
  renderWaves();
  renderQuestionMode();
  renderTopicPicker();
  syncTopicBlock();
  renderStudentUnits();
  renderStudents();
  show('screen-plants');
}

/* ================= Mezcla de niveles CEFR ================= */
// Partida a medida: varios niveles a la vez, con sus unidades y sus temas. La
// selección se guarda como el conjunto de CLAVES de tema ("unidad-clase") por
// nivel; las unidades se deducen de ahí, así que nunca puede quedar incoherente.
let mixSel = {};                 // { A1: Set('1-1','1-2'), ... }
let mixOpen = null;              // qué nivel está desplegado
const levelTopics = (level) => TOPICS[level] || [];
const unitsOf = (level) => [...new Set(levelTopics(level).map(t => t.unit))].sort((a, b) => a - b);
const topicsOfUnit = (level, unit) => levelTopics(level).filter(t => t.unit === unit);
const keyOf = (t) => `${t.unit}-${t.cls}`;
const mixKeys = (level) => mixSel[level] || new Set();
const mixUnits = (level) => [...new Set([...mixKeys(level)].map(k => parseInt(k, 10)))].sort((a, b) => a - b);
// Un nivel está EN la mezcla mientras tenga entrada, aunque de momento no tenga
// ningún tema marcado: así se puede vaciarlo y luego ir eligiendo unidad por unidad.
const mixLevels = () => LEVELS.filter(l => mixSel[l]);
const mixTotal = () => mixLevels().reduce((a, l) => a + mixKeys(l).size, 0);

function openMixPicker() {
  if (!Object.keys(mixSel).length) { mixSel = {}; mixOpen = null; }
  renderMix();
  $('mix-modal').classList.remove('hidden');
}
function toggleMixLevel(level) {
  if (mixSel[level]) { delete mixSel[level]; if (mixOpen === level) mixOpen = null; }
  else { mixSel[level] = new Set(levelTopics(level).map(keyOf)); mixOpen = level; }
}
// Ni quitar una unidad ni quitar un tema sacan el nivel de la mezcla: el nivel
// sólo se apaga desde su botón de arriba.
function toggleMixUnit(level, unit) {
  const set = mixSel[level] || (mixSel[level] = new Set());
  const keys = topicsOfUnit(level, unit).map(keyOf);
  const allOn = keys.every(k => set.has(k));
  for (const k of keys) allOn ? set.delete(k) : set.add(k);
}
function toggleMixTopic(level, key) {
  const set = mixSel[level] || (mixSel[level] = new Set());
  set.has(key) ? set.delete(key) : set.add(key);
}

function renderMix() {
  // fila de niveles
  const row = $('mix-levels');
  row.innerHTML = '';
  for (const l of LEVELS) {
    const on = !!mixSel[l];
    const b = document.createElement('button');
    b.className = `mix-lvl lvl-${l}${on ? ' selected' : ''}${mixOpen === l ? ' open' : ''}`;
    b.innerHTML = `<b>${l}</b><span>${on ? `${mixUnits(l).length} units` : 'off'}</span>`;
    b.addEventListener('click', () => { SFX.click(); toggleMixLevel(l); renderMix(); });
    row.appendChild(b);
  }
  // cuerpo: unidades y temas del nivel desplegado
  const body = $('mix-body');
  body.innerHTML = '';
  const active = mixLevels();
  if (!active.length) {
    body.innerHTML = '<p class="mix-empty">Tap a level above to add it to the mix.</p>';
  } else {
    // pestañas para elegir qué nivel se está detallando
    if (active.length > 1 || !mixOpen) {
      const tabs = document.createElement('div');
      tabs.className = 'mix-tabs';
      for (const l of active) {
        const t = document.createElement('button');
        t.className = `mix-tab${mixOpen === l ? ' selected' : ''}`;
        t.textContent = l;
        t.addEventListener('click', () => { SFX.click(); mixOpen = l; renderMix(); });
        tabs.appendChild(t);
      }
      body.appendChild(tabs);
    }
    if (!mixOpen || !mixSel[mixOpen]) mixOpen = active[0];
    const level = mixOpen;
    const head = document.createElement('div');
    head.className = 'mix-head';
    head.innerHTML = `<span>Units of ${level}</span>`;
    const all = document.createElement('button');
    all.className = 'mix-mini'; all.textContent = 'All';
    all.addEventListener('click', () => { SFX.click(); mixSel[level] = new Set(levelTopics(level).map(keyOf)); renderMix(); });
    const none = document.createElement('button');
    none.className = 'mix-mini'; none.textContent = 'None';
    // vacía los temas pero deja el nivel dentro, para elegir unidades a mano
    none.addEventListener('click', () => { SFX.click(); mixSel[level] = new Set(); renderMix(); });
    head.append(all, none);
    body.appendChild(head);

    const list = document.createElement('div');
    list.className = 'mix-units';
    for (const u of unitsOf(level)) {
      const topics = topicsOfUnit(level, u);
      const keys = topics.map(keyOf);
      const on = keys.filter(k => mixKeys(level).has(k)).length;
      const wrap = document.createElement('div');
      wrap.className = `mix-unit${on ? ' selected' : ''}`;
      const btn = document.createElement('button');
      btn.className = 'mix-unit-head';
      btn.innerHTML = `<span class="mu-box">${on === keys.length ? '✓' : on ? '–' : ''}</span>` +
        `<span class="mu-n">Unit ${u}</span><span class="mu-c">${on}/${keys.length} topics</span>`;
      btn.addEventListener('click', () => { SFX.click(); toggleMixUnit(level, u); renderMix(); });
      wrap.appendChild(btn);
      if (on) {
        const tw = document.createElement('div');
        tw.className = 'mix-topics';
        for (const t of topics) {
          const k = keyOf(t);
          const sel = mixKeys(level).has(k);
          const c = document.createElement('button');
          c.className = `mix-topic${sel ? ' selected' : ''}`;
          c.textContent = t.topic.slice(0, 48);
          c.title = t.topic;
          c.addEventListener('click', () => { SFX.click(); toggleMixTopic(level, k); renderMix(); });
          tw.appendChild(c);
        }
        wrap.appendChild(tw);
      }
      list.appendChild(wrap);
    }
    body.appendChild(list);
  }
  const levels = mixLevels();
  const topics = mixTotal();
  const withTopics = levels.filter(l => mixKeys(l).size);
  $('mix-note').textContent = !levels.length
    ? 'Nothing selected yet.'
    : !topics
      ? 'No topics ticked yet — open a unit to add some.'
      : `${withTopics.join(' + ')} · ${withTopics.reduce((a, l) => a + mixUnits(l).length, 0)} units · ${topics} topics.`;
  $('btn-mix-play').disabled = topics === 0;
}

// Arranca la partida a medida: el nivel más alto manda para el arsenal de plantas.
function playMix() {
  // sólo entran los niveles que realmente aportan temas
  const levels = mixLevels().filter(l => mixKeys(l).size);
  if (!levels.length) return;
  $('mix-modal').classList.add('hidden');
  const top = levels[levels.length - 1];
  const stages = stagesFor(top);
  const topUnit = Math.max(...mixUnits(top));
  const stageIdx = Math.max(0, stages.findIndex(s => s.unit === topUnit));
  current = {
    level: top, levelIdx: LEVELS.indexOf(top), stages, stageIdx, mode: 'classic',
    multiUnits: null,
    mixEntries: levels.map(l => ({ level: l, topicKeys: [...mixKeys(l)], units: mixUnits(l) })),
  };
  openPlantSelect(stageIdx);
}

/* ================= Selección múltiple de unidades ================= */
// Permite jugar un nivel con VARIAS unidades a la vez en lugar de una sola etapa.
// Se entra desde el botón junto a "← Menu" y se configura el resto de la partida
// en la pantalla de plantas de siempre.
let unitPick = [];
function openUnitPicker() {
  const units = current.stages.map(s => s.unit);
  // por defecto, las unidades que el jugador ya tiene desbloqueadas o la primera
  if (!unitPick.length) unitPick = units.slice(0, Math.min(3, units.length));
  renderUnitPicker();
  $('units-modal').classList.remove('hidden');
}
function renderUnitPicker() {
  const grid = $('units-grid');
  grid.innerHTML = '';
  current.stages.forEach((st) => {
    const on = unitPick.includes(st.unit);
    const b = document.createElement('button');
    b.className = `unit-chip${on ? ' selected' : ''}`;
    b.innerHTML = `<span class="uc-n">${st.unit}</span><span class="uc-t">${st.topics[0].slice(0, 34)}</span>`;
    b.title = st.topics.join(' · ');
    b.addEventListener('click', () => {
      SFX.click();
      const i = unitPick.indexOf(st.unit);
      if (i >= 0) unitPick.splice(i, 1); else unitPick.push(st.unit);
      renderUnitPicker();
    });
    grid.appendChild(b);
  });
  const n = unitPick.length;
  $('units-note').textContent = n === 0
    ? 'Pick at least one unit to play.'
    : n === 1
      ? `Unit ${unitPick[0]} only.`
      : `${n} units: ${unitPick.slice().sort((a, b) => a - b).join(', ')}.`;
  $('btn-units-play').disabled = n === 0;
}
// Al continuar se abre el selector de plantas de siempre, pero la partida se
// marcará como "multi-unidad": las preguntas saldrán sólo de lo elegido.
function playPickedUnits() {
  const picked = unitPick.slice().sort((a, b) => a - b);
  if (!picked.length) return;
  $('units-modal').classList.add('hidden');
  // las plantas disponibles se calculan con la unidad más alta elegida
  const top = current.stages.findIndex(s => s.unit === picked[picked.length - 1]);
  current.multiUnits = picked;
  current.mixEntries = null;   // una cosa o la otra, no ambas
  openPlantSelect(Math.max(0, top));
}

/* ---------- Modo de preguntas: gramática, vocabulario o mixto ---------- */
// Se recuerda entre partidas, igual que la dificultad. En vocabulario puro no tiene
// sentido elegir temas de gramática, así que ese bloque se oculta.
function renderQuestionMode(rowId = 'qmode-row', descId = 'qmode-desc') {
  const row = $(rowId);
  if (!row) return;
  const cur = questionMode();
  row.innerHTML = '';
  for (const id of MODES) {
    const info = MODE_INFO[id];
    const b = document.createElement('button');
    b.className = `diff-btn qmode-${id}` + (id === cur ? ' selected' : '');
    b.innerHTML = `<span class="db-emoji">${info.emoji}</span><span class="db-name">${info.name}</span>`;
    b.addEventListener('click', () => {
      SFX.click();
      setQuestionMode(id);
      renderQuestionMode(rowId, descId);
      syncTopicBlock();
    });
    row.appendChild(b);
  }
  const desc = $(descId);
  if (desc) desc.textContent = MODE_INFO[cur].desc;
}
// El selector de temas sólo aplica a la gramática de UNA unidad: no tiene sentido
// en vocabulario puro ni cuando se juegan varias unidades a la vez.
function syncTopicBlock() {
  const block = document.querySelector('.topic-block');
  const multi = current?.multiUnits;
  // en una mezcla los temas ya se eligieron en su propio panel
  const hide = questionMode() === 'vocab' || (multi && multi.length > 1) || !!current?.mixEntries;
  if (block) block.style.display = hide ? 'none' : '';
}

/* ---------- Temas de gramática de la unidad ---------- */
// Cada unidad del programa trae 2–3 clases (temas). Aquí se eligen cuáles entran
// en la batalla; por defecto entran todos. La clave es `unidad-clase`, la misma
// que usan los bancos de preguntas.
let topicSel = { keys: [], chosen: [] };
function unitTopics(stageIdx) {
  const st = current.stages[stageIdx];
  return TOPICS[current.level]
    .filter(t => t.unit === st.unit)
    .map(t => ({ key: `${t.unit}-${t.cls}`, topic: t.topic }));
}
function renderTopicPicker() {
  const row = $('topic-row');
  if (!row) return;
  const list = unitTopics(plantSel.stageIdx);
  // al cambiar de unidad se reinicia la selección a "todos"
  const keys = list.map(t => t.key);
  if (topicSel.keys.join() !== keys.join()) topicSel = { keys, chosen: keys.slice() };
  row.innerHTML = '';
  for (const t of list) {
    const b = document.createElement('button');
    const on = topicSel.chosen.includes(t.key);
    b.className = `topic-btn${on ? ' selected' : ''}`;
    b.innerHTML = `<span class="tb-check">${on ? '✓' : '＋'}</span><span>${t.topic}</span>`;
    b.addEventListener('click', () => {
      SFX.click();
      const i = topicSel.chosen.indexOf(t.key);
      // nunca se quedan cero temas: el último seleccionado no se puede quitar
      if (i >= 0) { if (topicSel.chosen.length > 1) topicSel.chosen.splice(i, 1); }
      else topicSel.chosen.push(t.key);
      renderTopicPicker();
    });
    row.appendChild(b);
  }
  const n = topicSel.chosen.length, total = list.length;
  $('topic-desc').textContent = !total
    ? 'This unit has no separate topics — questions cover the whole unit.'
    : n === total
      ? `All ${total} topics of the unit are in play.`
      : `Only ${n} of ${total} topics — the rest of the unit stays out of this battle.`;
}

/* ---------- Lista de la clase ---------- */
// Alumnos a los que se dirigen las preguntas por turnos. Cada uno puede llevar su
// propia unidad asignada, para que practique justo lo suyo dentro de la partida.
let students = [];
function renderStudentUnits() {
  const sel = $('student-unit');
  if (!sel) return;
  const units = current.stages.map(s => s.unit);
  sel.innerHTML = '<option value="">Match unit</option>' +
    units.map(u => `<option value="${u}">Unit ${u}</option>`).join('');
}
function renderStudents() {
  const box = $('student-list');
  if (!box) return;
  if (!students.length) {
    box.innerHTML = '<span class="slot-empty">No students yet — questions go to whoever is playing.</span>';
    return;
  }
  box.innerHTML = '';
  students.forEach((s, i) => {
    const chip = document.createElement('span');
    chip.className = 'student-chip';
    chip.innerHTML = `<b>${s.name}</b>${s.unit ? `<i>Unit ${s.unit}</i>` : ''}<button class="sc-x" title="Remove">✕</button>`;
    chip.querySelector('.sc-x').addEventListener('click', () => {
      SFX.click();
      students.splice(i, 1);
      renderStudents();
    });
    box.appendChild(chip);
  });
}
function addStudent() {
  const input = $('student-name');
  const name = (input.value || '').trim();
  if (!name) return;
  if (students.length >= 40) return;
  const unit = parseInt($('student-unit').value, 10);
  students.push({ name, unit: Number.isFinite(unit) ? unit : null });
  input.value = '';
  renderStudents();
}

function renderPlantSelect() {
  const grid = $('plants-grid');
  grid.innerHTML = '';
  for (const id of plantSel.list) {
    const def = PLANTS[id];
    const chosen = plantSel.chosen.includes(id);
    const el = document.createElement('div');
    el.className = `plant-pick tier-${def.tier}${chosen ? ' chosen' : ''}`;
    el.innerHTML =
      `<img src="${spriteURL(def.sprite)}" alt=""><span class="pp-name">${def.name}</span>` +
      `<span class="pp-cost">☀️${def.cost}</span>${chosen ? '<span class="pp-check">✓</span>' : ''}`;
    el.addEventListener('click', () => {
      SFX.click();
      $('plant-desc').innerHTML = `<b>${def.name}</b> · ☀️${def.cost} — ${PLANT_DESC[id] || ''}`;
      const i = plantSel.chosen.indexOf(id);
      if (i >= 0) plantSel.chosen.splice(i, 1);
      else if (plantSel.chosen.length < plantSel.max) plantSel.chosen.push(id);
      else { hooks.onStreak?.(`You can bring up to ${plantSel.max} plants`); }
      renderPlantSelect();
    });
    grid.appendChild(el);
  }
  // fila de seleccionadas
  const slots = $('plants-slots');
  slots.innerHTML = plantSel.chosen.length
    ? plantSel.chosen.map(id => `<div class="slot tier-${PLANTS[id].tier}"><img src="${spriteURL(PLANTS[id].sprite)}" alt="" title="${PLANTS[id].name}"></div>`).join('')
    : '<span class="slot-empty">No plants selected yet — tap some below!</span>';
  $('btn-plants-start').disabled = plantSel.chosen.length === 0;
}

/* ================= Difficulty ================= */
// La dificultad se elige ANTES de cada batalla y se recuerda entre partidas.
const difficulty = () => (DIFFICULTIES[localStorage.getItem('ed:difficulty')] ? localStorage.getItem('ed:difficulty') : DEFAULT_DIFFICULTY);

function renderDifficulty(rowId, descId) {
  const row = $(rowId);
  const desc = $(descId);
  if (!row) return;
  const cur = difficulty();
  row.innerHTML = '';
  for (const [id, d] of Object.entries(DIFFICULTIES)) {
    const b = document.createElement('button');
    b.className = `diff-btn diff-${id}` + (id === cur ? ' selected' : '');
    b.innerHTML = `<span class="db-emoji">${d.emoji}</span><span class="db-name">${d.name}</span>` +
      `<span class="db-stars">${'★'.repeat(d.star)}${'☆'.repeat(4 - d.star)}</span>`;
    b.addEventListener('click', () => {
      SFX.click();
      localStorage.setItem('ed:difficulty', id);
      renderDifficulty(rowId, descId);
    });
    row.appendChild(b);
  }
  if (desc) desc.textContent = DIFFICULTIES[cur].desc;
}

/* ================= Audio toggles (portada + HUD) ================= */
function syncAudioButtons() {
  const music = musicWanted(), sound = !isMuted();
  const hudMusic = $('btn-music'), hudSound = $('btn-mute');
  if (hudMusic) { hudMusic.textContent = music ? '🎵' : '🎵̸'; hudMusic.style.opacity = music ? '1' : '0.5'; }
  if (hudSound) hudSound.textContent = sound ? '🔊' : '🔇';
  const mMusic = $('btn-menu-music'), mSound = $('btn-menu-sound');
  if (mMusic) { mMusic.textContent = `🎵 Music: ${music ? 'ON' : 'OFF'}`; mMusic.classList.toggle('off', !music); }
  if (mSound) { mSound.textContent = `${sound ? '🔊' : '🔇'} Sound: ${sound ? 'ON' : 'OFF'}`; mSound.classList.toggle('off', !sound); }
}

/* ================= Waves per match ================= */
// Cuántas oleadas durará la batalla (1–10). Se elige antes de jugar y se recuerda.
const WAVES_DEFAULT = 5;
const waveChoice = () => {
  const n = parseInt(localStorage.getItem('ed:waves'), 10);
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : WAVES_DEFAULT;
};
function renderWaves() {
  const range = $('wave-range');
  if (!range) return;
  const n = waveChoice();
  range.value = n;
  $('wave-count').textContent = n;
  $('wave-desc').textContent = n === 1
    ? 'A single wave — a quick skirmish.'
    : n <= 3 ? `${n} waves — a short battle.`
    : n <= 6 ? `${n} waves — a standard battle.`
    : `${n} waves — a long siege. The last ones are the toughest.`;
}

/* ================= Almanac ================= */
// Estado del almanaque: qué pestaña se ve, qué ficha está abierta y en qué nivel
// de evolución se está mirando esa planta.
const almanac = { kind: 'plants', open: null, level: 1 };

function openAlmanac(kind = 'plants') {
  almanac.kind = kind;
  almanac.open = null;
  for (const b of document.querySelectorAll('.almanac-tab')) b.classList.remove('selected');
  $(kind === 'plants' ? 'alm-tab-plants' : 'alm-tab-zombies').classList.add('selected');
  const listEl = $('almanac-list');
  listEl.innerHTML = '';
  // Álbum de cromos: cada ficha es una carta con el dibujo arriba y su información debajo.
  listEl.className = 'almanac-album';
  if (kind === 'plants') {
    for (const [id, def] of Object.entries(PLANTS)) {
      listEl.appendChild(almanacCard(id, def.sprite, def.name, PLANT_DESC[id] || '', `tier-${def.tier}`, `☀️${def.cost}`));
    }
  } else {
    for (const [id, info] of Object.entries(ZOMBIE_INFO)) {
      listEl.appendChild(almanacCard(id, info.sprite, info.name, info.desc, 'zcard', ''));
    }
  }
  showAlmanacDetail(null);
  $('almanac-modal').classList.remove('hidden');
}
// Cromo del álbum: marco, ilustración centrada y ficha de texto debajo.
// Al tocarlo se abre la ficha técnica completa (daño, vida, alcance, mejoras…).
function almanacCard(id, sprite, title, desc, cls, tag) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `alm-card ${cls || ''}`;
  card.innerHTML =
    `<div class="alm-art"><img src="${spriteURL(sprite)}" alt="${title}" loading="lazy">` +
    (tag ? `<span class="alm-tag">${tag}</span>` : '') + '</div>' +
    `<div class="alm-info"><b>${title}</b><span>${desc}</span>` +
    '<span class="alm-more">📊 Tap for stats</span></div>';
  card.addEventListener('click', () => { SFX.click(); almanac.level = 1; showAlmanacDetail(id); });
  return card;
}

/* ---------- Ficha técnica ---------- */
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
// Barra comparativa: este dato frente al mejor del reparto (siempre medido al
// nivel MAX, así la barra CRECE al cambiar de Lv1 a MAX). Se comprime con una
// raíz cuadrada porque el Tall-Nut o el jefe aplastarían al resto en escala lineal.
function statBar(label, text, value, max, cls = '') {
  const pct = max > 0 ? Math.max(3, Math.min(100, Math.round(Math.sqrt(value / max) * 100))) : 0;
  return `<div class="alm-stat ${cls}"><span class="as-label">${label}</span>` +
    `<span class="as-bar"><i style="width:${pct}%"></i></span>` +
    `<span class="as-val">${text}</span></div>`;
}
// Dato sin barra (alcance, objetivos, recarga…).
function statLine(label, text) {
  return `<div class="alm-line"><span>${label}</span><b>${text}</b></div>`;
}
// Techos del reparto (con todas las plantas al máximo), para escalar las barras.
let _plantMax = null;
function plantMaxima() {
  if (_plantMax) return _plantMax;
  const m = { hp: 1, burst: 1, dps: 1, sun: 1 };
  for (const id of Object.keys(PLANTS)) {
    const s = plantStats(id, MAX_PLANT_LEVEL);
    m.hp = Math.max(m.hp, s.hp);
    if (s.dmg) m.burst = Math.max(m.burst, s.dmg * (s.shots || 1));
    if (s.dps) m.dps = Math.max(m.dps, s.dps);
    if (s.groundDps) m.dps = Math.max(m.dps, s.groundDps);
    if (s.biteDmg) m.burst = Math.max(m.burst, s.biteDmg);
    if (s.sun) m.sun = Math.max(m.sun, s.sun);
  }
  return (_plantMax = m);
}
let _zombieMax = null;
function zombieMaxima() {
  if (_zombieMax) return _zombieMax;
  const m = { hp: 1, speed: 0.1, dmg: 1 };
  for (const id of Object.keys(ZOMBIE_INFO)) {
    const s = zombieStats(id);
    m.hp = Math.max(m.hp, s.hp); m.speed = Math.max(m.speed, s.speed); m.dmg = Math.max(m.dmg, s.dmg);
  }
  return (_zombieMax = m);
}

// Abre (id) o cierra (null) la ficha técnica dentro del propio almanaque.
function showAlmanacDetail(id) {
  almanac.open = id;
  const box = $('almanac-detail');
  const listEl = $('almanac-list');
  if (!id) {
    box.classList.add('hidden');
    box.innerHTML = '';
    listEl.classList.remove('hidden');
    return;
  }
  box.innerHTML = almanac.kind === 'plants' ? plantSheet(id) : zombieSheet(id);
  listEl.classList.add('hidden');
  box.classList.remove('hidden');
  box.scrollTop = 0;
  box.querySelector('.alm-back')?.addEventListener('click', () => { SFX.click(); showAlmanacDetail(null); });
  for (const b of box.querySelectorAll('.alm-lvl-btn')) {
    b.addEventListener('click', () => {
      SFX.click();
      almanac.level = parseInt(b.dataset.level, 10);
      showAlmanacDetail(id);
    });
  }
}

const TIER_LABEL = { basic: 'Basic · A1', silver: 'Silver · A2', golden: 'Golden · B1', platinum: 'Platinum · B2', diamond: 'Diamond · C1' };

// Qué gana esta planta concreta al evolucionar (un muro no gana disparos).
function upgradeNote(s) {
  const gains = [`×${EVOLVE.hp} health`];
  if (s.dmg) gains.push(`×${EVOLVE.dmg} damage per shot`, '+1 shot per burst', 'faster fire');
  if (s.groundDps || s.biteDmg) gains.push(`×${EVOLVE.dmg} damage`);
  if (s.sun) gains.push('more sun, made more often');
  if (s.slowDur) gains.push('a longer freeze');
  if (s.blastDmg) gains.push('but the same blast damage');
  return `Each level: ${gains.join(', ')}.`;
}

function plantSheet(id) {
  const s = plantStats(id, almanac.level);
  const max = plantMaxima();
  const lvlTag = s.level >= MAX_PLANT_LEVEL ? 'MAX ⭐' : `Lv${s.level}`;

  let bars = statBar('Health', fmt(s.hp), s.hp, max.hp, 'hp');
  if (s.dmg) {
    bars += statBar('Damage', `${fmt(s.dmg)}${s.shots > 1 ? ` ×${s.shots}` : ''}`, s.dmg * (s.shots > 1 ? s.shots : 1), max.burst, 'dmg');
    bars += statBar('Damage / second', fmt(s.dps, 1), s.dps, max.dps, 'dps');
  }
  if (s.sun) bars += statBar('Sun made', `☀️${fmt(s.sun)}`, s.sun, max.sun, 'sun');
  if (s.groundDps) bars += statBar('Damage / second', fmt(s.groundDps, 1), s.groundDps, max.dps, 'dps');
  if (s.biteDmg) bars += statBar('Bite damage', fmt(s.biteDmg), s.biteDmg, max.burst, 'dmg');

  let lines = statLine('Range', s.range) + statLine('Hits', s.targets);
  // el pelotazo de bomba/mina no escala con el nivel: va como dato, no como barra
  if (s.blastDmg) lines += statLine('Blast damage', `${fmt(s.blastDmg)} — enough for any zombie`);
  if (s.interval) lines += statLine('Fire rate', `every ${fmt(s.interval, 2)} s${s.shots > 1 ? ` (${s.shots} shots)` : ''}`);
  if (s.sunEvery) lines += statLine('Sun rate', `every ~${fmt(s.sunEvery, 1)} s`);
  if (s.armTime) lines += statLine('Arming time', `${s.armTime} s`);
  lines += statLine('Seed cost', `☀️${s.cost}`) + statLine('Recharge', `${s.recharge} s`);

  const traits = s.traits.length
    ? `<ul class="alm-traits">${s.traits.map(t => `<li>${t}</li>`).join('')}</ul>` : '';

  // Tabla de evolución: los tres niveles de un vistazo, con lo que cuesta subir.
  const rows = [1, 2, 3].map(l => {
    const st = plantStats(id, l);
    const up = st.upgradeCost != null ? `☀️${st.upgradeCost}` : '—';
    const atk = st.dmg ? `${fmt(st.dmg)}${st.shots > 1 ? ` ×${st.shots}` : ''}`
      : st.sun ? `☀️${st.sun}` : st.groundDps ? fmt(st.groundDps) : st.blastDmg ? fmt(st.blastDmg) : '—';
    return `<tr class="${l === s.level ? 'now' : ''}">` +
      `<td>${l >= MAX_PLANT_LEVEL ? 'MAX ⭐' : `Lv${l}`}</td><td>${fmt(st.hp)}</td><td>${atk}</td>` +
      `<td>${st.interval ? `${fmt(st.interval, 2)} s` : '—'}</td><td>${up}</td></tr>`;
  }).join('');

  return `<div class="alm-sheet">
    <div class="alm-sheet-head">
      <button type="button" class="wood-btn small alm-back">← Back</button>
      <div class="alm-hero tier-${s.tier}"><img src="${spriteURL(s.sprite)}" alt="${s.name}"></div>
      <div class="alm-title">
        <h3>${s.name}</h3>
        <div class="alm-chips"><span class="chip tier-${s.tier}">${TIER_LABEL[s.tier] || s.tier}</span>
          <span class="chip">☀️${s.cost}</span><span class="chip lvl">${lvlTag}</span></div>
        <p>${s.desc}</p>
      </div>
    </div>
    <div class="alm-lvls">
      <span>Show stats at:</span>
      ${[1, 2, 3].map(l => `<button type="button" class="alm-lvl-btn${l === s.level ? ' on' : ''}" data-level="${l}">${l >= MAX_PLANT_LEVEL ? 'MAX ⭐' : `Lv${l}`}</button>`).join('')}
    </div>
    <div class="alm-stats">${bars}</div>
    <div class="alm-lines">${lines}</div>
    ${traits}
    <h4>⬆️ Upgrades — answer a question and pay sun to evolve</h4>
    <table class="alm-table">
      <thead><tr><th>Level</th><th>Health</th><th>Attack</th><th>Every</th><th>Upgrade</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="alm-note">Tap a planted ${s.name} in battle (or use 🔧 Improve) to evolve it. ${upgradeNote(s)}</p>
  </div>`;
}

function zombieSheet(id) {
  const s = zombieStats(id);
  const max = zombieMaxima();
  const bars = statBar('Health', fmt(s.hp), s.hp, max.hp, 'hp')
    + statBar('Speed', `${fmt(s.speed, 2)} tiles/s`, s.speed, max.speed, 'spd')
    + statBar('Bite damage', `${fmt(s.dmg)} /s`, s.dmg, max.dmg, 'dmg');
  const lines = statLine('Attack', s.range)
    + statLine('Lanes eaten', s.lanes === 2 ? '2 at once' : '1')
    + statLine('Crosses the garden in', `~${fmt(s.crossTime, 0)} s`);
  const traits = s.traits.length
    ? `<ul class="alm-traits">${s.traits.map(t => `<li>${t}</li>`).join('')}</ul>` : '';
  return `<div class="alm-sheet">
    <div class="alm-sheet-head">
      <button type="button" class="wood-btn small alm-back">← Back</button>
      <div class="alm-hero zcard"><img src="${spriteURL(s.sprite)}" alt="${s.name}"></div>
      <div class="alm-title">
        <h3>${s.name}</h3>
        <div class="alm-chips"><span class="chip zchip">🧟 Zombie</span>
          <span class="chip">❤️ ${fmt(s.hp)}</span></div>
        <p>${s.desc}</p>
      </div>
    </div>
    <div class="alm-stats">${bars}</div>
    <div class="alm-lines">${lines}</div>
    ${traits}
    <p class="alm-note">Speed and health also change with the difficulty you pick before the battle.</p>
  </div>`;
}

function startStage(stageIdx, mode = 'classic', opts = {}) {
  current.stageIdx = stageIdx;
  current.mode = mode;
  const st = current.stages[stageIdx];
  const isClassic = mode === 'classic';
  // en los minijuegos se repasa todo el nivel; en clásico entran sólo los temas
  // de gramática elegidos y la clase a la que se dirigen las preguntas.
  // El modo (gramática / vocabulario / mixto) vale para ambos, y si se eligieron
  // varias unidades a mano, la partida sale exactamente de esas.
  const multi = isClassic ? current.multiUnits : null;
  const mixEntries = isClassic ? current.mixEntries : null;
  if (mixEntries) quiz.setMix(mixEntries, opts.qmode || questionMode());
  else quiz.setStage(current.level, isClassic ? st.unit : 999,
    isClassic && !multi ? topicSel.chosen : null,
    opts.qmode || questionMode(), multi);
  // Con pantalla central, la clase conectada ES la lista de alumnos y las preguntas
  // salen por la red; si no, se usa la lista local escrita a mano.
  if (classTurnsActive && isClassic) {
    quiz.setStudents(turnStudents());
    quiz.setRemote(turnsTransport);
  } else {
    quiz.setStudents(isClassic ? students : []);
    quiz.setRemote(null);
  }
  const dif = DIFFICULTIES[opts.difficulty || difficulty()];
  $('topic-banner').textContent = !isClassic
    ? `${current.level} · ${mode === 'vase' ? 'Vase Breaker' : 'Spud Bowling'} — full level review`
    : mixEntries
      ? `🧩 Mix · ${mixEntries.map(e => e.level).join(' + ')} · ${mixEntries.reduce((a, e) => a + e.topicKeys.length, 0)} topics`
      : multi && multi.length > 1
        ? `${current.level} · Units ${multi.join(', ')}`
        : `${current.level} · Unit ${st.unit} — ${st.topics[0].slice(0, 46)}`;
  // insignia propia: el banner de tema se recorta y se comía la dificultad
  const badge = $('diff-badge');
  badge.textContent = `${dif.emoji} ${dif.name}`;
  badge.className = `diff-badge diff-${opts.difficulty || difficulty()}`;
  show(null);
  $('hud').classList.remove('hidden');
  $('end-modal').classList.add('hidden');
  $('sun-panel').classList.toggle('hidden', !isClassic);
  $('shovel').style.display = isClassic ? '' : 'none';
  $('btn-improve').style.display = isClassic ? '' : 'none';
  $('ammo-panel').classList.toggle('hidden', mode !== 'bowling');
  game.startStage({
    level: current.level,
    levelIdx: current.levelIdx,
    unit: st.unit,
    stageIdx,
    mode,
    endless: !!opts.endless,   // Class Mode: oleadas infinitas hasta el tiempo o el docente
    loadout: mode === 'classic' ? current.loadout : null, // plantas elegidas por el jugador
    difficulty: opts.difficulty || difficulty(),          // Easy / Medium / Hard / Extreme
    waves: opts.waves || waveChoice(),                    // cuántas oleadas dura la batalla
  });
  // ECYR: a battle begins. Teacher-led sessions (Class Mode host, endless) are not graded.
  window.ECYRBridge && window.ECYRBridge.start({
    level: current.level,
    unit: isClassic && !mixEntries && !(multi && multi.length > 1) ? st.unit : undefined,
    mode: classHost || classTurnsActive || opts.endless || (isClassic && students.length) ? 'class' : 'solo',
    meta: { gameMode: mode, difficulty: opts.difficulty || difficulty(), waves: opts.waves || waveChoice() },
  });
  renderCards();
}

function quitToMenu() {
  game.quitToMenu();
  stopClass();
  $('hud').classList.add('hidden');
  $('end-modal').classList.add('hidden');
  $('pause-modal').classList.add('hidden');
  // restaura botones del modal de fin que Class Mode oculta
  $('btn-retry').style.display = '';
  buildMenu();
  show('screen-menu');
}

/* ================= Class Mode (multiplayer) ================= */
/* ---------- Cómo juega la clase ----------
   'own'   — el modo de siempre: cada alumno juega SU partida en su dispositivo.
   'turns' — pantalla central: el juego corre en el proyector y los alumnos sólo
             responden por turnos desde el móvil. */
let classPlayMode = 'own';
const CLASS_MODES = {
  own:   { emoji: '📱', name: 'Each on their phone', desc: 'The classic mode: every student plays their own battle and a live scoreboard ranks them.' },
  turns: { emoji: '🖥️', name: 'Big screen, by turns', desc: 'The game runs here (project this screen). Questions pop up on the students\' phones, one turn each.' },
};
let classAssign = {};   // { nombreAlumno: unidad|null } en el modo por turnos

let classHost = null, classClient = null, classTimer = null, classLevel = 'A1', className = 'Teacher';
let classMinutes = 0, classDeadline = 0, classCountdown = null;

function myStat() {
  return {
    sun: game.sunAmount | 0, killed: game.killed | 0,
    correct: quiz.stats.correct | 0, asked: quiz.stats.asked | 0,
    state: game.state,
  };
}

function classTimeLeft() {
  if (!classDeadline) return '';
  const s = Math.max(Math.round((classDeadline - Date.now()) / 1000), 0);
  return `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderClassBoard(rows) {
  const el = $('class-board');
  el.classList.remove('hidden');
  const icon = (s) => s === 'won' ? '🏆' : s === 'lost' ? '💀' : '⚔️';
  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '·';
  el.innerHTML =
    `<div class="row head"><b>👥 CLASS BATTLE</b><span>${classTimeLeft()}</span></div>` +
    rows.map((r, i) => {
      const acc = r.asked ? Math.round((r.correct / r.asked) * 100) : 0;
      const me = r.name.startsWith('⭐') || r.name === className;
      return `<div class="prow${me ? ' me' : ''}">` +
        `<span class="nm">${medal(i)} ${icon(r.state)} ${r.name}</span>` +
        `<span class="sc">🧟${r.killed} · ${acc}%</span>` +
        `<div class="pbar"><div class="pfill" style="width:${acc}%"></div></div>` +
        `</div>`;
    }).join('');
}

function startClassBattle(level, minutes = 0) {
  $('class-modal').classList.add('hidden');
  const stages = stagesFor(level);
  current = { level, levelIdx: LEVELS.indexOf(level), stageIdx: 4, stages, mode: 'classic' };
  startStage(4, 'classic', { endless: true });
  // en batalla de clase se pregunta de todo el nivel; los nombres de la lista local
  // no aplican aquí (cada estudiante juega en su propio dispositivo)
  quiz.setStage(level, 999, null, questionMode());
  quiz.setStudents([]);
  $('topic-banner').textContent = `👥 Class Battle — Level ${level} (full review)`;
  // controles en pantalla según el rol
  $('btn-class-end').classList.toggle('hidden', !classHost);
  $('btn-class-leave').classList.toggle('hidden', !classClient);
  clearInterval(classTimer);
  classTimer = setInterval(() => {
    if (!game) return;
    if (classHost) renderClassBoard(classHost.board(className, myStat()));
    else if (classClient) classClient.sendStat(myStat());
  }, 2000);
  // límite de tiempo fijado por el docente
  clearInterval(classCountdown);
  classDeadline = minutes > 0 ? Date.now() + minutes * 60000 : 0;
  if (classDeadline) {
    classCountdown = setInterval(() => {
      const head = document.querySelector('#class-board .head span');
      if (head) head.textContent = classTimeLeft();
      if (Date.now() >= classDeadline) {
        clearInterval(classCountdown);
        if (classHost) endClassGame();      // el docente cierra la sesión para todos
        else game.timeUp();
      }
    }, 500);
  }
}

// El docente termina la partida para toda la clase y muestra el ranking final.
function endClassGame() {
  if (!classHost) return;
  const rows = classHost.board(className, myStat());
  classHost.end(rows);
  showClassResults(rows, true);
}

function showClassResults(rows, isHost) {
  clearInterval(classTimer); classTimer = null;
  clearInterval(classCountdown); classCountdown = null;
  if (game) game.pause();
  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
  $('end-title').textContent = '🏁 Class results';
  if (isHost && window.ECYRBridge) window.ECYRBridge.end({ mode: 'class', meta: { players: rows.length } });
  $('end-stars').textContent = '👥';
  $('end-stats').innerHTML = rows.map((r, i) => {
    const acc = r.asked ? Math.round((r.correct / r.asked) * 100) : 0;
    return `<div style="text-align:left">${medal(i)} <b>${r.name}</b> — 🧟 ${r.killed} · ${acc}%</div>`;
  }).join('');
  $('btn-next').style.display = 'none';
  $('btn-retry').style.display = 'none';
  $('end-modal').classList.remove('hidden');
}

function openClassHost() {
  className = 'Teacher';
  $('class-modal').classList.remove('hidden');
  $('class-host').classList.remove('hidden');
  $('class-join').classList.add('hidden');
  $('class-code').textContent = '·····';
  $('class-roster').textContent = 'Connecting to the network…';
  $('btn-class-start').disabled = true;
  classAssign = {};
  renderClassMode();
  syncClassOpts();
  renderTurnForm();
  $('net-turn-form').classList.add('hidden');
  $('net-status').className = 'net-status';
  $('net-status').textContent = getTurn()
    ? 'Relay configured. Tap “Test connection” to confirm it works.'
    : 'Not tested. Tap “Test connection” to see if students can join from other networks.';
  // selector de nivel
  const wrap = $('class-levels');
  wrap.innerHTML = '';
  for (const lvl of LEVELS) {
    const b = document.createElement('button');
    b.className = `level-btn level-${lvl}`;
    b.textContent = lvl;
    b.style.outline = lvl === classLevel ? '3px solid #ffd83d' : 'none';
    b.addEventListener('click', () => {
      classLevel = lvl;
      for (const o of wrap.children) o.style.outline = 'none';
      b.style.outline = '3px solid #ffd83d';
    });
    wrap.appendChild(b);
  }
  // selector de límite de tiempo
  const tWrap = $('class-times');
  tWrap.innerHTML = '';
  for (const [label, min] of [['No limit', 0], ['3 min', 3], ['5 min', 5], ['10 min', 10]]) {
    const b = document.createElement('button');
    b.className = 'wood-btn small time-btn';
    b.textContent = label;
    b.style.outline = min === classMinutes ? '3px solid #ffd83d' : 'none';
    b.addEventListener('click', () => {
      classMinutes = min;
      for (const o of tWrap.children) o.style.outline = 'none';
      b.style.outline = '3px solid #ffd83d';
    });
    tWrap.appendChild(b);
  }
  classHost = new ClassHost({
    onReady: (code) => {
      $('class-code').textContent = code;
      refreshClassQR(code);
      $('class-roster').textContent = 'Waiting for students…';
      $('btn-class-start').disabled = false;
    },
    onError: (e) => {
      $('class-roster').textContent = `⚠ Connection error (${e.type || e}). Check your internet and reload.`;
    },
    onRoster: (players) => {
      $('class-roster').innerHTML = players.length
        ? `👥 ${players.length}/7 joined: <b>${players.join(', ')}</b>`
        : 'Waiting for students…';
      renderClassAssign(players);
    },
    // modo por turnos: llega la respuesta del móvil del alumno
    onAnswer: ({ index, turn }) => quiz.deliverAnswer({ index, askId: turn }),
  });
}

/* ---------- Diagnóstico de red y servidor de relevo (TURN) ---------- */
// Traduce el resultado técnico a lo que le importa al docente: ¿va a funcionar
// desde otra red, o sólo con los que estén en esta misma wifi?
async function runNetTest() {
  const el = $('net-status');
  el.className = 'net-status testing';
  el.textContent = '🔍 Checking… (a few seconds)';
  const r = await testIce();
  if (!r.ok) {
    el.className = 'net-status bad';
    el.textContent = `⚠ Could not test (${r.error}).`;
    return;
  }
  if (r.relay) {
    el.className = 'net-status good';
    el.textContent = '✅ Relay works — students can join from any network (mobile data too).';
  } else if (r.publicAddr) {
    el.className = 'net-status warn';
    el.textContent = '⚠ No relay. It will work on the same Wi‑Fi and on many home networks, ' +
      'but students on mobile data or a locked-down school network may fail. Add a relay server below.';
  } else {
    el.className = 'net-status bad';
    el.textContent = '⛔ Only local addresses. Right now this device can only play with people ' +
      'on the SAME Wi‑Fi. Add a relay server below to fix it.';
  }
}
// El QR y el enlace se rehacen cada vez que cambia el relevo, porque lo llevan
// dentro para que el alumno lo herede al escanear.
function refreshClassQR(code) {
  const url = joinURL(code);
  $('class-link').textContent = url;
  const qrImg = $('class-qr');
  try {
    qrImg.src = makeQR(url);
    qrImg.style.display = '';
  } catch (e) {
    console.warn('QR generation failed:', e);
    qrImg.style.display = 'none'; // sin QR, el enlace/código bastan para unirse
  }
}
function renderTurnForm() {
  const t = getTurn();
  $('turn-url').value = t ? t.urls.join(',') : '';
  $('turn-user').value = t?.username || '';
  $('turn-pass').value = t?.credential || '';
  $('btn-net-turn').textContent = t ? '⚙️ Relay server ✅' : '⚙️ Relay server';
}

/* ---------- Modo por turnos: transporte proyector ⇄ móviles ---------- */
// El quiz pinta la pregunta en la pantalla grande (para que la clase la lea) y
// delega la respuesta en el teléfono del alumno de turno.
const turnsTransport = {
  ask({ q, student, options, askId }) {
    if (!classHost) return false;
    const to = student?.name;
    const roster = classHost.roster();
    if (!to || !roster.includes(to)) return false;
    const ok = classHost.sendTo(to, {
      t: 'ask', turn: askId, topic: q.topic, q: q.q, options,
      kind: q.vocab ? 'vocab' : (q.t === 'p' ? 'passage' : 'sentence'),
      unit: student?.unit || null,
    });
    // a los demás, "le toca a X" (nunca un broadcast: borraría la pregunta al que juega)
    for (const n of roster) if (n !== to) classHost.sendTo(n, { t: 'wait', who: to });
    return ok;
  },
  result({ correct, correctText, askId }) {
    classHost?.broadcast({ t: 'result', correct, correctText, turn: askId });
  },
};

// ¿Está la clase jugando con pantalla central? Lo consulta startStage.
let classTurnsActive = false;
// Alumnos de la partida por turnos: los conectados, con su unidad asignada.
function turnStudents() {
  return (classHost?.roster() || []).map(name => ({ name, unit: classAssign[name] ?? null }));
}

/* ---------- Modo por turnos: preparación en el panel del docente ---------- */
function renderClassMode() {
  const row = $('class-mode-row');
  if (!row) return;
  row.innerHTML = '';
  for (const id of Object.keys(CLASS_MODES)) {
    const info = CLASS_MODES[id];
    const b = document.createElement('button');
    b.className = `diff-btn class-mode-${id}` + (id === classPlayMode ? ' selected' : '');
    b.innerHTML = `<span class="db-emoji">${info.emoji}</span><span class="db-name">${info.name}</span>`;
    b.addEventListener('click', () => {
      SFX.click();
      classPlayMode = id;
      renderClassMode();
      syncClassOpts();
    });
    row.appendChild(b);
  }
  $('class-mode-desc').textContent = CLASS_MODES[classPlayMode].desc;
}
function syncClassOpts() {
  $('class-classic-opts').classList.toggle('hidden', classPlayMode !== 'own');
  $('class-turn-opts').classList.toggle('hidden', classPlayMode !== 'turns');
  $('btn-class-start').textContent = classPlayMode === 'turns' ? '➡ Set up the battle' : '🚀 Start battle!';
  renderClassAssign(classHost ? classHost.roster() : []);
}
// Asignar una unidad a cada alumno conectado (opcional).
function renderClassAssign(players) {
  const box = $('class-assign');
  if (!box || classPlayMode !== 'turns') return;
  if (!players.length) {
    box.innerHTML = '<span class="slot-empty">Nobody has joined yet.</span>';
    return;
  }
  const units = (TOPICS[classLevel] || []).map(t => t.unit);
  const uniq = [...new Set(units)].sort((a, b) => a - b);
  box.innerHTML = '';
  for (const name of players) {
    const row = document.createElement('div');
    row.className = 'assign-row';
    const sel = document.createElement('select');
    sel.className = 'student-unit';
    sel.innerHTML = '<option value="">Match unit</option>' +
      uniq.map(u => `<option value="${u}"${classAssign[name] === u ? ' selected' : ''}>Unit ${u}</option>`).join('');
    sel.addEventListener('change', () => {
      const v = parseInt(sel.value, 10);
      classAssign[name] = Number.isFinite(v) ? v : null;
    });
    const tag = document.createElement('b');
    tag.textContent = name;
    row.append(tag, sel);
    box.appendChild(row);
  }
}

/* ---------- Vista del alumno en el móvil (modo pantalla central) ---------- */
let studentTurn = 0;
function showStudentScreen() {
  $('class-modal').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('student-who').textContent = `👤 ${className}`;
  studentWaiting('Waiting for your turn…', 'Watch the big screen. Your question will appear here.');
  show('screen-student');
}
function studentWaiting(title, sub) {
  $('student-quiz').classList.add('hidden');
  $('student-wait').classList.remove('hidden');
  $('student-wait-title').textContent = title;
  $('student-wait-sub').textContent = sub;
}
// Llega tu pregunta: se pinta con botones grandes para el dedo.
function studentAsk(msg) {
  studentTurn = msg.turn | 0;
  $('student-wait').classList.add('hidden');
  $('student-quiz').classList.remove('hidden');
  $('student-topic').textContent = `📘 ${msg.topic || ''}`;
  $('student-kind').textContent = msg.kind === 'vocab' ? '🔤 Vocabulary'
    : msg.kind === 'passage' ? '📖 Text completion' : '✏️ Complete the sentence';
  $('student-question').textContent = msg.q || '';
  $('student-question').className = msg.kind === 'passage' ? 'student-question passage' : 'student-question';
  const fb = $('student-feedback');
  fb.className = 'student-feedback hidden';
  fb.textContent = '';
  const box = $('student-options');
  box.innerHTML = '';
  (msg.options || []).forEach((text, i) => {
    const b = document.createElement('button');
    b.className = 'student-opt';
    b.textContent = text;
    b.addEventListener('click', () => {
      if (b.disabled) return;
      for (const o of box.children) o.disabled = true;
      b.classList.add('chosen');
      SFX.click();
      classClient?.sendAnswer(i, studentTurn);
      fb.className = 'student-feedback';
      fb.textContent = '📨 Sent! Look at the big screen…';
    });
    box.appendChild(b);
  });
}
// Cómo salió: sólo lo ve quien respondió; los demás siguen esperando.
function studentResult(msg) {
  if ((msg.turn | 0) !== studentTurn) return;
  const fb = $('student-feedback');
  if ($('student-quiz').classList.contains('hidden')) return;
  fb.className = `student-feedback ${msg.correct ? 'good' : 'bad'}`;
  fb.textContent = msg.correct ? '✔ Correct!' : `✘ It was "${msg.correctText}"`;
  if (msg.correct) SFX.correct(); else SFX.wrong();
  setTimeout(() => studentWaiting('Nice! Waiting for your next turn…',
    'Watch the big screen while the others play.'), 2200);
}

// Vista previa de la pantalla del alumno, con una pregunta de muestra.
function previewStudent() {
  className = 'Preview';
  showStudentScreen();
  studentAsk({
    turn: 0, topic: 'Verb "To Be" + WH-Questions', kind: 'sentence',
    q: '____ are you from? — I\'m from Colombia.',
    options: ['Where', 'What', 'Who', 'Why'],
  });
}

let classJoinCode = null;
function openClassJoin(code) {
  classJoinCode = code;
  $('class-modal').classList.remove('hidden');
  $('class-host').classList.add('hidden');
  $('class-join').classList.remove('hidden');
  $('class-join-status').textContent = '';
  $('btn-class-retry').classList.add('hidden');
  $('btn-class-join').classList.remove('hidden');
  $('btn-class-join').disabled = false;
  $('class-join-msg').textContent = `Join your teacher's game (code ${code}). Enter your name:`;
  $('btn-class-join').onclick = () => doJoin(code);
}

function doJoin(code) {
  const name = $('class-name').value.trim() || 'Student';
  className = name;
  $('class-join-status').textContent = '⏳ Connecting…';
  $('btn-class-join').disabled = true;
  $('btn-class-retry').classList.add('hidden');
  classClient?.destroy();
  classClient = new ClassClient(code, name, {
    // 'turns' = el juego corre en el proyector y aquí sólo se responde
    onStart: (cfg) => cfg?.play === 'turns'
      ? showStudentScreen()
      : startClassBattle(cfg.level || 'A1', cfg.minutes || 0),
    onAsk: studentAsk,
    onWait: (msg) => studentWaiting(`${msg.who} is answering…`, 'Get ready — your turn is coming.'),
    onResult: studentResult,
    onBoard: renderClassBoard,
    onEnd: (rows) => showClassResults(rows, false),
    onStatus: (s, extra) => {
      const msgs = {
        waiting: '✅ Connected! Saying hello to your teacher…',
        // el saludo se repite hasta que el docente contesta
        handshake: `⏳ Connected — waiting for the teacher to accept you… (${extra})`,
        joined: `✅ You're in! Players: ${(extra || []).join(', ')}`,
        // línea abierta pero el docente nunca respondió: no es fallo de internet
        nowelcome: '⚠ Connected, but your teacher\'s game never answered. ' +
          'Ask them to keep the Class Mode window open, then tap Retry.',
        full: '⚠ The class is full (7 students max).',
        closed: '⚠ The teacher ended the session.',
        retrying: `⏳ ${extra}`,
        failed: '⚠ Could not connect. Check the code and your internet, then Retry.',
        error: `⚠ Connection problem (${extra}). Tap Retry.`,
      };
      $('class-join-status').textContent = msgs[s] || s;
      const showRetry = (s === 'error' || s === 'full' || s === 'failed' || s === 'nowelcome');
      $('btn-class-retry').classList.toggle('hidden', !showRetry);
      if (showRetry) $('btn-class-join').classList.add('hidden');
    },
  });
}

function stopClass() {
  clearInterval(classTimer); classTimer = null;
  clearInterval(classCountdown); classCountdown = null;
  classDeadline = 0;
  classHost?.destroy(); classHost = null;
  classClient?.destroy(); classClient = null;
  classTurnsActive = false;
  quiz.setRemote(null);
  $('class-board').classList.add('hidden');
  $('btn-class-end').classList.add('hidden');
  $('btn-class-leave').classList.add('hidden');
  if (location.hash.startsWith('#join=')) history.replaceState(null, '', location.pathname);
}

/* ================= Minigames ================= */
function openMini(mode) {
  pendingMini = mode;
  $('mini-title').textContent = mode === 'vase' ? '🏺 Vase Breaker' : '🥔 Spud Bowling';
  $('mini-desc').textContent = mode === 'vase'
    ? 'Answer a question to break each vase. Plants, treasures… or zombies hide inside! Clear every vase to win.'
    : 'Click a lane to roll a spud and crush the zombies. Answer questions to earn more spuds!';
  const wrap = $('mini-levels');
  wrap.innerHTML = '';
  for (const lvl of LEVELS) {
    const b = document.createElement('button');
    b.className = `level-btn level-${lvl}`;
    b.textContent = lvl;
    b.addEventListener('click', () => {
      SFX.click();
      $('mini-modal').classList.add('hidden');
      current = { level: lvl, levelIdx: LEVELS.indexOf(lvl), stageIdx: 3, stages: stagesFor(lvl), mode: pendingMini };
      startStage(3, pendingMini);
    });
    wrap.appendChild(b);
  }
  renderDifficulty('mini-diff-row', 'mini-diff-desc');
  $('mini-modal').classList.remove('hidden');
}

/* ================= Scenario picker ================= */
function openScenario() {
  const grid = $('scenario-grid');
  grid.innerHTML = '';
  const cur = (game && game.themeId) || localStorage.getItem('ed:theme') || 'day';
  for (const [id, t] of Object.entries(THEMES)) {
    const b = document.createElement('button');
    b.className = 'scenario-btn' + (id === cur ? ' selected' : '');
    // miniatura del fondo pintado real para que se vea qué escenario eliges
    b.innerHTML =
      `<img class="sc-thumb" src="assets/backgrounds/${id}.jpg" alt="" loading="lazy">` +
      `<span class="sc-label"><span class="sc-emoji">${t.emoji}</span> ${t.name}</span>`;
    b.addEventListener('click', () => {
      SFX.click();
      game.setTheme(id);
      for (const o of grid.children) o.classList.remove('selected');
      b.classList.add('selected');
      $('scenario-note').textContent = `✅ ${t.name} selected — you'll see it when you start a game!`;
    });
    grid.appendChild(b);
  }
  $('scenario-note').textContent = 'Tap a scenario to choose your battlefield.';
  $('scenario-modal').classList.remove('hidden');
}

/* ================= Soundtrack picker ================= */
function openSoundtrack() {
  const list = $('soundtrack-list');
  list.innerHTML = '';
  const tracks = getTracks();
  const cur = getTrackSelection(); // 'auto' o índice numérico
  const note = $('soundtrack-note');

  const makeBtn = (mode, emoji, title, sub) => {
    const isSel = String(mode) === String(cur);
    const b = document.createElement('button');
    b.className = 'soundtrack-btn' + (isSel ? ' selected' : '');
    b.innerHTML =
      `<span class="st-emoji">${emoji}</span>` +
      `<span class="st-text"><span class="st-title">${title}</span>` +
      `<span class="st-sub">${sub}</span></span>`;
    b.addEventListener('click', () => {
      SFX.click();
      selectTrack(mode);
      for (const o of list.children) o.classList.remove('selected');
      b.classList.add('selected');
      note.textContent = `✅ ${title} — enjoy the music!`;
      // asegurarse de que la música esté sonando para escuchar la elección
      localStorage.setItem('ed:music', 'on');
      if (!isMusicPlaying()) startMusic();
      $('btn-music').textContent = '🎵';
      $('btn-music').style.opacity = '1';
    });
    list.appendChild(b);
  };

  makeBtn('auto', '🔀', 'Shuffle all', 'Rotate through every track');
  tracks.forEach((t, i) => makeBtn(i, t.emoji, t.title, 'Play this track on loop'));

  note.textContent = 'Tap a track to choose your music.';
  $('soundtrack-modal').classList.remove('hidden');
}

/* ================= Buttons ================= */
function bindUI() {
  $('btn-scenario').addEventListener('click', () => { SFX.click(); openScenario(); });
  $('btn-scenario-hud').addEventListener('click', () => { SFX.click(); openScenario(); });
  $('btn-scenario-close').addEventListener('click', () => { SFX.click(); $('scenario-modal').classList.add('hidden'); });
  $('btn-soundtrack').addEventListener('click', () => { SFX.click(); openSoundtrack(); });
  $('btn-soundtrack-hud').addEventListener('click', () => { SFX.click(); openSoundtrack(); });
  $('btn-soundtrack-close').addEventListener('click', () => { SFX.click(); $('soundtrack-modal').classList.add('hidden'); });
  $('btn-stages-back').addEventListener('click', () => { SFX.click(); show('screen-menu'); });
  // mezcla de niveles / unidades / temas
  $('btn-mix').addEventListener('click', () => { SFX.click(); openMixPicker(); });
  $('btn-mix-close').addEventListener('click', () => { SFX.click(); $('mix-modal').classList.add('hidden'); });
  $('btn-mix-play').addEventListener('click', () => { SFX.click(); playMix(); });
  // selección múltiple de unidades
  $('btn-pick-units').addEventListener('click', () => { SFX.click(); openUnitPicker(); });
  $('btn-units-close').addEventListener('click', () => { SFX.click(); $('units-modal').classList.add('hidden'); });
  $('btn-units-play').addEventListener('click', () => { SFX.click(); playPickedUnits(); });
  $('btn-units-all').addEventListener('click', () => {
    SFX.click();
    unitPick = current.stages.map(s => s.unit);
    renderUnitPicker();
  });
  $('btn-units-none').addEventListener('click', () => { SFX.click(); unitPick = []; renderUnitPicker(); });
  // selector de plantas
  $('btn-plants-back').addEventListener('click', () => { SFX.click(); show('screen-stages'); });
  $('btn-plants-start').addEventListener('click', () => {
    SFX.click();
    current.loadout = plantSel.chosen.slice();
    startStage(plantSel.stageIdx, 'classic');
  });
  // almanaque (portada y también mientras se elige unidad/plantas)
  $('btn-almanac').addEventListener('click', () => { SFX.click(); openAlmanac('plants'); });
  $('btn-plants-almanac').addEventListener('click', () => { SFX.click(); openAlmanac('plants'); });
  // lista de la clase
  $('btn-student-add').addEventListener('click', () => { SFX.click(); addStudent(); });
  $('student-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') addStudent(); });
  $('alm-tab-plants').addEventListener('click', () => { SFX.click(); openAlmanac('plants'); });
  $('alm-tab-zombies').addEventListener('click', () => { SFX.click(); openAlmanac('zombies'); });
  $('btn-almanac-close').addEventListener('click', () => {
    SFX.click();
    showAlmanacDetail(null);   // la próxima vez se abre en el álbum, no en una ficha
    $('almanac-modal').classList.add('hidden');
  });
  $('btn-how').addEventListener('click', () => { SFX.click(); $('how-modal').classList.remove('hidden'); });
  $('btn-how-close').addEventListener('click', () => { SFX.click(); $('how-modal').classList.add('hidden'); });
  $('btn-tips').addEventListener('click', () => {
    SFX.click();
    setTipsES(!tipsES());
    $('btn-tips').textContent = `🇪🇸 Spanish tips: ${tipsES() ? 'ON' : 'OFF'}`;
  });
  $('btn-stats').addEventListener('click', () => {
    SFX.click();
    const g = store.global;
    const acc = g.asked ? Math.round((g.correct / g.asked) * 100) : 0;
    let starTotal = 0, unitsDone = 0;
    for (const lvl of LEVELS) {
      const p = store.progress[lvl] || {};
      for (const u in p) { starTotal += p[u]; unitsDone++; }
    }
    $('stats-body').innerHTML =
      `Questions answered: <b>${g.asked}</b><br>Overall accuracy: <b>${acc}%</b><br>` +
      `Units cleared: <b>${unitsDone}</b> · Stars: <b>${starTotal} ⭐</b>`;
    $('stats-modal').classList.remove('hidden');
  });
  $('btn-stats-close').addEventListener('click', () => $('stats-modal').classList.add('hidden'));

  $('btn-mini-vase').addEventListener('click', () => { SFX.click(); openMini('vase'); });
  $('btn-mini-bowl').addEventListener('click', () => { SFX.click(); openMini('bowling'); });
  $('btn-mini-close').addEventListener('click', () => $('mini-modal').classList.add('hidden'));
  $('btn-class').addEventListener('click', () => { SFX.click(); openClassHost(); });
  // red: diagnóstico y servidor de relevo
  $('btn-net-test').addEventListener('click', () => { SFX.click(); runNetTest(); });
  $('btn-net-turn').addEventListener('click', () => {
    SFX.click();
    $('net-turn-form').classList.toggle('hidden');
    renderTurnForm();
  });
  $('btn-turn-save').addEventListener('click', () => {
    SFX.click();
    setTurn($('turn-url').value, $('turn-user').value, $('turn-pass').value);
    renderTurnForm();
    // el QR debe rehacerse: ahora lleva el relevo para los alumnos
    if (classHost?.code) refreshClassQR(classHost.code);
    $('net-status').className = 'net-status';
    $('net-status').textContent = 'Relay saved. Tap “Test connection” to check it works.';
  });
  $('btn-turn-clear').addEventListener('click', () => {
    SFX.click();
    setTurn('');
    renderTurnForm();
    if (classHost?.code) refreshClassQR(classHost.code);
  });
  $('btn-student-exit').addEventListener('click', () => {
    SFX.click();
    classClient?.leave(); classClient = null;
    show('screen-menu');
  });
  $('btn-class-close').addEventListener('click', () => { $('class-modal').classList.add('hidden'); stopClass(); });
  $('btn-class-start').addEventListener('click', () => {
    SFX.click();
    if (classPlayMode === 'turns') {
      // Pantalla central: los móviles quedan a la espera y el docente pasa DIRECTO
      // al selector de plantas del nivel elegido. Desde ahí tiene todo lo de una
      // partida normal (temas, modo, dificultad, oleadas, almanaque) y con
      // "← Stages" puede cambiar de unidad o armar una mezcla.
      classTurnsActive = true;
      classHost?.start({ play: 'turns' });
      $('class-modal').classList.add('hidden');
      const stages = stagesFor(classLevel);
      current = {
        level: classLevel, levelIdx: LEVELS.indexOf(classLevel), stages,
        stageIdx: 0, mode: 'classic', multiUnits: null, mixEntries: null,
      };
      openPlantSelect(0);
      return;
    }
    classTurnsActive = false;
    classHost?.start({ level: classLevel, minutes: classMinutes });
    startClassBattle(classLevel, classMinutes);
  });
  $('btn-class-retry').addEventListener('click', () => { SFX.click(); if (classJoinCode) doJoin(classJoinCode); });
  // el docente termina la partida para toda la clase
  $('btn-class-end').addEventListener('click', () => {
    SFX.click();
    if (confirm('End the game for the whole class and show results?')) endClassGame();
  });
  // el estudiante sale de la partida
  $('btn-class-leave').addEventListener('click', () => {
    SFX.click();
    classClient?.leave(); classClient = null;
    quitToMenu();
  });
  $('btn-ammo').addEventListener('click', async (e) => {
    const btn = e.target;
    if (btn.disabled) return;
    btn.disabled = true;
    await game.askForAmmo();
    setTimeout(() => { btn.disabled = false; }, 4000);
  });

  $('btn-pause').addEventListener('click', () => {
    if (game.state !== 'playing') return;
    SFX.click();
    game.pause();
    $('pause-modal').classList.remove('hidden');
  });
  $('btn-resume').addEventListener('click', () => { SFX.click(); $('pause-modal').classList.add('hidden'); game.resume(); });
  $('btn-restart').addEventListener('click', () => { SFX.click(); $('pause-modal').classList.add('hidden'); startStage(current.stageIdx, current.mode); });
  $('btn-quit').addEventListener('click', () => { SFX.click(); quitToMenu(); });

  $('btn-speed').addEventListener('click', (e) => {
    SFX.click();
    const s = game.toggleSpeed();
    e.target.textContent = `▶ x${s}`;
  });
  // Música y sonido se controlan desde el HUD y también desde la portada; ambos
  // pares de botones comparten estado y se refrescan juntos.
  const toggleSound = () => {
    SFX.click();                       // suena antes de apagar, para dar feedback
    const on = isMuted();              // al estar muteado, este clic lo enciende
    setMuted(!on);
    localStorage.setItem('ed:sound', on ? 'on' : 'off');
    syncAudioButtons();
  };
  $('btn-mute').addEventListener('click', toggleSound);
  $('btn-menu-sound').addEventListener('click', toggleSound);
  const toggleMusic = () => {
    const on = !musicWanted();
    localStorage.setItem('ed:music', on ? 'on' : 'off');
    if (on) startMusic(); else stopMusic();
    syncAudioButtons();
  };
  $('btn-music').addEventListener('click', () => { SFX.click(); toggleMusic(); });
  $('btn-menu-music').addEventListener('click', () => { SFX.click(); toggleMusic(); });
  setMuted(localStorage.getItem('ed:sound') === 'off');   // el ajuste se recuerda
  syncAudioButtons();

  // deslizador de oleadas (1–10)
  $('wave-range').addEventListener('input', (e) => {
    localStorage.setItem('ed:waves', e.target.value);
    renderWaves();
  });
  $('wave-range').addEventListener('change', () => SFX.click());
  // la música arranca con el primer gesto del usuario (política de autoplay)
  const kickMusic = () => { if (musicWanted() && !isMusicPlaying()) startMusic(); };
  document.addEventListener('pointerdown', kickMusic, { once: false });

  // La pala abre el mismo tablero que "Improve": se elige ahí la planta a quitar.
  $('shovel').addEventListener('click', () => {
    if (!game || game.state !== 'playing') return;
    SFX.click();
    if (game.openShovel()) { renderShovelBoard(); $('shovel-modal').classList.remove('hidden'); }
  });

  $('btn-improve').addEventListener('click', () => {
    if (!game || game.state !== 'playing') return;
    SFX.click();
    if (game.openImprove()) { renderImproveList(); $('improve-modal').classList.remove('hidden'); }
  });
  $('improve-accept').addEventListener('click', () => {
    SFX.click();
    $('improve-modal').classList.add('hidden');
    game.closeImprove();
  });
  $('shovel-accept').addEventListener('click', () => {
    SFX.click();
    $('shovel-modal').classList.add('hidden');
    game.closeShovel();
  });

  $('btn-retry').addEventListener('click', () => { SFX.click(); startStage(current.stageIdx, current.mode); });
  $('btn-next').addEventListener('click', () => { SFX.click(); $('end-modal').classList.add('hidden'); openPlantSelect(current.stageIdx + 1); });
  $('btn-end-menu').addEventListener('click', () => { SFX.click(); quitToMenu(); });
}

/* ================= Boot ================= */
function bootError(msg) {
  const inner = document.querySelector('.loading-inner');
  inner.innerHTML =
    `<div style="font-size:46px">🧟</div>` +
    `<h2 style="color:#ffb0a0">The game could not start</h2>` +
    `<p style="max-width:480px;margin:10px auto;font-weight:700;line-height:1.5">${msg}</p>`;
}

(async function boot() {
  try {
    // WebGL es indispensable: algunos navegadores (p. ej. Brave con Shields
    // agresivos o sin aceleración por hardware) lo bloquean.
    const test = document.createElement('canvas');
    const gl = test.getContext('webgl2') || test.getContext('webgl');
    if (!gl) {
      bootError(
        'Your browser has <b>WebGL disabled</b>, which this 3D game needs.<br><br>' +
        '🦁 <b>Brave:</b> click the lion icon in the address bar and turn Shields OFF for this site, ' +
        'and make sure <i>Settings → System → Use hardware acceleration</i> is ON, then reload.<br><br>' +
        '🌐 Or try opening the game in Chrome or Edge.'
      );
      return;
    }
    // si la carga de sprites/modelos tarda demasiado, seguimos con respaldos
    await Promise.race([
      Promise.all([preloadSprites(), preloadModels()]),
      new Promise(res => setTimeout(res, 20000)),
    ]);
    game = new Game($('game-canvas'), quiz, hooks);
    window.__game = game; // debug/tests
    bindUI();
    buildMenu();
    show('screen-menu');
    // si llega por un enlace/QR de Class Mode, abre el flujo de unirse
    const m = location.hash.match(/^#join=([A-Za-z0-9]{4,8})$/);
    if (m) openClassJoin(m[1]);
    // Vista previa de la pantalla del alumno (?preview=student): sirve para ver en
    // el propio móvil cómo la verán en clase, sin montar la sesión.
    if (new URLSearchParams(location.search).get('preview') === 'student') previewStudent();
  } catch (err) {
    console.error(err);
    bootError(
      `Something went wrong while starting:<br><code style="color:#ffd0c0">${String(err).slice(0, 200)}</code>` +
      '<br><br>Try a hard refresh (<b>Ctrl+Shift+R</b>).<br>' +
      'If it persists: enable <i>hardware acceleration</i> in your browser settings ' +
      '(<code>chrome://settings/system</code>) and update your graphics drivers, then restart the browser.'
    );
  }
})();
