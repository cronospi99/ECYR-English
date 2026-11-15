/* Language Defenders — neon icons. The game's own line-icon set (cyberpunk / synthwave: thin neon
   tubes with a soft glow), drawn as inline SVG so they stay sharp at any size and take the colour
   of their family. Every emoji the UI prints — in the markup, in labels the game writes at run
   time, in streak banners, even in question explanations — is swapped for its icon by a watcher
   on the game's root, so no string in the game has to change. */

const P = (d: string) => `<path d="${d}"/>`;
const C = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const T = (t: string, size = 8.5, y = 15.4) => `<text x="12" y="${y}" text-anchor="middle" font-size="${size}" font-weight="900" fill="currentColor" stroke="none" font-family="Orbitron,'Exo 2',sans-serif">${t}</text>`;
const phone = '<rect x="7" y="2.5" width="10" height="19" rx="2"/>' + P('M11 18.5h2');

const ICONS: Record<string, string> = {
  bulb: P('M9 18h6M10 21h4') + P('M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z') + P('M12 7v3'),
  star: P('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'),
  speaker: P('M4 9h4l5-4v14l-5-4H4z') + P('M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12'),
  mute: P('M4 9h4l5-4v14l-5-4H4z') + P('M17 9l5 6M22 9l-5 6'),
  book: P('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z') + P('M4 21V5M8 7h7M8 11h5'),
  warn: P('M12 3l10 18H2z') + P('M12 10v5M12 18v.01'),
  users: C(9, 8, 3.2) + P('M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5') + P('M16 4.8a3 3 0 0 1 0 6M18 14.6c1.8.6 2.8 2.4 3 5.4'),
  user: C(12, 8, 3.6) + P('M5 21c.7-4 3.4-6 7-6s6.3 2 7 6'),
  play: P('M7 4l13 8-13 8z'),
  back: P('M17 4L4 12l13 8z'),
  up: P('M12 3l7 8h-4v9H9v-9H5z'),
  next: P('M4 12h15M13 6l6 6-6 6'),
  phone,
  nophone: phone + P('M3 3l18 18'),
  check: P('M4 12.5l5 5L20 6.5'),
  cross: P('M6 6l12 12M18 6L6 18'),
  stop: C(12, 12, 9) + P('M6 6l12 12'),
  note: P('M9 18V5l11-2v13') + C(6.5, 18, 2.5) + C(17.5, 16, 2.5),
  fire: P('M12 22c-4 0-7-2.8-7-6.8 0-3.6 2.6-5.6 3.8-8.7.7 1.8 1.6 2.7 2.8 3.2C11.4 6 13 3.6 15.6 2c-.4 3.4 3.4 6.2 3.4 11.4C19 18.6 16.2 22 12 22z') + P('M12 19a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.4-2.4 2.5-4.5 1.1 2.1 2.5 2.9 2.5 4.5A2.5 2.5 0 0 1 12 19z'),
  boom: P('M12 2l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z'),
  timer: C(12, 13, 8) + P('M12 9v4l3 2M9 2h6'),
  refresh: P('M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4'),
  undo: P('M9 14L4 9l5-5') + P('M4 9h10a6 6 0 0 1 0 12h-3'),
  pencil: P('M4 20l1-5L16 4l4 4L9 19z') + P('M14 6l4 4'),
  trophy: P('M7 4h10v5a5 5 0 0 1-10 0z') + P('M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6'),
  m1: C(12, 15, 6) + P('M8 2.5l4 6.5 4-6.5') + T('1', 7, 17.5),
  m2: C(12, 15, 6) + P('M8 2.5l4 6.5 4-6.5') + T('2', 7, 17.5),
  m3: C(12, 15, 6) + P('M8 2.5l4 6.5 4-6.5') + T('3', 7, 17.5),
  puzzle: P('M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z'),
  chart: P('M4 20V4M4 20h16') + P('M8 16v-4M12 16V8M16 16v-6'),
  scene: P('M2 13h20') + P('M6.5 13a5.5 5.5 0 0 1 11 0') + P('M7.5 10.5h9M6.8 11.8h10.4') + P('M4 17h16M2 21h20M12 13v8M8 13l-3.5 8M16 13l3.5 8'),
  city: P('M3 21V11h4v10M7 21V5h5v16M12 21V9h4v12M16 21v-8h5v8M2 21h20') + P('M9 8h1M9 11h1M14 12h1'),
  es: '<rect x="2.5" y="5" width="19" height="14" rx="2"/>' + T('ES'),
  question: C(12, 12, 9.5) + P('M9.2 9.2a2.9 2.9 0 1 1 4.3 2.5c-1 .6-1.5 1.3-1.5 2.4') + P('M12 17.5v.01'),
  swords: P('M4 4l9.5 9.5M4 4h4M4 4v4M20 4l-9.5 9.5M20 4h-4M20 4v4M7 14l3 3M14 17l3-3M5 19l3-3M19 19l-3-3'),
  wave: P('M2 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 20c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3') + P('M5 9c1.5-3.5 6-5 9.5-3'),
  gear: C(12, 12, 3) + C(12, 12, 7) + P('M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1'),
  abc: P('M2.5 18l3.5-10 3.5 10M3.7 14.5h4.6') + P('M12.5 8v10h3.2a2.5 2.5 0 0 0 0-5h-3.2 2.6a2.5 2.5 0 0 0 0-5z') + P('M22 9.5a3.5 3.5 0 1 0 0 7'),
  target: C(12, 12, 9) + C(12, 12, 5) + C(12, 12, 1.2),
  pause: P('M8 5v14M16 5v14'),
  flag: P('M5 21V3M5 4h13l-3 4.5 3 4.5H5'),
  exit: P('M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10'),
  search: C(10.5, 10.5, 6.5) + P('M15.5 15.5L21 21'),
  rocket: P('M12 2c4 3 5.5 7 5 12l-3 3h-4l-3-3c-.5-5 1-9 5-12z') + C(12, 9, 1.8) + P('M7 14l-3 3 3 1M17 14l3 3-3 1M10 20l2 2 2-2'),
  home: P('M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6'),
  shield: P('M12 2l8 3v6c0 5.5-3.5 9.3-8 11-4.5-1.7-8-5.5-8-11V5z') + P('M8.5 12l2.5 2.5 4.5-5'),
  skull: P('M12 3a8 8 0 0 0-8 8c0 2.7 1.3 4.5 3 5.5V20h10v-3.5c1.7-1 3-2.8 3-5.5a8 8 0 0 0-8-8z') + C(9, 11.5, 1.8) + C(15, 11.5, 1.8) + P('M10 20v-2M14 20v-2'),
  shovel: P('M14.5 9.5L4 20') + P('M17.5 2.5l4 4-3.5 3.5a2.8 2.8 0 0 1-4-4z'),
  gamepad: P('M6 8h12a4 4 0 0 1 3.9 4.8l-1 4.4a2.5 2.5 0 0 1-4.2 1.2L14 16h-4l-2.7 2.4a2.5 2.5 0 0 1-4.2-1.2l-1-4.4A4 4 0 0 1 6 8z') + P('M7 11v3M5.5 12.5h3M16 11.5v.01M18 13.5v.01'),
  plug: P('M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5'),
  save: P('M4 4h13l3 3v13H4z') + P('M8 4v5h7V4M8 20v-6h8v6'),
  trash: P('M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6'),
  drone: '<rect x="9" y="10" width="6" height="4" rx="1"/>' + P('M3 7h6M15 7h6M6 7v3h3M18 7v3h-3M10 17l-1 2M14 17l1 2'),
  heart: P('M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z'),
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/>' + P('M8 20h8M12 16v4'),
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/>' + P('M3 6l9 7 9-7'),
  shuffle: P('M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3'),
  sprout: P('M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z'),
  bolt: P('M13 2L4 14h7l-1 8 9-12h-7z'),
  sparkle: P('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'),
  calm: C(12, 12, 9) + P('M7.5 10.5c.7-.7 1.8-.7 2.5 0M14 10.5c.7-.7 1.8-.7 2.5 0M8.5 15c2 1.6 5 1.6 7 0'),
  siren: P('M7 18v-6a5 5 0 0 1 10 0v6M5 18h14v3H5zM12 3v2M4 7l1.5 1.5M20 7l-1.5 1.5'),
  grad: P('M2 9l10-5 10 5-10 5z') + P('M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6'),
  mega: P('M3 10v4h3l9 5V5l-9 5zM18 9a4 4 0 0 1 0 6M20.5 7a7 7 0 0 1 0 10'),
  bell: P('M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z') + P('M10 21h4M12 3v2'),
  full: P('M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'),
  rad: C(12, 12, 2) + P('M12 10L9 4.8A8 8 0 0 0 4 12h6M14 12h6a8 8 0 0 0-5-7.2L12 10M13 13.7l3 5.2a8 8 0 0 1-8 0l3-5.2'),
  moon: P('M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5z'),
  palm: P('M12 21c0-5 .5-9 1-12') + P('M13 9c-2-3-6-3-9-1 3 0 6 .5 9 1zM13 9c2-3 6-3 8-1-3 0-5 .5-8 1zM13 9c-1-3-.5-5 1.5-6.5 0 2.5-.5 4.5-1.5 6.5z') + P('M6 21h12'),
  snow: P('M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7') + P('M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2'),
  ghost: P('M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z') + C(9.5, 10.5, 1) + C(14.5, 10.5, 1),
  grave: P('M6 21V9a6 6 0 0 1 12 0v12M3 21h18M12 9v6M9.5 11.5h5'),
  mushroom: P('M3 12a9 7 0 0 1 18 0z') + P('M9 12v6a3 3 0 0 0 6 0v-6') + C(8, 8.5, 1) + C(15, 8, 1.2),
  volcano: P('M2 21l7-11h6l7 11z') + P('M10 10l-1-3M12 10V5M14 10l1-3') + P('M9 15l2 1 2-1 2 1'),
  desert: P('M2 18c3-3 6-3 9 0s6 3 11 0M2 21h20') + P('M8 14V7M8 9l-2-1v-2M8 11l2-1V8') + C(18, 6, 2.5),
  temple: P('M3 9l9-5 9 5zM4 21h16M5 9v12M9 9v12M15 9v12M19 9v12'),
  pirate: P('M5 21V3M5 4h14v9H5') + C(12, 7.5, 1.6) + P('M10 11l4-1.5M14 11l-4-1.5'),
};

type Ic = [name: string, color: string];
const CY = '#2de2e6', MG = '#ff3df0', PK = '#ff3d81', YE = '#ffd23f', GR = '#8dff4a', OR = '#ff8a1e', RD = '#ff4d6d', PU = '#b48cff', WH = '#e8f6ff';
const MAP: Record<string, Ic> = {
  '💡': ['bulb', YE], '⭐': ['star', YE], '★': ['star', YE], '☆': ['star', '#8a7fb0'], '🌟': ['star', YE],
  '🔊': ['speaker', CY], '🔈': ['speaker', CY], '🔉': ['speaker', CY], '🔇': ['mute', '#8a7fb0'],
  '📚': ['book', CY], '📘': ['book', '#5cc8ff'], '📖': ['book', CY], '📗': ['book', GR], '📕': ['book', PK],
  '⚠': ['warn', YE], '👥': ['users', PU], '👤': ['user', PU],
  '▶': ['play', GR], '◀': ['back', CY], '⬆': ['up', GR], '➡': ['next', CY], '⏸': ['pause', CY],
  '📱': ['phone', CY], '📵': ['nophone', RD],
  '✅': ['check', GR], '✔': ['check', GR], '✓': ['check', GR], '✘': ['cross', RD], '✕': ['cross', RD], '❌': ['cross', RD], '⛔': ['stop', RD],
  '🎵': ['note', MG], '🎶': ['note', MG],
  '🔥': ['fire', OR], '💥': ['boom', OR], '☢': ['rad', GR], '🌋': ['volcano', OR],
  '⏳': ['timer', CY], '⏱': ['timer', CY], '⌛': ['timer', CY],
  '🔄': ['refresh', CY], '🔀': ['shuffle', CY], '↩': ['undo', CY],
  '✏': ['pencil', YE], '📝': ['pencil', YE],
  '🏆': ['trophy', YE], '🥇': ['m1', YE], '🥈': ['m2', '#cfe0ff'], '🥉': ['m3', OR],
  '🧩': ['puzzle', MG], '📊': ['chart', CY], '🌄': ['scene', MG], '🌆': ['city', MG], '🌃': ['city', PU],
  '🇪🇸': ['es', YE], '❓': ['question', MG], '❔': ['question', MG], '⚔': ['swords', PK], '🌊': ['wave', CY],
  '⚙': ['gear', CY], '🔤': ['abc', CY], '🎯': ['target', PK], '🏁': ['flag', GR], '🚩': ['flag', RD], '🚪': ['exit', PK],
  '🔍': ['search', CY], '🔎': ['search', CY], '🚀': ['rocket', MG],
  '🏠': ['home', CY], '🏡': ['home', GR], '🏚': ['home', '#9a8fb8'], '🏫': ['home', YE], '🏛': ['temple', CY],
  '🛡': ['shield', CY], '🧟': ['skull', GR], '💀': ['skull', WH], '☠': ['skull', WH], '👻': ['ghost', WH], '🪦': ['grave', PU], '🏴‍☠': ['pirate', WH],
  '⛏': ['shovel', PK], '🎮': ['gamepad', MG], '🔌': ['plug', CY], '💾': ['save', CY], '🗑': ['trash', RD], '🚁': ['drone', CY],
  '❤': ['heart', PK], '💖': ['heart', PK], '🖥': ['monitor', CY], '📨': ['mail', CY], '✉': ['mail', CY],
  '🦁': ['shield', OR], '🌐': ['scene', CY], '🌱': ['sprout', GR], '⚡': ['bolt', YE], '✨': ['sparkle', YE],
  '😌': ['calm', CY], '🚨': ['siren', RD], '🎓': ['grad', YE], '📣': ['mega', PK], '🔔': ['bell', YE], '⛶': ['full', CY],
  '🌙': ['moon', PU], '🌴': ['palm', GR], '🏖': ['palm', YE], '🏜': ['desert', OR], '❄': ['snow', '#bfefff'], '🍄': ['mushroom', PK],
};

const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
/** Any mapped symbol (with or without its emoji variation selector), or any other emoji. */
const RE = new RegExp(`(?:${KEYS.join('|')})\\uFE0F?|\\p{Extended_Pictographic}\\uFE0F?(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?)*`, 'gu');
const TEST = new RegExp(RE.source, 'u');

export function iconHTML(name: string, color: string): string {
  return `<i class="nx nx-${name}" style="--nx:${color}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ICONS.sparkle}</svg></i>`;
}

function iconFor(raw: string): string {
  const key = raw.replace(/️/g, '');
  const hit = MAP[key] ?? MAP[raw];
  return hit ? iconHTML(hit[0], hit[1]) : iconHTML('sparkle', YE);
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'svg', 'CANVAS']);

function swapText(node: Text): void {
  const s = node.nodeValue ?? '';
  if (!TEST.test(s)) return;
  const parent = node.parentNode as Element | null;
  if (!parent || SKIP.has(parent.nodeName) || (parent as Element).closest?.('.nx')) return;
  if (parent.nodeName === 'OPTION' || parent.nodeName === 'TITLE') { node.nodeValue = s.replace(RE, '').trim(); return; }
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of s.matchAll(RE)) {
    if (m.index! > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const span = document.createElement('template');
    span.innerHTML = iconFor(m[0]);
    frag.appendChild(span.content);
    last = m.index! + m[0].length;
  }
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  parent.replaceChild(frag, node);
}

function walk(root: Node): void {
  if (root.nodeType === 3) { swapText(root as Text); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (SKIP.has(el.nodeName) || el.classList?.contains('nx')) {
    if (el.nodeName === 'SELECT' || el.nodeName === 'OPTION') el.querySelectorAll?.('option').forEach((o) => { if (TEST.test(o.textContent ?? '')) o.textContent = (o.textContent ?? '').replace(RE, '').trim(); });
    return;
  }
  // tooltips can't hold icons: just drop the emoji from them
  for (const a of ['title', 'aria-label', 'placeholder']) {
    const v = el.getAttribute(a);
    if (v && TEST.test(v)) el.setAttribute(a, v.replace(RE, '').replace(/\s{2,}/g, ' ').trim());
  }
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (TEST.test(n.nodeValue ?? '')) texts.push(n as Text);
  texts.forEach(swapText);
  el.querySelectorAll('[title],[aria-label],[placeholder],option').forEach((e) => {
    if (e.nodeName === 'OPTION') { if (TEST.test(e.textContent ?? '')) e.textContent = (e.textContent ?? '').replace(RE, '').trim(); return; }
    for (const a of ['title', 'aria-label', 'placeholder']) {
      const v = e.getAttribute(a);
      if (v && TEST.test(v)) e.setAttribute(a, v.replace(RE, '').replace(/\s{2,}/g, ' ').trim());
    }
  });
}

/** Swaps every emoji under `root` for its neon icon, now and whenever the UI writes new text. */
export function neonIcons(root: HTMLElement): () => void {
  walk(root);
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') swapText(m.target as Text);
      else if (m.type === 'attributes') walk(m.target);
      else m.addedNodes.forEach((n) => walk(n));
    }
  });
  mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  return () => mo.disconnect();
}
