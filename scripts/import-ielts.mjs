#!/usr/bin/env node
/**
 * Imports the IELTS Simulator (github.com/cronospi99/IELTS-Simulator-app) into
 * the platform. The upstream repo stays untouched as the standalone version;
 * this script turns its single-file app into three files the platform owns:
 *
 *   src/features/ielts/engine/ielts-engine.js   the simulator's logic, patched
 *                                                to run inside the platform
 *   src/features/ielts/engine/overlays.html      its settings / account / session sheets
 *   src/features/ielts/styles/ielts-base.css     its layout CSS, scoped to .ielts-app
 *                                                and re-themed onto the iOS tokens
 *
 * The look itself lives in src/features/ielts/styles/ielts-skin.css (hand-written).
 *
 * To pull upstream improvements later:
 *   git clone https://github.com/cronospi99/IELTS-Simulator-app /tmp/ielts
 *   node scripts/import-ielts.mjs /tmp/ielts/index.html
 * Every patch asserts it still matches, so an upstream change that moves code
 * fails loudly here instead of breaking silently at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { applyTtsPatches } from './ielts-tts-patches.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/import-ielts.mjs <path/to/upstream/index.html>');
  process.exit(1);
}
const html = fs.readFileSync(src, 'utf8');
const outEngine = path.join(root, 'src/features/ielts/engine');
const outStyles = path.join(root, 'src/features/ielts/styles');
fs.mkdirSync(outEngine, { recursive: true });
fs.mkdirSync(outStyles, { recursive: true });

// ---------------------------------------------------------------- slicing --
const cssStart = html.indexOf('<style>') + '<style>'.length;
const cssEnd = html.indexOf('</style>');
const css = html.slice(cssStart, cssEnd);

const shellAt = html.indexOf('<div class="app-shell">');
const overlaysStart = html.indexOf('<div id="settingsOverlay"');
const overlays = html.slice(overlaysStart, shellAt).trim();

// The main script is the last <script> block (the first one is the intro curtain).
const mainStart = html.indexOf('<script>', shellAt) + '<script>'.length;
const mainEnd = html.lastIndexOf('</script>');
let js = html.slice(mainStart, mainEnd);

// ---------------------------------------------------------------- colours --
// Every fixed colour is mapped onto the platform's iOS tokens by hue family,
// so light/dark mode follows the app without touching each rule by hand.
function parseColor(raw) {
  let m = /^#([0-9a-f]{3,8})$/i.exec(raw);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(raw);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  return null;
}

function hsl({ r, g, b }) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, l, chroma: max * 255 - min * 255 };
}

const hueToken = (h) => {
  if (h < 12 || h >= 340) return 'var(--red)';
  if (h < 38) return 'var(--orange)';
  if (h < 70) return 'var(--yellow)';
  if (h < 170) return 'var(--green)';
  if (h < 195) return 'var(--teal)';
  if (h < 250) return 'var(--blue)';
  return 'var(--purple)';
};
const pct = (a) => `${Math.round(a * 100)}%`;

function mapColor(raw, prop) {
  const c = parseColor(raw);
  if (!c) return raw;
  const isShadow = /shadow|filter/.test(prop);
  const isBg = /background|fill/.test(prop);
  const isText = prop === 'color' || prop === 'caret-color' || /text-decoration/.test(prop);
  const key = `${c.r},${c.g},${c.b}`;

  // Translucent overlays from the original palette.
  if (key === '19,27,46' || key === '28,39,64') {
    return isShadow ? `rgba(0,0,0,${c.a})` : `color-mix(in srgb, var(--label) ${pct(c.a)}, transparent)`;
  }
  if (key === '201,162,39' || key === '224,189,74') return isShadow ? raw : `color-mix(in srgb, var(--ix-accent) ${pct(c.a)}, transparent)`;
  if (key === '246,243,234' || key === '236,231,216') return `color-mix(in srgb, var(--ix-on-strong) ${pct(c.a)}, transparent)`;
  if (key === '255,255,255') {
    if (c.a < 1) return raw; // highlights / glass
    return isText ? '#fff' : 'var(--ix-surface)';
  }
  if (key === '0,0,0' || isShadow) return raw;
  if (c.a < 1) return `color-mix(in srgb, ${hueToken(hsl(c).h)} ${pct(c.a)}, transparent)`;

  const { h, l, chroma } = hsl(c);
  // very dark, barely tinted colours are body text (e.g. #2a3145 navy ink)
  if (l < 0.3 && chroma < 48) return isText ? 'var(--label)' : 'var(--ix-strong)';
  if (chroma < 14) {
    // neutrals
    if (l >= 0.93) return isText ? 'var(--ix-on-strong)' : 'var(--ix-surface-2)';
    if (l >= 0.8) return isText ? 'var(--label-3)' : 'var(--ix-fill)';
    if (l >= 0.55) return isText ? 'var(--label-2)' : 'var(--separator)';
    if (l >= 0.3) return isText ? 'var(--label-2)' : 'var(--ix-strong)';
    return isText ? 'var(--label)' : 'var(--ix-strong)';
  }
  if (l >= 0.82) return isBg || !isText ? `color-mix(in srgb, ${hueToken(h)} 14%, var(--ix-surface))` : hueToken(h);
  if (l >= 0.62 && isBg) return `color-mix(in srgb, ${hueToken(h)} 35%, var(--ix-surface))`;
  return hueToken(h);
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const mapColors = (value, prop) => value.replace(COLOR_RE, (m) => mapColor(m, prop));

function mapFonts(value) {
  if (/Fraunces/i.test(value)) return 'var(--ix-display)';
  if (/IBM Plex Mono|monospace/i.test(value)) return 'var(--ix-mono)';
  if (/Caveat/i.test(value)) return 'var(--ix-script)';
  if (/Inter/i.test(value)) return 'var(--ix-sans)';
  return value;
}

// Original palette variables → role-aware tokens.
function mapVars(value, prop) {
  const bg = /background|fill|border|outline/.test(prop);
  return value
    .replace(/var\(--ink-2\)|var\(--ink\)/g, bg ? 'var(--ix-strong)' : 'var(--label)')
    .replace(/var\(--paper-2\)/g, bg ? 'var(--ix-fill)' : 'var(--ix-on-strong)')
    .replace(/var\(--paper\)/g, bg ? 'var(--ix-surface)' : 'var(--ix-on-strong)');
}

// ------------------------------------------------------------------- CSS --
// Shell pieces the platform replaces: rail, top bar, intro curtain, footer.
const DROP = new RegExp(
  String.raw`(^|[\s>+~,(])(\.intro\b|\.intro-[\w-]+|\.sidebar\b|\.side-[\w-]+|\.sb-mark|\.motiv-[\w-]+|\.mc-text|\.mc-rule|\.app-shell|\.app-col|\.app-foot|\.af-[\w-]+|\.footer-note|\.search-[\w-]+|\.sp-none|\.brand-block|nav\.tabs|\.tabs\b|\.topbar\b|\.topbar-[\w-]+|\.acct-[\w-]+|\.am-head|\.candidate-card|\.cc-lbl|\.tab-badge|\.tab-ref|#tabs|#bellBtn|\.icon-btn|#acctMenu)`,
);
const SCOPE = '.ielts-app';

function scopeSelector(sel) {
  const s = sel.trim();
  if (/^(html|body)\b/.test(s)) return null;
  if (DROP.test(` ${s}`)) return null;
  if (s === ':root') return SCOPE;
  if (s === '*') return `${SCOPE}, ${SCOPE} *`;
  if (/^(from|to|\d+%)$/.test(s)) return s;
  return `${SCOPE} ${s}`;
}

const keyframeNames = new Set();
const cssPlugin = {
  postcssPlugin: 'ielts-scope',
  Once(rootNode) {
    rootNode.walkAtRules('keyframes', (at) => {
      keyframeNames.add(at.params);
      at.params = `ix-${at.params}`;
    });
    rootNode.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
      const out = rule.selectors.map(scopeSelector).filter(Boolean);
      if (!out.length) rule.remove();
      else rule.selectors = out;
    });
    rootNode.walkDecls((d) => {
      if (/^--ico-/.test(d.prop)) return; // icon data URLs
      if (d.prop === 'font-family') d.value = mapFonts(d.value);
      if (d.prop === 'font' && /Fraunces|Plex|Inter/.test(d.value)) d.value = d.value.replace(/'[^']+'(,\s*[\w-]+)?/, (m) => mapFonts(m));
      d.value = mapVars(d.value, d.prop);
      if (!d.prop.startsWith('--')) d.value = mapColors(d.value, d.prop);
      if (/^animation(-name)?$/.test(d.prop)) {
        d.value = d.value.replace(/[A-Za-z][\w-]*/g, (w) => (keyframeNames.has(w) ? `ix-${w}` : w));
      }
    });
    rootNode.walkAtRules('media', (at) => {
      if (!at.nodes || !at.nodes.length) at.remove();
    });
  },
};

const cssOut = await postcss([cssPlugin]).process(css, { from: undefined });
const header = `/* GENERATED by scripts/import-ielts.mjs from the IELTS Simulator — do not edit.
   Layout rules of the original app, scoped to .ielts-app and re-themed onto the
   platform's iOS tokens. The visual layer is ielts-skin.css. */\n`;
fs.writeFileSync(path.join(outStyles, 'ielts-base.css'), header + cssOut.css.trim() + '\n');

// ---------------------------------------------------------- inline styles --
// style="…" attributes in the markup and in the JS templates get the same
// font and colour mapping as the stylesheet.
function mapInlineStyle(style) {
  return style
    .split(';')
    .map((decl) => {
      const i = decl.indexOf(':');
      if (i < 0) return decl;
      const prop = decl.slice(0, i).trim().toLowerCase();
      let val = decl.slice(i + 1);
      if (val.includes('${')) {
        // template expression: only map literal colours/fonts around it
        if (prop === 'font-family') return `${decl.slice(0, i)}:${mapFonts(val)}`;
        return `${decl.slice(0, i)}:${mapColors(mapVars(val, prop), prop)}`;
      }
      if (prop === 'font-family') val = mapFonts(val);
      val = mapColors(mapVars(val, prop), prop);
      return `${decl.slice(0, i)}:${val}`;
    })
    .join(';');
}
const mapStyleAttrs = (text) => text.replace(/style="([^"]*)"/g, (_m, s) => `style="${mapInlineStyle(s)}"`);

fs.writeFileSync(
  path.join(outEngine, 'overlays.html'),
  `<!-- GENERATED by scripts/import-ielts.mjs — the simulator's sheets (settings, account, session). -->\n${mapStyleAttrs(overlays)}\n`,
);

// -------------------------------------------------------------- JS patches --
function patch(label, find, replace, { all = false } = {}) {
  const count = js.split(find).length - 1;
  if (!count) throw new Error(`patch "${label}" no longer matches upstream — update scripts/import-ielts.mjs`);
  js = all ? js.split(find).join(replace) : js.replace(find, replace);
  console.log(`  ✓ ${label}${all ? ` (${count}×)` : ''}`);
}

console.log('patching engine:');
// 1. Boot on demand from the platform instead of on DOMContentLoaded.
patch('boot on demand', 'window.addEventListener("DOMContentLoaded", async ()=>{', 'window.__ieltsBoot = async ()=>{');
patch('boot closing', '  if(AUTH.enabled && AUTH.profile) render();\n});', '  if(AUTH.enabled && AUTH.profile) render();\n};');
// 2. Floating elements live inside the simulator's root so its styles apply.
patch('append to host', 'document.body.appendChild(', '__ixHost().appendChild(', { all: true });
// 3. Module changes are reported to the platform router.
patch(
  'report module changes',
  '  render();\n  window.scrollTo({top:0, behavior:"smooth"});\n}',
  '  render();\n  window.scrollTo({top:0, behavior:"smooth"});\n  window.dispatchEvent(new CustomEvent("ielts:module", { detail: mod }));\n}',
);
// 4. Chart colours read the live theme instead of fixed ink/slate.
patch('chart default colour', 'Chart.defaults.color = "#5b6478";', 'Chart.defaults.color = __ixVar("--label-2");');
patch('chart default font', `Chart.defaults.font.family = "'Inter', sans-serif";`, 'Chart.defaults.font.family = __ixVar("--ix-sans");');
patch('chart ink colours', 'color:"#131b2e"', 'color:__ixVar("--label")', { all: true });
patch('chart slate ticks', 'color:"#98a0b0"', 'color:__ixVar("--label-2")', { all: true });
patch('chart slate labels', 'color:"#5b6478"', 'color:__ixVar("--label-2")', { all: true });
patch('chart point borders', 'BorderColor:"#131b2e"', 'BorderColor:__ixVar("--label")', { all: true });
patch('chart point fill', 'pointBackgroundColor:"#fff"', 'pointBackgroundColor:__ixVar("--ix-surface")');
patch('chart grid', 'grid:{ color:"rgba(19,27,46,.08)" }', 'grid:{ color:__ixVar("--separator") }');
patch('svg tick text', ' fill="#98a0b0"', ' style="fill:var(--label-2)"', { all: true });
// 4b. The platform's migration center hands imported session files to the engine
//    (window.__ielts.importSession below → applySessionData; see src/lib/migrate.ts).
patch('session import hook', 'function applySessionData(data){', 'function applySessionData(data){');
// 4c. Uploaded speaking answers. Upstream's bare <input type=file> stored the
//    audio but nothing else: no transcript (so metrics, the language tools and
//    transcript-based marking saw an empty answer) and the player vanished on
//    the next re-render. The drop zone below sends an upload down the same
//    path as a live take, in the exam and in free practice alike.
patch('upload helpers', 'function blobToBase64(blob){', `${fs.readFileSync(path.join(root, 'scripts/ielts-audio-upload.js'), 'utf8').trim()}\n\nfunction blobToBase64(blob){`);
patch(
  'practice upload zone',
  `    <div class="upload-row">
      <span style="font-size:12px;color:var(--slate);">Or upload audio for question \${qi+1}:</span>
      <input type="file" id="audioUpload" accept="audio/*" style="font-size:12px;color:var(--slate);">
    </div>
    <div id="audioPlayback"></div>`,
  '    ${ixAudioDropHtml(slot, `Upload your recorded answer to question ${qi+1}`)}',
);
patch(
  'practice upload handler',
  `  document.getElementById("audioUpload").addEventListener("change", async e=>{
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById("audioPlayback").innerHTML =
      \`<audio controls src="\${URL.createObjectURL(file)}" style="width:100%;margin-bottom:10px;"></audio>\`;
    try{
      S.audioB64[slot] = await blobToBase64(file);
      S.audioMime[slot] = file.type || "audio/mpeg";
      renderPractice();
    }catch(err){ console.error(err); }
  });`,
  `  ixWireAudioDrop(slot, set.questions[qi], ()=>{ if(state.mod === "practice") renderPractice(); });`,
);
patch(
  'exam upload zone',
  `    <div class="upload-row">
      <span style="font-size:12px;color:var(--slate);">Or upload pre-recorded audio \${perQ ? \`for question \${qi+1}\` : "file"}:</span>
      <input type="file" id="audioUpload" accept="audio/*" style="font-size:12px;color:var(--slate);">
    </div>

    <div id="audioPlayback"></div>`,
  '    ${ixAudioDropHtml(slot, perQ ? `Upload your recorded answer to question ${qi+1}` : "Upload your recorded long turn")}',
);
patch(
  'exam upload handler',
  `  const fileInp = document.getElementById("audioUpload");
  fileInp.addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    document.getElementById("audioPlayback").innerHTML = \`<audio controls src="\${url}" style="width:100%;margin-bottom:10px;"></audio>\`;
    try{
      const b64 = await blobToBase64(file);
      S.audioB64[slot] = b64;
      S.audioMime[slot] = file.type || "audio/mpeg";
      refreshQuestionStrip(part);
    }catch(err){
      console.error(err);
    }
  });`,
  `  ixWireAudioDrop(slot, speakingSlotPrompt(slot), ()=>{
    if(speakingIsPerQuestion(part)) finishSpeakingPart(part);
    if(state.mod === "speaking" && state.speaking.part === part) renderSpeakingPart(part);
  });`,
);
// 5. Inline style attributes in templates follow the theme.
js = mapStyleAttrs(js);
console.log('  ✓ inline styles re-themed');

// 5. Listening voices: the platform's natural neural voices instead of Gemini TTS.
js = applyTtsPatches(js, (l) => console.log(`  ✓ ${l}`));

const prelude = `/* GENERATED by scripts/import-ielts.mjs from the IELTS Simulator
   (github.com/cronospi99/IELTS-Simulator-app) — do not edit by hand.
   Runs as a classic script inside the ECYR platform (see IeltsHost.tsx). */
function __ixHost(){ return document.getElementById("ielts-root") || document.body; }
function __ixVar(name){
  const el = document.getElementById("ielts-root") || document.documentElement;
  return (getComputedStyle(el).getPropertyValue(name) || "").trim() || "#8e8e93";
}
`;
const api = `
/* ---- platform bridge ---- */
window.__ielts = {
  get state(){ return state; },
  get AUTH(){ return AUTH; },
  setModule: (m) => setModule(m),
  render: () => render(),
  adoptSession: (s) => adoptSession(s),
  openSettings: () => openSettings(),
  openSessionPanel: () => openSessionPanel(),
  toggleNotifications: () => toggleNotifications(),
  notificationCount: () => (typeof notificationCount === "function" ? notificationCount() : 0),
  refreshGreeting: () => refreshGreeting(),
  importSession: (data) => applySessionData(data)
};
//# sourceURL=ielts-engine.js
`;
fs.writeFileSync(path.join(outEngine, 'ielts-engine.js'), prelude + js.trim() + '\n' + api);

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
console.log(`✓ engine   ${kb(path.join(outEngine, 'ielts-engine.js'))}`);
console.log(`✓ overlays ${kb(path.join(outEngine, 'overlays.html'))}`);
console.log(`✓ base css ${kb(path.join(outStyles, 'ielts-base.css'))}  (keyframes renamed: ${[...keyframeNames].join(', ')})`);
