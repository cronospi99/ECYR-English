// Texturas procedurales estilo cartoon (paleta basada en el atlas "English Defenders").
// Si existe assets/textures/<nombre>.png se usa en su lugar (texturas del usuario).
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Intenta cargar un PNG del usuario; si falla, se queda con la textura procedural.
function withOverride(tex, name, repeat) {
  loader.load(`assets/textures/${name}.png`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    tex.image = t.image;
    tex.needsUpdate = true;
  }, undefined, () => {});
  return tex;
}

function noise(ctx, w, h, alpha, n = 900) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * alpha * 0.7})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

// Tablero 9x5 a cuadros. `pal` opcional: { l1,l2,d1,d2, blade } para escenarios.
const BOARD_DAY = { l1: '#8fbf4d', l2: '#7cae3e', d1: '#77a83a', d2: '#699733', blade: '120,160,60' };
export function makeBoardTexture(cols, rows, pal = BOARD_DAY, allowOverride = true) {
  const CELL = 96;
  const tex = canvasTex(cols * CELL, rows * CELL, (ctx, w, h) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const light = (r + c) % 2 === 0;
        const g = ctx.createLinearGradient(c * CELL, r * CELL, c * CELL, (r + 1) * CELL);
        if (light) { g.addColorStop(0, pal.l1); g.addColorStop(1, pal.l2); }
        else { g.addColorStop(0, pal.d1); g.addColorStop(1, pal.d2); }
        ctx.fillStyle = g;
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        // briznas/vetas para dar textura al mosaico
        ctx.strokeStyle = `rgba(${pal.blade || '120,160,60'},${light ? .55 : .42})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const x = c * CELL + Math.random() * CELL, y = r * CELL + Math.random() * CELL;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - 6, x + 4, y - 9); ctx.stroke();
        }
      }
    }
    noise(ctx, w, h, 0.05, 2200);
  });
  return allowOverride ? withOverride(tex, 'board') : tex;
}

export function makeDirtTexture(pal = ['#6e4f2a', '#5a3f20'], allowOverride = true) {
  const tex = canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 9, 2 + Math.random() * 5, Math.random() * 3, 0, 7);
      ctx.fill();
    }
    noise(ctx, w, h, 0.07);
  }, [10, 7]);
  return allowOverride ? withOverride(tex, 'dirt', [10, 7]) : tex;
}

// Cielo con degradado arbitrario (para los escenarios).
export function makeGradientSky(stops) {
  return canvasTex(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of stops) g.addColorStop(p, c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

export function makeStoneTexture(rep = [2, 4]) {
  const tex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8d8d85'; ctx.fillRect(0, 0, w, h);
    const S = 64;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const off = (r % 2) * S / 2;
        const shade = 120 + (Math.random() * 50 | 0);
        ctx.fillStyle = `rgb(${shade},${shade},${shade - 8})`;
        ctx.fillRect(c * S + off + 3, r * S + 3, S - 6, S - 6);
        ctx.strokeStyle = 'rgba(50,50,45,.6)'; ctx.lineWidth = 3;
        ctx.strokeRect(c * S + off + 3, r * S + 3, S - 6, S - 6);
      }
    }
    noise(ctx, w, h, 0.08);
  }, rep);
  return withOverride(tex, 'stone', rep);
}

export function makeWoodTexture() {
  const tex = canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#8a5a2b'); g.addColorStop(.5, '#7a4e24'); g.addColorStop(1, '#8a5a2b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(60,35,10,.5)';
    for (let i = 0; i < 12; i++) {
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * .05 + i) * 6);
      ctx.stroke();
    }
    noise(ctx, w, h, 0.05);
  }, [2, 2]);
  return withOverride(tex, 'wood', [2, 2]);
}

// Cielo de atardecer/día para el fondo de la escena.
export function makeSkyTexture() {
  const tex = canvasTex(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#78c4f0');
    g.addColorStop(0.55, '#a8ddf5');
    g.addColorStop(0.8, '#d8efc8');
    g.addColorStop(1, '#e8f5d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  return withOverride(tex, 'sky');
}
