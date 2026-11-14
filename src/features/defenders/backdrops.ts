/* Language Defenders — scenarios painted in code. Each one is a wide backdrop drawn on a canvas:
   flat poster colours, silhouettes in layers of haze, a big moon, glowing windows and a print
   texture (halftone dots and grain). The look is neon horror-comic: dusk skies in magenta and
   orange, teal moonlight, toxic green. Nothing here is an image file. */

type Ctx = CanvasRenderingContext2D;
const W = 2400, H = 800;

/** Small seeded generator so every scenario is drawn the same on every device. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function sky(x: Ctx, stops: [number, string][]) {
  const g = x.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}

/** Billowing poster clouds: clusters of flat discs, lit from below. */
function clouds(x: Ctx, r: () => number, n: number, yMin: number, yMax: number, dark: string, lit: string, alpha = 0.55) {
  for (let i = 0; i < n; i++) {
    const cx = r() * W, cy = yMin + r() * (yMax - yMin), size = 60 + r() * 150;
    for (const [col, dy, k] of [[dark, 0, 1], [lit, size * 0.18, 0.82]] as const) {
      x.globalAlpha = alpha * (0.6 + r() * 0.4);
      x.fillStyle = col;
      x.beginPath();
      for (let j = 0; j < 9; j++) {
        const a = (j / 9) * Math.PI * 2, rr = size * k * (0.45 + r() * 0.5);
        x.moveTo(cx + Math.cos(a) * size * 1.5 + rr, cy + dy + Math.sin(a) * size * 0.45);
        x.arc(cx + Math.cos(a) * size * 1.5, cy + dy + Math.sin(a) * size * 0.45, rr, 0, Math.PI * 2);
      }
      x.fill();
    }
  }
  x.globalAlpha = 1;
}

function moon(x: Ctx, cx: number, cy: number, rad: number, col: string, glow: string, r: () => number) {
  const g = x.createRadialGradient(cx, cy, rad * 0.6, cx, cy, rad * 3.2);
  g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(cx - rad * 3.4, cy - rad * 3.4, rad * 6.8, rad * 6.8);
  x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.clip();
  x.fillStyle = 'rgba(0,0,0,.13)';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(cx + (r() - 0.5) * rad * 1.7, cy + (r() - 0.5) * rad * 1.7, rad * (0.08 + r() * 0.2), 0, 7); x.fill(); }
  x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.arc(cx + rad * 0.55, cy + rad * 0.2, rad * 1.05, 0, 7); x.fill();
  x.restore();
}

/** One row of tower blocks. `haze` (0–1) blends them into the sky so far rows read as distant. */
function towers(x: Ctx, r: () => number, base: number, minH: number, maxH: number, col: string, win: string, gap: number, winChance: number) {
  let px = -40;
  while (px < W + 40) {
    const w = 110 + r() * 190, h = minH + r() * (maxH - minH), top = base - h;
    x.fillStyle = col; x.fillRect(px, top, w, h + 4);
    // stepped crown, tanks and antennas
    if (r() < 0.5) x.fillRect(px + w * 0.2, top - 26, w * 0.6, 28);
    if (r() < 0.45) x.fillRect(px + w * (0.2 + r() * 0.6), top - 60 - r() * 60, 4, 90);
    if (r() < 0.3) x.fillRect(px + w * 0.1, top - 16, w * 0.22, 18);
    x.fillStyle = win;
    for (let wy = top + 22; wy < base - 20; wy += 34) for (let wx = px + 16; wx < px + w - 22; wx += 30) {
      if (r() < winChance) x.fillRect(wx, wy, 10, 12);
    }
    px += w + gap * (0.2 + r());
  }
}

/** Fog bank that swallows the feet of a layer. */
function mist(x: Ctx, y: number, h: number, col: string) {
  const g = x.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
  x.fillStyle = g; x.fillRect(0, y, W, h);
}

function beam(x: Ctx, ox: number, oy: number, dir: number, len: number, spread: number, col: string) {
  const g = x.createLinearGradient(ox, oy, ox + dir * len, oy + len * 0.25);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + dir * len, oy + len * 0.25 - spread); x.lineTo(ox + dir * len, oy + len * 0.25 + spread); x.fill();
}

function deadTree(x: Ctx, r: () => number, bx: number, by: number, len: number, ang: number, w: number, depth: number) {
  const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
  x.lineWidth = w; x.beginPath(); x.moveTo(bx, by);
  x.quadraticCurveTo(bx + Math.cos(ang) * len * 0.5 + (r() - 0.5) * len * 0.3, by + Math.sin(ang) * len * 0.5, ex, ey);
  x.stroke();
  if (depth <= 0) return;
  const n = 2 + (r() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) deadTree(x, r, ex, ey, len * (0.55 + r() * 0.25), ang + (r() - 0.5) * 1.5, Math.max(w * 0.62, 1.5), depth - 1);
}

function tombs(x: Ctx, r: () => number, base: number, col: string) {
  x.fillStyle = col;
  for (let px = 30; px < W; px += 90 + r() * 170) {
    const w = 46 + r() * 34, h = 70 + r() * 70;
    x.save(); x.translate(px, base); x.rotate((r() - 0.5) * 0.22);
    if (r() < 0.3) { x.fillRect(-7, -h - 34, 14, h + 34); x.fillRect(-28, -h - 6, 56, 14); }
    else { x.beginPath(); x.moveTo(-w / 2, 6); x.lineTo(-w / 2, -h + w / 2); x.arc(0, -h + w / 2, w / 2, Math.PI, 0); x.lineTo(w / 2, 6); x.fill(); }
    x.restore();
  }
}

function halftone(x: Ctx, col: string, y0: number, y1: number, step = 14) {
  x.fillStyle = col;
  for (let y = y0; y < y1; y += step) {
    const k = (y - y0) / (y1 - y0);
    for (let px = (Math.round(y / step) % 2) * step * 0.5; px < W; px += step) {
      x.beginPath(); x.arc(px, y, step * 0.46 * k, 0, 7); x.fill();
    }
  }
}

function grain(x: Ctx, r: () => number, n = 26000) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.07)';
    x.fillRect(r() * W, r() * H, 2, 2);
  }
}

function birds(x: Ctx, r: () => number, n: number, col: string) {
  x.strokeStyle = col; x.lineWidth = 3; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = r() * W, py = 40 + r() * 300, s = 6 + r() * 9;
    x.beginPath(); x.moveTo(px - s, py - s * 0.4); x.quadraticCurveTo(px - s * 0.4, py - s * 0.9, px, py); x.quadraticCurveTo(px + s * 0.4, py - s * 0.9, px + s, py - s * 0.4); x.stroke();
  }
}

function neonSign(x: Ctx, text: string, px: number, py: number, size: number, col: string, tilt = 0) {
  x.save(); x.translate(px, py); x.rotate(tilt);
  x.font = `900 ${size}px "Luckiest Guy","Arial Black",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = col; x.lineJoin = 'round';
  for (const [blur, a] of [[46, 0.9], [22, 1], [8, 1]] as const) { x.shadowBlur = blur; x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = size * 0.07; x.strokeText(text, 0, 0); }
  x.shadowBlur = 0; x.globalAlpha = 1; x.strokeStyle = '#ffffff'; x.lineWidth = size * 0.022; x.strokeText(text, 0, 0);
  x.restore();
}

/**
 * What is left standing: half-collapsed towers with their floors open to the sky, girders,
 * leaning poles trailing wires, a broken flyover, wrecked cars and heaps of rubble.
 * Drawn as the nearest silhouette, with fires glowing inside it.
 */
function wreckage(x: Ctx, r: () => number, col: string, glow: string, accent: string) {
  // broken towers
  for (let px = 60 + r() * 120; px < W; px += 330 + r() * 420) {
    const w = 120 + r() * 110, h = 250 + r() * 260, top = H - h;
    x.fillStyle = col; x.beginPath(); x.moveTo(px, H);
    x.lineTo(px, top + 60 + r() * 60);
    let cx = px; while (cx < px + w) { const step = 14 + r() * 26; cx = Math.min(px + w, cx + step); x.lineTo(cx, top + r() * 110 + (cx - px) / w * 60); }
    x.lineTo(px + w, H); x.closePath(); x.fill();
    // open floors and bare girders sticking out of the top
    x.strokeStyle = col; x.lineWidth = 4;
    for (let i = 0; i < 5; i++) { const gx = px + 10 + r() * (w - 20); x.beginPath(); x.moveTo(gx, top + 90); x.lineTo(gx + (r() - 0.5) * 30, top - 20 - r() * 70); x.stroke(); }
    x.fillStyle = accent;
    for (let fy = top + 150; fy < H - 40; fy += 46) for (let fx = px + 14; fx < px + w - 24; fx += 30) if (r() < 0.08) x.fillRect(fx, fy, 12, 16);
    // a fire inside one of the floors
    if (r() < 0.7) { const fy = top + 170 + r() * 160, fx = px + w * (0.3 + r() * 0.4); const g = x.createRadialGradient(fx, fy, 0, fx, fy, 70); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(fx - 70, fy - 70, 140, 140); }
  }
  // the flyover, snapped in two
  x.fillStyle = col;
  const by = H - 150;
  x.beginPath(); x.moveTo(-10, by); x.lineTo(760, by + 6); x.lineTo(800, by + 58); x.lineTo(770, by + 40); x.lineTo(-10, by + 34); x.fill();
  x.beginPath(); x.moveTo(980, by + 96); x.lineTo(1010, by + 40); x.lineTo(1700, by + 4); x.lineTo(1700, by + 40); x.lineTo(1020, by + 80); x.fill();
  for (const px of [120, 430, 700, 1180, 1480, 1680]) x.fillRect(px, by + 20, 34, 160);
  x.strokeStyle = col; x.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const sx = 790 + i * 7; x.beginPath(); x.moveTo(sx, by + 50); x.quadraticCurveTo(sx + 20, by + 110, sx + 6 + r() * 30, by + 130 + r() * 30); x.stroke(); }
  // leaning poles and sagging wires
  let prev: [number, number] | null = null;
  for (let px = 40 + r() * 80; px < W; px += 260 + r() * 200) {
    const lean = (r() - 0.5) * 0.5, hgt = 210 + r() * 80, tx = px + Math.sin(lean) * hgt, ty = H - Math.cos(lean) * hgt;
    x.lineWidth = 9; x.beginPath(); x.moveTo(px, H); x.lineTo(tx, ty); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(tx - 34, ty + 16); x.lineTo(tx + 34, ty + 8); x.stroke();
    if (prev && r() < 0.8) { x.lineWidth = 2; x.beginPath(); x.moveTo(prev[0], prev[1]); x.quadraticCurveTo((prev[0] + tx) / 2, Math.max(prev[1], ty) + 70, tx, ty); x.stroke(); }
    prev = [tx, ty];
  }
  // rubble, wrecked cars and their fires
  x.fillStyle = col;
  for (let px = -20; px < W; px += 50 + r() * 90) { const rw = 60 + r() * 120, rh = 20 + r() * 50; x.beginPath(); x.moveTo(px, H); x.lineTo(px + rw * 0.2, H - rh); x.lineTo(px + rw * 0.45, H - rh * 0.6); x.lineTo(px + rw * 0.7, H - rh * 1.1); x.lineTo(px + rw, H); x.fill(); }
  for (let px = 180 + r() * 200; px < W; px += 420 + r() * 380) {
    x.save(); x.translate(px, H - 30); x.rotate((r() - 0.5) * 0.3); x.fillStyle = col;
    x.beginPath(); x.roundRect(-70, -34, 140, 34, 8); x.fill(); x.beginPath(); x.roundRect(-36, -62, 78, 34, 10); x.fill();
    x.beginPath(); x.arc(-42, 2, 15, 0, 7); x.arc(44, 2, 15, 0, 7); x.fill();
    x.restore();
    const g = x.createRadialGradient(px, H - 80, 0, px, H - 80, 120); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - 120, H - 200, 240, 200);
  }
}

/* ---------- the five scenarios ---------- */
const PAINT: Record<string, (x: Ctx) => void> = {
  // Last Bell: the city at dusk, burning magenta and orange, searchlights sweeping the smoke.
  dusk(x) {
    const r = rng(11);
    sky(x, [[0, '#3a0f4a'], [0.3, '#8f1f6a'], [0.6, '#e8386f'], [0.85, '#ff9a4a'], [1, '#ffd27a']]);
    clouds(x, r, 16, 20, 380, '#5a1560', '#ff5f7e', 0.5);
    moon(x, 1960, 150, 62, '#ffd9a8', 'rgba(255,170,120,.5)', r);
    clouds(x, r, 9, 240, 520, '#7a1a66', '#ffab5e', 0.45);
    birds(x, r, 14, '#3a0f4a');
    towers(x, r, 800, 260, 520, '#b53a7a', '#ffd27a', 60, 0.1);
    mist(x, 520, 280, 'rgba(255,170,90,.55)');
    beam(x, 420, 560, 1, 900, 150, 'rgba(255,214,130,.55)');
    beam(x, 2050, 520, -1, 900, 150, 'rgba(255,214,130,.5)');
    towers(x, r, 800, 330, 640, '#5a1f6e', '#ffb35e', 110, 0.16);
    mist(x, 600, 200, 'rgba(232,56,111,.5)');
    towers(x, r, 800, 110, 300, '#2a1146', '#ff7a5e', 30, 0.12);
    wreckage(x, r, '#1a0a30', 'rgba(255,150,70,.75)', '#ff7a5e');
    halftone(x, 'rgba(58,15,74,.22)', 0, 300);
    grain(x, r);
  },
  // Moonrise Graveyard: one huge teal moon behind bare trees.
  grave(x) {
    const r = rng(23);
    sky(x, [[0, '#120a2a'], [0.45, '#2a1a52'], [0.8, '#3d2f6e'], [1, '#4a3a7a']]);
    clouds(x, r, 10, 20, 300, '#1c1240', '#3f3478', 0.6);
    moon(x, 1200, 430, 330, '#8ff0ea', 'rgba(80,220,230,.4)', r);
    clouds(x, r, 6, 480, 700, '#241a52', '#4fb8c8', 0.35);
    x.strokeStyle = '#1a1038'; x.lineCap = 'round';
    for (const [px, len, a] of [[240, 250, -1.45], [820, 300, -1.75], [1560, 290, -1.35], [2180, 260, -1.7]] as const) deadTree(x, r, px, 810, len, a, 30, 5);
    mist(x, 540, 260, 'rgba(60,170,190,.4)');
    tombs(x, r, 800, '#150c30');
    x.strokeStyle = '#0d0722';
    for (const [px, len, a] of [[-20, 330, -1.2], [2420, 340, -1.95]] as const) deadTree(x, r, px, 820, len, a, 44, 5);
    wreckage(x, r, '#0a0620', 'rgba(90,230,230,.6)', '#4fb8c8');
    halftone(x, 'rgba(18,10,42,.3)', 560, 800, 12);
    grain(x, r);
  },
  // Neon Night: a dark back street lit only by signs.
  neon(x) {
    const r = rng(37);
    sky(x, [[0, '#04060f'], [0.6, '#0a1226'], [1, '#101c3a']]);
    towers(x, r, 800, 380, 700, '#0c1730', '#12284a', 70, 0.3);
    mist(x, 420, 380, 'rgba(20,90,160,.35)');
    towers(x, r, 800, 240, 520, '#070e20', '#0f2038', 40, 0.2);
    neonSign(x, 'NO PHONES', 520, 330, 104, '#39d9ff', -0.03);
    neonSign(x, 'A1 · C1', 1230, 240, 120, '#ff3d9a', 0.02);
    neonSign(x, 'CLASS IS ON', 1900, 360, 96, '#39d9ff', 0.03);
    neonSign(x, 'ABC', 1560, 560, 84, '#b6ff3d', -0.05);
    neonSign(x, 'OPEN LATE', 900, 590, 70, '#ff3d9a', 0.04);
    wreckage(x, r, '#03050c', 'rgba(255,61,154,.6)', '#39d9ff');
    mist(x, 640, 160, 'rgba(57,217,255,.22)');
    grain(x, r, 16000);
  },
  // Toxic Lab: something went wrong in the chemistry room.
  toxic(x) {
    const r = rng(51);
    sky(x, [[0, '#1a0733'], [0.5, '#4a1280'], [0.85, '#7a2bc0'], [1, '#9a4ae0']]);
    halftone(x, 'rgba(182,255,61,.16)', 0, 420, 18);
    for (let i = 0; i < 4; i++) { // green columns of smoke with a billowing head
      const cx = 300 + i * 600 + r() * 120, top = 150 + r() * 120;
      x.fillStyle = '#5fbf1a'; x.fillRect(cx - 46, top, 92, H);
      for (const [col, k, dy] of [['#3d8f10', 1, 0], ['#8fe62a', 0.86, -10], ['#c9ff5a', 0.5, -34]] as const) {
        x.fillStyle = col;
        for (let j = 0; j < 12; j++) { const a = (j / 12) * Math.PI * 2; x.beginPath(); x.arc(cx + Math.cos(a) * 150 * k, top + dy + Math.sin(a) * 70 * k, (70 + r() * 50) * k, 0, 7); x.fill(); }
      }
    }
    mist(x, 380, 420, 'rgba(182,255,61,.35)');
    towers(x, r, 800, 200, 460, '#2a0f52', '#b6ff3d', 60, 0.14);
    towers(x, r, 800, 90, 240, '#14062e', '#ff3d9a', 30, 0.1);
    wreckage(x, r, '#0c0420', 'rgba(182,255,61,.65)', '#b6ff3d');
    grain(x, r);
  },
  // Sunset Ruins: what is left of downtown, in orange and violet print.
  ruins2(x) {
    const r = rng(67);
    sky(x, [[0, '#ff6a1e'], [0.4, '#ff9a2a'], [0.75, '#ffc93d'], [1, '#ffe27a']]);
    halftone(x, 'rgba(255,61,154,.3)', 0, 520, 16);
    clouds(x, r, 9, 30, 300, '#ff3d9a', '#ffb347', 0.4);
    moon(x, 420, 200, 90, '#fff3c4', 'rgba(255,255,220,.55)', r);
    towers(x, r, 800, 300, 600, '#b0339a', '#ffe27a', 80, 0.07);
    mist(x, 520, 280, 'rgba(255,154,42,.55)');
    towers(x, r, 800, 200, 470, '#5a2a9a', '#ffc93d', 50, 0.1);
    towers(x, r, 800, 80, 230, '#2a1560', '#ff6a1e', 20, 0.1);
    wreckage(x, r, '#1e0c44', 'rgba(255,120,30,.8)', '#ff6a1e');
    birds(x, r, 10, '#5a2a9a');
    grain(x, r);
  },
};

const canvases = new Map<string, HTMLCanvasElement>();
const thumbs = new Map<string, string>();

export const isPainted = (id: string) => id in PAINT;

export function paintBackdrop(id: string): HTMLCanvasElement {
  let c = canvases.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    PAINT[id](c.getContext('2d')!);
    canvases.set(id, c);
  }
  return c;
}

/** Small preview for the scenario picker. */
export function backdropThumb(id: string): string {
  let u = thumbs.get(id);
  if (!u) {
    const t = document.createElement('canvas');
    t.width = 480; t.height = 270;
    t.getContext('2d')!.drawImage(paintBackdrop(id), W * 0.2, 0, W * 0.6, H, 0, 0, 480, 270);
    u = t.toDataURL('image/jpeg', 0.8);
    thumbs.set(id, u);
  }
  return u;
}
