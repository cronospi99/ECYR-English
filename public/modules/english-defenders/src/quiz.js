// Motor de preguntas — conecta los temas del programa (INT-ANX-005) con el juego.
import { TOPICS } from '../data/topics.js';
import { GRAMMAR_NOTES } from '../data/grammar-notes.js';
import { QUESTIONS_A1 } from '../data/questions-a1.js';
import { QUESTIONS_A2 } from '../data/questions-a2.js';
import { QUESTIONS_B1 } from '../data/questions-b1.js';
import { QUESTIONS_B2 } from '../data/questions-b2.js';
import { QUESTIONS_C1 } from '../data/questions-c1.js';
import { EXTRA_QUESTIONS } from '../data/questions-extra.js';
import { PLUS_A1 } from '../data/questions-plus-a1.js';
import { PLUS_A2 } from '../data/questions-plus-a2.js';
import { PLUS_B1 } from '../data/questions-plus-b1.js';
import { PLUS_B2 } from '../data/questions-plus-b2.js';
import { PLUS_C1 } from '../data/questions-plus-c1.js';
import { DRILLS } from '../data/questions-drills.js';
import { BOOST_A1 } from '../data/questions-boost-a1.js';
import { BOOST_A2 } from '../data/questions-boost-a2.js';
import { BOOST_B1 } from '../data/questions-boost-b1.js';
import { BOOST_B2 } from '../data/questions-boost-b2.js';
import { BOOST_C1 } from '../data/questions-boost-c1.js';
import { PASSAGES_A2 } from '../data/passages-a2.js';
import { PASSAGES_B1 } from '../data/passages-b1.js';
import { PASSAGES_B2 } from '../data/passages-b2.js';
import { PASSAGES_C1 } from '../data/passages-c1.js';
import { PLUS_PASSAGES_B1 } from '../data/passages-plus-b1.js';
import { PLUS_PASSAGES_B2 } from '../data/passages-plus-b2.js';
import { PLUS_PASSAGES_C1 } from '../data/passages-plus-c1.js';
import { vocabQuestions } from '../data/vocabulary.js';
import { SFX } from './audio.js';

// fusiona el banco base con todos los bancos adicionales del mismo nivel
function merge(base, ...extras) {
  const out = {};
  const keys = new Set(Object.keys(base));
  for (const e of extras) if (e) for (const k of Object.keys(e)) keys.add(k);
  for (const k of keys) {
    out[k] = [...(base[k] || [])];
    for (const e of extras) if (e && e[k]) out[k].push(...e[k]);
  }
  return out;
}
const BANKS = {
  A1: merge(QUESTIONS_A1, EXTRA_QUESTIONS.A1, PLUS_A1, DRILLS.A1, BOOST_A1),
  A2: merge(QUESTIONS_A2, EXTRA_QUESTIONS.A2, PLUS_A2, DRILLS.A2, PASSAGES_A2, BOOST_A2),
  B1: merge(QUESTIONS_B1, EXTRA_QUESTIONS.B1, PLUS_B1, PASSAGES_B1, PLUS_PASSAGES_B1, BOOST_B1),
  B2: merge(QUESTIONS_B2, EXTRA_QUESTIONS.B2, PLUS_B2, PASSAGES_B2, PLUS_PASSAGES_B2, BOOST_B2),
  C1: merge(QUESTIONS_C1, EXTRA_QUESTIONS.C1, PLUS_C1, PASSAGES_C1, PLUS_PASSAGES_C1, BOOST_C1),
};

// Dos formatos de ejercicio conviven en el banco:
//   • completion sentence  — una frase corta con un hueco (drill rápido de gramática/vocabulario)
//   • text completion (t:'p') — un pasaje de 2 a 4 frases donde el hueco se resuelve por contexto
// La proporción de pasajes sube con el nivel: A1 se queda en frases sueltas y de B1 en
// adelante el contexto pasa a ser el formato dominante.
const PASSAGE_MIX = { A1: 0, A2: 0.3, B1: 0.5, B2: 0.6, C1: 0.65 };
const isPassage = (q) => q.t === 'p';

// Los tres modos de pregunta que se eligen antes de la batalla.
export const MODES = ['grammar', 'vocab', 'mixed'];
export const MODE_INFO = {
  grammar: { emoji: '📗', name: 'Grammar', desc: 'Only the grammar of the programme — the classic battle.' },
  vocab:   { emoji: '🔤', name: 'Vocabulary', desc: 'Only vocabulary for the CEFR level: words, collocations and idioms.' },
  mixed:   { emoji: '🎓', name: 'Grammar + Vocabulary', desc: 'Grammar with vocabulary mixed in — the most complete review.' },
};
export const DEFAULT_MODE = 'grammar';
export const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
export function questionMode() {
  const m = localStorage.getItem('ed:qmode');
  return MODES.includes(m) ? m : DEFAULT_MODE;
}
export function setQuestionMode(m) { if (MODES.includes(m)) localStorage.setItem('ed:qmode', m); }

// Reparte los pasajes entre las frases al ritmo pedido (ratio = proporción deseada de
// pasajes). Si un formato se agota antes, el resto se añade al final: nunca se pierden
// preguntas, sólo cambia el orden en que salen.
function blend(sent, pass, ratio) {
  if (!pass.length) return sent;
  if (!sent.length) return pass;
  if (ratio <= 0) return sent;
  const out = [];
  let i = 0, j = 0, credit = 0;
  while (i < sent.length || j < pass.length) {
    credit += ratio;
    if (credit >= 1 && j < pass.length) { out.push(pass[j++]); credit -= 1; }
    else if (i < sent.length) out.push(sent[i++]);
    else { out.push(pass[j++]); credit = 0; }
  }
  return out;
}

// Toggle: mostrar las explicaciones gramaticales en español
export function tipsES() { return localStorage.getItem('ed:tips-es') !== 'off'; }
export function setTipsES(on) { localStorage.setItem('ed:tips-es', on ? 'on' : 'off'); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Quiz {
  constructor() {
    this.modal = document.getElementById('quiz-modal');
    this.elTopic = document.getElementById('quiz-topic');
    this.elQ = document.getElementById('quiz-question');
    this.elOpts = document.getElementById('quiz-options');
    this.elKind = document.getElementById('quiz-kind');
    this.elFb = document.getElementById('quiz-feedback');
    this.elExplain = document.getElementById('quiz-explain');
    this.btnWhy = document.getElementById('quiz-why');
    this.btnCont = document.getElementById('quiz-continue');
    this.btnSkip = document.getElementById('quiz-skip');
    this.elFor = document.getElementById('quiz-for');
    this.pool = [];
    this.queue = [];
    this.students = [];
    this.turn = 0;
    this.byUnit = {};
    this.stats = { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
  }

  // Cuánto de la batalla es la unidad elegida y cuánto repaso de las anteriores.
  // Sólo aplica cuando se empieza en una unidad alta y por tanto HAY repaso: en la
  // unidad 1 no hay nada anterior y todo sale de la unidad actual.
  static CURRENT_SHARE = 0.35;
  // En el modo mixto, qué proporción de las preguntas es vocabulario.
  static VOCAB_SHARE = 0.4;

  // Prepara el pool para una etapa: nivel CEFR + unidad. Incluye refuerzo de unidades anteriores.
  // `topics` (opcional) limita la unidad ACTUAL a unas clases concretas (los 2–3 temas
  // de gramática de la unidad); el repaso de unidades previas nunca se filtra.
  // `mode` decide de qué se pregunta:
  //   'grammar'  — sólo gramática del programa (comportamiento de siempre)
  //   'vocab'    — sólo vocabulario del nivel CEFR (evaluación de léxico)
  //   'mixed'    — gramática con vocabulario intercalado (VOCAB_SHARE)
  // `units` (opcional): lista explícita de unidades a jugar. Cuando se pasa, la
  // batalla se arma SÓLO con esas unidades y no hay reparto unidad-actual/repaso,
  // porque todas las elegidas cuentan por igual.
  setStage(level, unit, topicKeys = null, mode = 'grammar', units = null) {
    this.level = level;
    this.mode = MODES.includes(mode) ? mode : 'grammar';
    this.mix = PASSAGE_MIX[level] ?? 0;
    this.topicKeys = topicKeys && topicKeys.length ? new Set(topicKeys) : null;
    this.units = Array.isArray(units) && units.length ? units.slice().sort((a, b) => a - b) : null;

    if (this.units) {
      const picked = new Set(this.units);
      this.unit = this.units[this.units.length - 1];
      const all = this._collect(u => picked.has(u));
      this.pool = all;
      this.queue = this._deal(all);
    } else {
      this.unit = unit;
      const cur = this._collect(u => u === unit, this.topicKeys);
      const rev = this._collect(u => u < unit);
      this.pool = cur.concat(rev);
      this.queue = this._mixUnits(cur, rev);
    }
    // En vocabulario puro una unidad baja deja poquísimo material: si no hay nada,
    // se abre a todo el vocabulario del nivel antes de caer al banco completo.
    if (!this.pool.length && this.mode !== 'grammar') {
      this.pool = vocabQuestions(level);
      this.queue = this._deal(this.pool);
    }
    if (!this.pool.length) this.pool = Object.values(BANKS[level] || {}).flat().map(q => ({ ...q, topic: level }));
    if (!this.queue.length) this.queue = this._deal(this.pool);

    this.byUnit = {};   // colas por unidad, para las preguntas asignadas a un alumno
    this.lastQ = null;
    // La ventana anti-repetición se escala al tamaño del banco: en pools pequeños
    // una ventana grande bloquearía todas las candidatas.
    this.recent = [];
    this.recentCap = Math.max(4, Math.min(30, Math.floor(this.pool.length / 3)));
    this.stats = { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
  }

  // Todas las preguntas del nivel cuyas unidades pasan el filtro, ya mezcladas
  // gramática/vocabulario según el modo de la partida. Es la única puerta de acceso
  // a los bancos, así que el modo se respeta en todos los caminos (partida, alumno
  // con unidad asignada y selección múltiple de unidades).
  _collect(unitOk, topicKeys = null) { return this._collectFrom(this.level, unitOk, topicKeys); }

  // Igual pero de un nivel CEFR concreto: lo necesita la partida mezclada, donde
  // conviven varios niveles. Cada pregunta queda etiquetada con SU nivel para que
  // la nota de gramática que se muestra al responder sea la del nivel correcto.
  _collectFrom(level, unitOk, topicKeys = null) {
    const bank = BANKS[level] || {};
    const g = [], v = [];
    if (this.mode !== 'vocab') {
      for (const t of (TOPICS[level] || [])) {
        if (!unitOk(t.unit)) continue;
        const key = `${t.unit}-${t.cls}`;
        if (topicKeys && !topicKeys.has(key)) continue;
        for (const q of (bank[key] || [])) g.push({ ...q, topic: t.topic, unit: t.unit, key, level });
      }
    }
    if (this.mode !== 'grammar') {
      for (const q of vocabQuestions(level)) if (unitOk(q.unit)) v.push({ ...q, level });
    }
    if (this.mode === 'grammar') return g;
    if (this.mode === 'vocab') return v;
    return this._blendRatio(g, v, Quiz.VOCAB_SHARE);
  }

  // Partida MEZCLADA: varios niveles CEFR a la vez, cada uno con sus unidades y
  // temas. `entries` = [{ level, topicKeys:[...], units:[...] }]. No hay reparto
  // unidad-actual/repaso: todo lo elegido entra en igualdad de condiciones.
  setMix(entries, mode = 'grammar') {
    this.mode = MODES.includes(mode) ? mode : 'grammar';
    this.topicKeys = null;
    this.units = null;
    const list = (entries || []).filter(e => e && BANKS[e.level]);
    // el nivel más alto marca la proporción de pasajes de lectura de la partida
    this.level = list.length
      ? list.map(e => e.level).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)).pop()
      : 'A1';
    this.mix = PASSAGE_MIX[this.level] ?? 0;
    this.unit = 999;
    this.mixEntries = list;

    const all = [];
    for (const e of list) {
      const keys = e.topicKeys && e.topicKeys.length ? new Set(e.topicKeys) : null;
      const units = e.units && e.units.length ? new Set(e.units) : null;
      all.push(...this._collectFrom(e.level, (u) => !units || units.has(u), keys));
    }
    this.pool = all;
    this.queue = this._deal(all);
    if (!this.pool.length) {
      this.pool = Object.values(BANKS[this.level] || {}).flat().map(q => ({ ...q, topic: this.level, level: this.level }));
      this.queue = this._deal(this.pool);
    }
    this.byUnit = {};
    this.lastQ = null;
    this.recent = [];
    this.recentCap = Math.max(4, Math.min(30, Math.floor(this.pool.length / 3)));
    this.stats = { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
  }

  // Intercala `b` dentro de `a` en la proporción pedida, reciclando `b` si se acaba
  // (el vocabulario de un nivel es mucho más corto que el banco de gramática).
  // `a` nunca se repite: la lista resultante dura lo que dure `a`.
  _blendRatio(a, b, shareB) {
    if (!a.length) return b.slice();
    if (!b.length) return a.slice();
    const bs = shuffle(b);
    const out = [];
    let i = 0, j = 0, credit = 0;
    const total = Math.round(a.length / (1 - shareB));
    while (out.length < total && i < a.length) {
      credit += shareB;
      if (credit >= 1) { credit -= 1; if (j >= bs.length) j = 0; out.push(bs[j++]); }
      else out.push(a[i++]);
    }
    return out;
  }

  // Intercala unidad actual y repaso en la proporción pedida (35 / 65 por defecto)
  // en vez de servir primero toda la unidad y luego todo el repaso.
  _mixUnits(current, review) {
    const rev = this._deal(review);
    if (!rev.length) return this._deal(current);
    if (!current.length) return rev;
    const share = Quiz.CURRENT_SHARE;
    // La unidad elegida tiene muchas menos preguntas que todo el repaso junto. Si
    // sólo se intercalara una vez, se agotaría a media partida y el resto sería
    // repaso puro (la proporción real caía al ~16%). Así que la unidad actual se
    // vuelve a barajar cuando se acaba: la mezcla se mantiene toda la batalla.
    let cur = this._deal(current), ci = 0;
    const total = Math.round(rev.length / (1 - share));
    const out = [];
    let credit = 0, j = 0;
    while (out.length < total) {
      credit += share;
      if (credit >= 1) {
        credit -= 1;
        if (ci >= cur.length) { cur = this._deal(current); ci = 0; }
        out.push(cur[ci++]);
      } else if (j < rev.length) {
        out.push(rev[j++]);
      } else break;
    }
    return out;
  }

  // Baraja de un alumno con unidad asignada. Una unidad suelta son ~15 preguntas, y
  // varios alumnos con la MISMA unidad comparten baraja: entre todos la agotaban en
  // unos minutos y a partir de ahí todo se repetía. Así que su baraja se arma igual
  // que la de la partida — su unidad al 35 % y el resto repaso de unidades anteriores
  // — lo que multiplica por tres la profundidad sin sacarle de su nivel.
  // Respeta además el modo: en vocabulario sus preguntas también son de vocabulario.
  _studentDeck(unit) {
    const own = this._collect(u => u === unit);
    const earlier = this._collect(u => u < unit);
    if (!own.length && !earlier.length) return this._deal(this.pool);
    if (!earlier.length) return this._deal(own);
    if (!own.length) return this._deal(earlier);
    return this._mixUnits(own, earlier);
  }

  _unitQueue(unit) {
    if (!this.byUnit[unit]) this.byUnit[unit] = this._studentDeck(unit);
    return this.byUnit[unit];
  }

  // Lista de alumnos a los que se dirigen las preguntas, en rotación.
  // Cada uno es { name, unit } — `unit` es opcional.
  setStudents(list) {
    this.students = (list || []).filter(s => s && s.name);
    this.turn = 0;
  }
  get hasStudents() { return !!(this.students && this.students.length); }

  // Baraja un grupo y dosifica en él los pasajes según el nivel.
  _deal(arr) {
    return blend(shuffle(arr.filter(q => !isPassage(q))), shuffle(arr.filter(isPassage)), this.mix);
  }

  /* ---------- Ventana anti-repetición ----------
     Con varios alumnos, cada uno tira de una baraja corta y las preguntas volvían
     a salir demasiado pronto. Se recuerdan las últimas mostradas (de TODA la
     partida, no por alumno) y se salta cualquier candidata que siga en esa ventana.
     Las descartadas vuelven al final de su baraja, así que no se pierde ninguna. */
  _isRecent(q) { return this.recent.includes(q.q); }
  _remember(q) {
    this.recent.push(q.q);
    while (this.recent.length > this.recentCap) this.recent.shift();
  }
  // Saca de `deck` la primera pregunta que no se haya visto hace poco, rellenando
  // con `refill()` cuando se agota. Si todas las candidatas son recientes (baraja
  // diminuta), devuelve la primera: mejor repetir que quedarse sin pregunta.
  _draw(deck, refill) {
    const skipped = [];
    let chosen = null;
    for (let i = 0; i < 10; i++) {
      if (!deck.length) {
        const more = refill();
        if (!more.length) break;
        deck.push(...more);
      }
      const q = deck.shift();
      if (!this._isRecent(q)) { chosen = q; break; }
      skipped.push(q);
    }
    if (!chosen) chosen = skipped.shift() || null;
    deck.push(...skipped);
    if (chosen) { this._remember(chosen); this.lastQ = chosen; }
    return chosen;
  }

  // Saca la siguiente pregunta. Si toca un alumno con unidad asignada, la pregunta
  // sale de ESA unidad; si no, de la cola normal de la partida.
  next(student = null) {
    if (student && student.unit) {
      const q = this._draw(this._unitQueue(student.unit), () => this._studentDeck(student.unit));
      if (q) return q;
    }
    return this._draw(this.queue, () => this._deal(this.pool));
  }

  // A quién va dirigida la siguiente pregunta (rotación por la lista de la clase).
  _nextStudent() {
    if (!this.hasStudents) return null;
    const s = this.students[this.turn % this.students.length];
    this.turn++;
    return s;
  }

  // Muestra el modal y resuelve {correct:boolean} al terminar la interacción.
  // El turno de alumno se decide UNA vez: cambiar de pregunta no pasa el turno.
  ask() {
    const student = this._nextStudent();
    return new Promise((resolve) => {
      this._render(this.next(student), student, resolve);
      this.modal.classList.remove('hidden');
      // breve bloqueo tras abrir para descartar el toque que originó la pregunta
      this._lockUntil = performance.now() + 450;
    });
  }

  // Pinta una pregunta concreta dentro del modal ya abierto.
  _render(q, student, resolve) {
    {
      const passage = isPassage(q);
      // Nombre del tema de gramática al que pertenece la pregunta.
      this.elTopic.textContent = `📘 ${q.topic}`;
      // "Esta va para X": el docente sabe a quién preguntar y de qué unidad.
      if (this.elFor) {
        if (student) {
          this.elFor.textContent = this.remote
            ? `📱 ${student.name} answers on their phone${student.unit ? ` · Unit ${student.unit}` : ''}`
            : `👤 For ${student.name}${student.unit ? ` · Unit ${student.unit}` : ''}`;
          this.elFor.classList.remove('hidden');
        } else {
          this.elFor.classList.add('hidden');
        }
      }
      // "Cambiar pregunta": saca otra sin gastar el intento ni pasar de alumno.
      if (this.btnSkip) {
        this.btnSkip.classList.remove('hidden');
        this.btnSkip.onclick = () => {
          if (performance.now() < this._lockUntil) return;
          SFX.click?.();
          this._render(this.next(student), student, resolve);
        };
      }
      // Los pasajes se muestran con letra más pequeña y alineados a la izquierda: son
      // varias frases y hay que leerlas como un texto, no como un enunciado suelto.
      this.elQ.className = passage ? 'quiz-question passage' : 'quiz-question';
      this.elQ.textContent = q.q;
      if (this.elKind) {
        this.elKind.textContent = q.vocab ? '🔤 Vocabulary'
          : passage ? '📖 Text completion' : '✏️ Complete the sentence';
        this.elKind.classList.remove('hidden');
      }
      this.elFb.className = 'quiz-feedback hidden';
      this.elFb.textContent = '';
      this.elExplain.className = 'quiz-explain hidden';
      this.elExplain.textContent = '';
      this.btnWhy.classList.add('hidden');
      this.btnCont.classList.add('hidden');
      this.elOpts.innerHTML = '';

      // Botón "💡 Why?": muestra la explicación de gramática (por qué la respuesta es
      // correcta o incorrecta). Disponible en todos los niveles, tras responder.
      const revealWhy = () => {
        // La nota extendida es de GRAMÁTICA: en una pregunta de vocabulario no viene
        // a cuento, así que sólo se muestra la explicación del propio ítem.
        // En una partida mezclada cada pregunta trae su propio nivel CEFR.
        const note = q.vocab ? null : (GRAMMAR_NOTES[q.level || this.level] || {})[q.unit];
        this.elExplain.innerHTML = '';
        const why = document.createElement('div');
        why.className = 'why-line';
        why.textContent = `💡 ${q.why}`;
        this.elExplain.appendChild(why);
        if (note) {
          const ext = document.createElement('div');
          ext.className = 'grammar-note';
          // título del tema + nota extendida (regla + ejemplo). Los saltos de línea
          // del texto se respetan con white-space: pre-line en el CSS.
          ext.textContent = `📘 ${q.topic}\n${note}`;
          this.elExplain.appendChild(ext);
        }
        this.elExplain.className = 'quiz-explain';
        this.btnWhy.classList.add('hidden');
      };
      this.btnWhy.onclick = revealWhy;

      const order = shuffle(q.o.map((text, i) => ({ text, i })));
      let answered = false;
      const buttons = [];

      // Resuelve la pregunta con la opción elegida, venga de un toque en esta
      // pantalla o de la respuesta que ha llegado desde el móvil de un alumno.
      const settle = (pos) => {
        if (answered) return;
        answered = true;
        this.btnSkip?.classList.add('hidden'); // ya no se puede cambiar de pregunta
        const opt = order[pos];
        const b = buttons[pos];
        const correct = !!opt && opt.i === q.a;
        this.stats.asked++;
        window.ECYRBridge && window.ECYRBridge.answer(correct, { topic: q.topic, unit: q.unit, level: q.level || this.level, kind: q.vocab ? 'vocabulary' : 'grammar' });
        if (correct) {
          this.stats.correct++;
          this.stats.streak++;
          this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
          b?.classList.add('correct');
          SFX.correct();
          this.elFb.className = 'quiz-feedback good';
          this.elFb.textContent = '✔ Correct!';
        } else {
          this.stats.streak = 0;
          b?.classList.add('wrong');
          SFX.wrong();
          this.elFb.className = 'quiz-feedback bad';
          this.elFb.textContent = `✘ The correct answer was "${q.o[q.a]}".`;
        }
        for (const other of this.elOpts.children) {
          if (!correct && other.textContent === q.o[q.a]) other.classList.add('correct');
          other.disabled = true;
        }
        this.btnWhy.classList.remove('hidden');
        if (tipsES()) revealWhy();
        this.btnCont.textContent = '▶ Continue';
        this.btnCont.classList.remove('hidden');
        this.btnCont.onclick = () => { this.hide(); resolve({ correct }); };
        // el proyector avisa al móvil de cómo fue
        this.remote?.result?.({ correct, correctText: q.o[q.a], askId: this._askId });
      };

      for (let pos = 0; pos < order.length; pos++) {
        const opt = order[pos];
        const b = document.createElement('button');
        b.className = 'quiz-opt';
        b.textContent = opt.text;
        // Con pantalla central la clase LEE la pregunta aquí y responde en su
        // teléfono: los botones se ven pero no se pueden tocar en el proyector.
        // El manejador se pone igualmente, para poder reactivarlos si el envío al
        // móvil falla (alumno desconectado) y que el docente pueda seguir.
        b.disabled = !!this.remote;
        b.addEventListener('click', () => {
          // Ignora el "ghost click" que el navegador sintetiza al soltar el mismo
          // toque que abrió el modal (en móvil respondía la pregunta sola).
          if (performance.now() < this._lockUntil) return;
          settle(pos);
        });
        buttons.push(b);
        this.elOpts.appendChild(b);
      }

      // Modo pantalla central: se manda la pregunta al alumno de turno y se espera
      // su respuesta. `askId` descarta las que lleguen tarde (p. ej. si el docente
      // cambió de pregunta mientras tanto).
      if (this.remote) {
        const askId = ++this._askId;
        const sent = this.remote.ask({ q, student, options: order.map(o => o.text), askId });
        this._pending = (res) => { if (res && res.askId === askId) settle(res.index); };
        // Si no se pudo entregar (nadie conectado o ese alumno se cayó), el docente
        // responde en el proyector: se reactivan los botones y se avisa.
        if (sent === false) {
          for (const bb of buttons) bb.disabled = false;
          if (this.elFor) {
            this.elFor.textContent = '📵 Phone not reachable — answer here';
            this.elFor.classList.remove('hidden');
          }
        }
      }
    }
  }

  // Conecta el quiz con los teléfonos de la clase (modo pantalla central).
  // `transport` = { ask({q,student,options,askId}), result({correct,...}) }.
  // Con `null` vuelve al comportamiento normal de un solo dispositivo.
  setRemote(transport) {
    this.remote = transport || null;
    this._askId = this._askId || 0;
    this._pending = null;
  }
  // Entrada de la respuesta que llega por la red.
  deliverAnswer(res) { this._pending?.(res); }

  hide() {
    this.modal.classList.add('hidden');
    this.btnSkip?.classList.add('hidden');
  }
  get accuracy() { return this.stats.asked ? this.stats.correct / this.stats.asked : 1; }
}
