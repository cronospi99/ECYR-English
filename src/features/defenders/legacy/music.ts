// @ts-nocheck
// Language Defenders soundtrack: five original tracks made for this game, synthesised from
// scratch by scripts/defenders-soundtrack.mjs (melodic dubstep, glitch hop and the menu theme).
// "auto" plays them one after another; a fixed choice loops that track.
// Nothing from the first game's adventure music is left here.
const TRACKS = [
  { title: 'Dead Signal · dubstep', emoji: '🧟', src: '/defenders/music/dead_signal.mp3' },
  { title: 'Corridor Groove · glitch hop', emoji: '📟', src: '/defenders/music/corridor_groove.mp3' },
  { title: 'Neon Requiem · dubstep', emoji: '⚰️', src: '/defenders/music/neon_requiem.mp3' },
  { title: 'Static Hop · glitch hop', emoji: '📻', src: '/defenders/music/static_hop.mp3' },
  { title: 'Moonrise', emoji: '🌕', src: '/defenders/music/moonrise.mp3' },
];

let audio = null;   // HTMLAudioElement of the current track
let trackIdx = 0;
let volume = 0.5;
let playing = false;
let failures = 0;   // tracks in a row that could not be played
let waitingTap = false;

const stored = localStorage.getItem('ld:track');
// 'auto' rotates the playlist; a number loops that track. A choice saved for a removed track goes back to auto.
let selMode = stored !== null && stored !== 'auto' && Number(stored) >= 0 && Number(stored) < TRACKS.length ? Number(stored) : 'auto';

// The browser refused to start sound before a tap: start on the next one.
function resumeOnTap() {
  if (waitingTap) return;
  waitingTap = true;
  const go = () => {
    waitingTap = false;
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
    if (playing) playTrack(trackIdx);
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}

// A track that cannot be loaded is skipped; if none can, the game stays silent.
function skipBroken() {
  if (!playing) return;
  failures++;
  if (failures < TRACKS.length) playTrack(trackIdx + 1);
}

function playTrack(idx) {
  trackIdx = ((idx % TRACKS.length) + TRACKS.length) % TRACKS.length;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', () => { if (playing) playTrack(trackIdx + 1); });
    audio.addEventListener('error', skipBroken);
    audio.addEventListener('playing', () => { failures = 0; });
  }
  audio.loop = selMode !== 'auto';
  audio.src = TRACKS[trackIdx].src;
  audio.volume = volume;
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch((e) => { if (playing && e && e.name === 'NotAllowedError') resumeOnTap(); });
}

export function startMusic() {
  if (playing) return;
  playing = true;
  failures = 0;
  if (selMode !== 'auto') trackIdx = Number(selMode);
  playTrack(trackIdx);
}

export function stopMusic() {
  playing = false;
  if (audio) audio.pause();
}

export function isMusicPlaying() { return playing; }

export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = volume;
}

// ---- Track choice (menu and HUD) ----
export function getTracks() {
  return TRACKS.map((t) => ({ title: t.title, emoji: t.emoji }));
}

export function getTrackSelection() { return selMode; }

export function selectTrack(mode) {
  selMode = mode === 'auto' ? 'auto' : ((Number(mode) % TRACKS.length) + TRACKS.length) % TRACKS.length;
  localStorage.setItem('ld:track', String(selMode));
  if (selMode !== 'auto') trackIdx = Number(selMode);
  failures = 0;
  if (playing) playTrack(trackIdx);
}
