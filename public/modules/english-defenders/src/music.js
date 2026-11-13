// Soundtrack de English Defenders.
// Pistas principales: 3 temas originales en MP3 que rotan automáticamente.
//   1) "Beyond the Garden Gate"
//   2) "Boots on the Cobblestone"
//   3) "Quest for the Summit"
// Si los archivos no cargan (red/formato), se usa como respaldo la banda
// sonora sintetizada en código (WebAudio), 100% libre de copyright.
const TRACKS = [
  { title: 'Boots on the Cobblestone', emoji: '🥾', src: 'assets/music/boots_on_the_cobblestone.mp3' },
  { title: 'Quest for the Summit', emoji: '🏔️', src: 'assets/music/quest_for_the_summit.mp3' },
  { title: 'Sunny Side Dash', emoji: '🌞', src: 'assets/music/sunny_side_dash.mp3' },
  { title: 'Parade on Gilded Hills', emoji: '🎺', src: 'assets/music/parade_on_gilded_hills.mp3' },
  { title: "A Cartographer's First Map", emoji: '🗺️', src: 'assets/music/a_cartographers_first_map.mp3' },
  { title: 'Victory at the Plaza', emoji: '🏆', src: 'assets/music/victory_at_the_plaza.mp3' },
  { title: 'Grand Quest Reset', emoji: '🔄', src: 'assets/music/grand_quest_reset.mp3' },
  { title: "The Hero's Quiet Return", emoji: '🌙', src: 'assets/music/the_heros_quiet_return.mp3' },
];

let audio = null;         // HTMLAudioElement de la pista actual
let trackIdx = 0;         // pista MP3 en reproducción
let usingFallback = false; // true si caímos a la música sintetizada
let volume = 0.5;         // volumen 0..1 aplicado a MP3 y respaldo
// 'auto' = rotar toda la playlist; un número = repetir esa pista concreta
let selMode = localStorage.getItem('ed:track') || 'auto';

let ctx = null;
let master = null;
let playing = false;
let timer = null;
let step = 0;
let nextTime = 0;
let songIdx = 0;
let loopsOfSong = 0;

const BPM = 112;
const STEP = 60 / BPM / 2; // corcheas

const F = (n) => 440 * Math.pow(2, n / 12);
// notas (semitonos desde A4)
const G2 = -26, A2 = -24, B2 = -22, C3 = -21, D3 = -19, E3 = -17, F3 = -16, G3 = -14, GS3 = -13;
const A3 = -12, B3 = -10, C4 = -9, D4 = -7, DS4 = -6, E4 = -5, F4 = -4, G4 = -2, GS4 = -1;
const A4 = 0, B4 = 2, C5 = 3, D5 = 5, DS5 = 6, E5 = 7, F5 = 8, G5 = 10, A5 = 12, B5 = 14, C6 = 15;
const __ = null;

// Cada canción: 8 compases × 8 corcheas = 64 pasos
const SONGS = [
 { // A — "Garden Patrol" (La menor, juguetona)
  melody: [
   A4,__,C5,__,E5,__,C5,__,  B4,__,A4,G4,A4,__,__,__,
   F4,__,A4,__,C5,__,A4,__,  G4,__,B4,__,D5,__,B4,__,
   A4,__,C5,__,E5,__,G5,__,  F5,E5,D5,C5,B4,__,G4,__,
   E4,G4,B4,__,E5,__,GS4,B4, A4,__,__,__,E4,G4,A4,__,
  ],
  bass: [
   A2,__,A2,A3,__,A2,E3,A2,  A2,__,A2,A3,__,A2,E3,G3,
   F3,__,F3,A3,__,F3,C4,F3,  G3,__,G3,B3,__,G3,D4,G3,
   A2,__,A2,A3,__,A2,E3,A2,  F3,__,F3,A3,__,F3,C4,F3,
   E3,__,E3,GS3,__,E3,B3,E3, A2,__,E3,__,A2,__,A3,__,
  ],
  counter: [
   __,__,__,__,__,__,__,__,  __,__,__,__,__,__,__,__,
   __,__,__,__,__,__,__,__,  __,__,__,__,__,__,__,__,
   E5,__,__,A5,__,__,E5,__,  C5,__,__,F5,__,__,C5,__,
   B4,__,__,E5,__,__,B4,__,  C5,__,B4,__,A4,__,__,__,
  ],
 },
 { // B — "Sunny March" (Do mayor, brillante y optimista)
  melody: [
   C5,__,E5,__,G5,__,E5,C5,  D5,__,B4,__,G4,__,__,__,
   A4,__,C5,__,E5,__,C5,A4,  F5,__,E5,D5,C5,__,__,__,
   G4,C5,E5,__,G5,__,A5,G5,  E5,__,C5,__,A4,__,F4,G4,
   E5,D5,C5,__,D5,C5,B4,D5,  C5,__,__,__,G4,E4,C4,__,
  ],
  bass: [
   C3,__,C3,G3,__,C3,E3,C3,  G2,__,G2,G3,__,G2,D3,G2,
   A2,__,A2,A3,__,A2,E3,A2,  F3,__,F3,A3,__,F3,C4,F3,
   C3,__,C3,G3,__,C3,E3,C3,  A2,__,A2,A3,__,A2,E3,A2,
   F3,__,G3,__,F3,__,G3,__,  C3,__,G3,__,C3,__,C4,__,
  ],
  counter: [
   __,__,__,__,__,__,__,__,  __,__,__,__,__,__,__,__,
   E5,__,__,__,G5,__,__,__,  A5,__,__,__,F5,__,__,__,
   __,__,__,__,__,__,__,__,  E5,__,__,__,C5,__,__,__,
   G5,__,__,__,F5,__,__,__,  E5,__,C5,__,G4,__,__,__,
  ],
 },
 { // C — "Twilight Waltz" (Re menor, misteriosa y elegante)
  melody: [
   D5,__,__,F5,__,__,A4,__,  E5,__,D5,C5,D5,__,__,__,
   F4,__,A4,__,D5,__,F5,__,  E5,__,C5,__,A4,__,__,__,
   D5,__,__,F5,__,__,A5,__,  G5,F5,E5,D5,C5,__,A4,__,
   B4,__,D5,__,GS4,__,B4,__,  A4,__,__,__,D4,F4,A4,__,
  ],
  bass: [
   D3,__,__,F3,A3,__,D3,__,  D3,__,__,F3,A3,__,D3,__,
   A2,__,__,E3,A3,__,A2,__,  F3,__,__,A3,C4,__,F3,__,
   D3,__,__,F3,A3,__,D3,__,  C3,__,__,E3,G3,__,C3,__,
   E3,__,__,GS3,B3,__,E3,__,  A2,__,D3,__,A2,__,D3,__,
  ],
  counter: [
   __,__,A5,__,__,__,__,__,  __,__,F5,__,__,__,__,__,
   __,__,__,__,__,__,__,__,  __,__,__,__,__,__,__,__,
   __,__,F5,__,__,__,D5,__,  __,__,E5,__,__,__,C5,__,
   __,__,__,__,E5,__,__,__,  A4,__,__,__,__,__,__,__,
  ],
 },
 { // D — "Final Wave" (La menor tensa, con cromatismo)
  melody: [
   A4,A4,__,A4,C5,__,A4,__,  DS5,__,D5,C5,B4,__,__,__,
   A4,A4,__,A4,E5,__,D5,__,  F5,__,E5,DS5,E5,__,__,__,
   A4,A4,__,A4,G5,__,F5,__,  E5,DS5,E5,F5,E5,__,C5,__,
   B4,C5,B4,__,GS4,__,B4,__,  A4,__,__,A4,__,__,A4,__,
  ],
  bass: [
   A2,__,E3,A2,__,A2,E3,__,  A2,__,E3,A2,__,A2,F3,E3,
   A2,__,E3,A2,__,A2,E3,__,  D3,__,A3,D3,__,D3,F3,D3,
   A2,__,E3,A2,__,A2,E3,__,  F3,__,C4,F3,__,F3,C4,__,
   E3,__,B3,E3,GS3,__,E3,__,  A2,__,A2,__,A2,__,A2,__,
  ],
  counter: [
   __,__,__,__,__,__,__,__,  __,__,__,__,__,__,__,__,
   E5,__,__,__,__,__,__,__,  D5,__,__,__,__,__,__,__,
   C5,__,__,__,__,__,__,__,  DS5,__,__,__,__,__,__,__,
   E5,__,__,__,B4,__,__,__,  A4,__,E5,__,A5,__,__,__,
  ],
 },
];

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function voice(freq, t, dur, type, vol, decay = 0.9) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur * decay);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function hat(t, vol = 0.018) {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * 0.05, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 6000;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

function scheduleStep(i, t) {
  const song = SONGS[songIdx];
  const k = i % 64;
  const m = song.melody[k], b = song.bass[k], c = song.counter[k];
  if (m !== null) voice(F(m), t, STEP * 1.9, 'square', 0.045);
  if (b !== null) voice(F(b), t, STEP * 1.6, 'triangle', 0.12);
  if (c !== null) voice(F(c), t, STEP * 2.6, 'sine', 0.028);
  if (i % 2 === 0) hat(t, i % 8 === 4 ? 0.03 : 0.014);
  // cada canción suena 2 vueltas y pasa a la siguiente
  if (k === 63) {
    loopsOfSong++;
    if (loopsOfSong >= 2) { loopsOfSong = 0; songIdx = (songIdx + 1) % SONGS.length; }
  }
}

function tick() {
  const a = ac();
  while (nextTime < a.currentTime + 0.3) {
    scheduleStep(step, Math.max(nextTime, a.currentTime + 0.01));
    nextTime += STEP;
    step++;
  }
}

// ---- Reproducción de pistas MP3 (banda sonora principal) ----
function playTrack(idx) {
  trackIdx = (idx + TRACKS.length) % TRACKS.length;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    // al terminar una pista en modo "auto", encadena con la siguiente
    // (en modo pista fija se usa audio.loop, así que 'ended' no dispara)
    audio.addEventListener('ended', () => {
      if (playing && !usingFallback) playTrack(trackIdx + 1);
    });
    // si la pista no se puede cargar/decodificar, usa el respaldo sintetizado
    audio.addEventListener('error', () => {
      if (playing && !usingFallback) startFallback();
    });
  }
  audio.loop = (selMode !== 'auto'); // pista fija: repetir; auto: encadenar
  audio.src = TRACKS[trackIdx].src;
  audio.volume = volume;
  const p = audio.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => { if (playing && !usingFallback) startFallback(); });
  }
}

// ---- Banda sonora sintetizada (respaldo) ----
function startFallback() {
  usingFallback = true;
  if (timer) return;
  const a = ac();
  step = 0;
  nextTime = a.currentTime + 0.1;
  master.gain.value = volume;
  timer = setInterval(tick, 80);
}

export function startMusic() {
  if (playing) return;
  playing = true;
  usingFallback = false;
  if (selMode !== 'auto') trackIdx = Number(selMode) % TRACKS.length;
  playTrack(trackIdx);
}

export function stopMusic() {
  playing = false;
  usingFallback = false;
  if (audio) { audio.pause(); }
  if (timer) { clearInterval(timer); timer = null; }
}

export function isMusicPlaying() { return playing; }

export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = volume;
  if (master) master.gain.value = volume;
}

// ---- Selección de pista (para el menú y el HUD) ----
// Lista de pistas disponibles: [{ title, emoji }, …]
export function getTracks() {
  return TRACKS.map((t) => ({ title: t.title, emoji: t.emoji }));
}

// Selección actual: 'auto' (rotar toda la playlist) o el índice de una pista.
export function getTrackSelection() { return selMode; }

// Elige qué escuchar: 'auto' para rotar, o el índice de una pista concreta.
export function selectTrack(mode) {
  selMode = (mode === 'auto') ? 'auto' : (Number(mode) % TRACKS.length + TRACKS.length) % TRACKS.length;
  localStorage.setItem('ed:track', String(selMode));
  if (selMode !== 'auto') {
    trackIdx = Number(selMode);
    songIdx = trackIdx % SONGS.length; // el respaldo sintetizado sigue la elección
  }
  // si ya suena una pista MP3, cambia en caliente a la nueva selección
  if (playing && !usingFallback) playTrack(trackIdx);
}
