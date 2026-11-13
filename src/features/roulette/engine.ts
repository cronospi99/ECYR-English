// @ts-nocheck
/* Phrasal Verb Roulette — game engine. This is the original game logic, moved into the app as it
   was: turns, wheel, timer, coins, wagers, multipliers, aids, passing, teams, podium and every
   sound. `renderVals()` turns the state into the values the screens draw (View.tsx). */

/** Minimal state holder with the same contract the engine was written against. */
class Logic {
  props = {};
  _listeners = new Set();
  _mounted = false;
  setState(patch, cb) {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    if (p) this.state = Object.assign({}, this.state, p);
    for (const l of this._listeners) l();
    if (cb) cb();
  }
  subscribe(l) { this._listeners.add(l); return () => this._listeners.delete(l); }
}

/** Full-screen colour fade between screens (white into the set-up, black into the game). */
function fade(color, fn, o = {}) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:9999;background:${color};opacity:0;pointer-events:all;transition:opacity ${o.in || 320}ms steps(6)`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    fn();
    setTimeout(() => { el.style.transition = `opacity ${o.out || 520}ms steps(8)`; el.style.opacity = '0'; setTimeout(() => el.remove(), (o.out || 520) + 60); }, o.hold || 100);
  }, (o.in || 320) + 30);
}

const THEMES = {
  overworld: {
    label: 'OVERWORLD', swatch: 'linear-gradient(#5C94FC,#9AD0FF 60%,#C84C0C 60%)',
    sky: 'linear-gradient(#1c86f2 0%,#3aa0ff 55%,#7cc6ff 100%)',
    panel: '#171a52', panel2: '#3b2a90', muted: '#cdc4ff', text: '#ffffff',
    accent: '#FFD21F', accentInk: '#000', titleShadow: '#E8780C', subInk: '#0b1f4a',
    ground: '#8a4a22', ground2: '#5f2f12', groundEdge: '#3fae2a',
    good: '#00A651', bad: '#E52521', alt: '#4a3a72', hi: '#3a2a68',
    card: '#ffffff', cardInk: '#1b1035', taskBg: '#FFF4C2', taskInk: '#8F3608', defBg: '#EAF3FF', defInk: '#0b2a4a',
    deco: [
      { top: 36, h: 190, size: '960px 190px', op: 0.92, anim: 'pv-cloudA 44s linear infinite', img: 'radial-gradient(circle at 90px 130px,#fff 0 46px,transparent 47px),radial-gradient(circle at 150px 108px,#fff 0 60px,transparent 61px),radial-gradient(circle at 218px 132px,#fff 0 44px,transparent 45px),radial-gradient(circle at 560px 120px,#fff 0 40px,transparent 41px),radial-gradient(circle at 618px 100px,#fff 0 54px,transparent 55px),radial-gradient(circle at 682px 122px,#fff 0 38px,transparent 39px)' },
      { top: 168, h: 170, size: '1340px 170px', op: 0.6, anim: 'pv-cloudB 76s linear infinite', img: 'radial-gradient(circle at 300px 110px,#fff 0 38px,transparent 39px),radial-gradient(circle at 352px 92px,#fff 0 50px,transparent 51px),radial-gradient(circle at 408px 112px,#fff 0 34px,transparent 35px),radial-gradient(circle at 980px 106px,#fff 0 44px,transparent 45px),radial-gradient(circle at 1044px 90px,#fff 0 56px,transparent 57px)' },
      { top: 326, h: 150, size: '700px 150px', op: 0.32, anim: 'pv-cloudC 108s linear infinite', img: 'radial-gradient(circle at 120px 96px,#fff 0 30px,transparent 31px),radial-gradient(circle at 166px 82px,#fff 0 40px,transparent 41px),radial-gradient(circle at 214px 98px,#fff 0 28px,transparent 29px)' }
    ]
  },
  underground: {
    label: 'UNDERGROUND', swatch: 'linear-gradient(#0d1430,#131c3f 60%,#1e293b 60%)',
    sky: 'linear-gradient(#05060f 0%,#0d1430 55%,#131c3f 100%)',
    panel: '#0e1730', panel2: '#1a2748', muted: '#8fb3e0', text: '#dce8ff',
    accent: '#22D3EE', accentInk: '#00212a', titleShadow: '#0e7490', subInk: '#bfe3ff',
    ground: '#1e293b', ground2: '#0f172a', groundEdge: '#000000',
    good: '#10B981', bad: '#F43F5E', alt: '#25315a', hi: '#22304f',
    card: '#f4f8ff', cardInk: '#0e1730', taskBg: '#DDF6FB', taskInk: '#0e7490', defBg: '#E7EDFF', defInk: '#1e2a52',
    deco: [
      { top: 60, h: 200, size: '960px 200px', op: 0.85, anim: 'pv-cloudA 38s linear infinite', img: 'radial-gradient(circle at 120px 92px,#FBD000 0 20px,#8F3608 20px 25px,transparent 26px),radial-gradient(circle at 520px 124px,#FBD000 0 16px,#8F3608 16px 20px,transparent 21px),radial-gradient(circle at 800px 70px,#FBD000 0 13px,#8F3608 13px 17px,transparent 18px)' },
      { top: 250, h: 200, size: '1340px 200px', op: 0.55, anim: 'pv-cloudB 64s linear infinite', img: 'radial-gradient(circle at 300px 110px,#FBD000 0 15px,#8F3608 15px 19px,transparent 20px),radial-gradient(circle at 940px 84px,#FBD000 0 18px,#8F3608 18px 22px,transparent 23px)' },
      { top: 440, h: 180, size: '700px 180px', op: 0.3, anim: 'pv-cloudC 92s linear infinite', img: 'radial-gradient(circle at 180px 96px,#FBD000 0 11px,#8F3608 11px 14px,transparent 15px),radial-gradient(circle at 520px 60px,#FBD000 0 9px,#8F3608 9px 12px,transparent 13px)' }
    ]
  },
  ice: {
    label: 'ICE WORLD', swatch: 'linear-gradient(#CDEBFF,#8FD6FF 60%,#6FB6D8 60%)',
    sky: 'linear-gradient(#CDEBFF 0%,#8FD6FF 55%,#EAF8FF 100%)',
    panel: '#123a55', panel2: '#1d5578', muted: '#a8dcf5', text: '#eaf8ff',
    accent: '#7DF9FF', accentInk: '#04303d', titleShadow: '#0E7490', subInk: '#0b3550',
    ground: '#6FB6D8', ground2: '#3E86AA', groundEdge: '#123a55',
    good: '#0F9D58', bad: '#E5484D', alt: '#2a6a91', hi: '#1a4d6d',
    card: '#ffffff', cardInk: '#123a55', taskBg: '#E8F6FF', taskInk: '#0b6b8f', defBg: '#F0FAFF', defInk: '#0b3550',
    deco: [
      { top: 0, h: 1080, size: '300px 400px', op: 0.9, anim: 'pv-fallDown 9s linear infinite', img: 'radial-gradient(circle at 40px 60px,#fff 0 5px,transparent 6px),radial-gradient(circle at 160px 180px,#fff 0 4px,transparent 5px),radial-gradient(circle at 250px 320px,#fff 0 6px,transparent 7px),radial-gradient(circle at 100px 300px,#fff 0 3px,transparent 4px)' },
      { top: 0, h: 1080, size: '420px 400px', op: 0.6, anim: 'pv-fallDown 15s linear infinite', img: 'radial-gradient(circle at 70px 120px,#fff 0 7px,transparent 8px),radial-gradient(circle at 300px 40px,#fff 0 5px,transparent 6px),radial-gradient(circle at 380px 260px,#fff 0 6px,transparent 7px)' },
      { top: 0, h: 1080, size: '560px 400px', op: 0.4, anim: 'pv-fallDown 24s linear infinite', img: 'radial-gradient(circle at 220px 200px,#fff 0 9px,transparent 10px),radial-gradient(circle at 480px 90px,#fff 0 8px,transparent 9px)' }
    ]
  },
  desert: {
    label: 'DESERT', swatch: 'linear-gradient(#FFD79A,#F9A03F 60%,#B45309 60%)',
    sky: 'linear-gradient(#FFE7B8 0%,#FFC46B 50%,#F9A03F 100%)',
    panel: '#3b2110', panel2: '#5a3417', muted: '#f6cf9b', text: '#fff4e2',
    accent: '#FFE066', accentInk: '#3b2110', titleShadow: '#B45309', subInk: '#4a2a0c',
    ground: '#D97706', ground2: '#B45309', groundEdge: '#3b2110',
    good: '#15803D', bad: '#DC2626', alt: '#6b4220', hi: '#6e3f1a',
    card: '#fffaf0', cardInk: '#3b2110', taskBg: '#FFF0CC', taskInk: '#92400e', defBg: '#FFF7E8', defInk: '#4a2a0c',
    deco: [
      { top: 70, h: 260, size: '1000px 260px', op: 0.5, anim: 'pv-cloudA 52s linear infinite', img: 'radial-gradient(circle at 140px 150px,#fff6e0 0 52px,transparent 53px),radial-gradient(circle at 210px 126px,#fff6e0 0 64px,transparent 65px),radial-gradient(circle at 600px 140px,#fff6e0 0 44px,transparent 45px)' },
      { top: 300, h: 220, size: '1400px 220px', op: 0.28, anim: 'pv-cloudB 84s linear infinite', img: 'radial-gradient(circle at 320px 130px,#fff 0 40px,transparent 41px),radial-gradient(circle at 1000px 112px,#fff 0 52px,transparent 53px)' },
      { top: 0, h: 1080, size: '520px 400px', op: 0.3, anim: 'pv-cloudC 96s linear infinite', img: 'radial-gradient(circle at 120px 340px,#FFF1C9 0 4px,transparent 5px),radial-gradient(circle at 400px 250px,#FFE9B0 0 3px,transparent 4px),radial-gradient(circle at 260px 380px,#FFF1C9 0 5px,transparent 6px)' }
    ]
  },
  ghost: {
    label: 'GHOST HOUSE', swatch: 'linear-gradient(#2a1440,#5b21b6 60%,#160a24 60%)',
    sky: 'linear-gradient(#120720 0%,#2a1440 52%,#5b21b6 100%)',
    panel: '#1c0f2e', panel2: '#2f1a4a', muted: '#d0b6f5', text: '#f3e9ff',
    accent: '#C084FC', accentInk: '#1c0f2e', titleShadow: '#6D28D9', subInk: '#e6d4ff',
    ground: '#160a24', ground2: '#0b0412', groundEdge: '#000000',
    good: '#34D399', bad: '#FB7185', alt: '#3d2260', hi: '#3a1f5c',
    card: '#fbf6ff', cardInk: '#1c0f2e', taskBg: '#F3E6FF', taskInk: '#6D28D9', defBg: '#EFE7FF', defInk: '#3b1d63',
    deco: [
      { top: 120, h: 300, size: '900px 300px', op: 0.5, anim: 'pv-cloudA 40s linear infinite', img: 'radial-gradient(circle at 150px 150px,#e9d5ff 0 54px,transparent 55px),radial-gradient(circle at 150px 205px,#e9d5ff 0 34px,transparent 35px),radial-gradient(circle at 560px 130px,#e9d5ff 0 40px,transparent 41px)' },
      { top: 380, h: 300, size: '1250px 300px', op: 0.3, anim: 'pv-cloudB 70s linear infinite', img: 'radial-gradient(circle at 340px 150px,#ddd6fe 0 44px,transparent 45px),radial-gradient(circle at 340px 195px,#ddd6fe 0 28px,transparent 29px),radial-gradient(circle at 980px 120px,#ddd6fe 0 36px,transparent 37px)' },
      { top: 0, h: 1080, size: '480px 400px', op: 0.55, anim: 'pv-emberRise 20s linear infinite', img: 'radial-gradient(circle at 80px 300px,#C084FC 0 4px,transparent 5px),radial-gradient(circle at 300px 140px,#A78BFA 0 3px,transparent 4px),radial-gradient(circle at 420px 330px,#E9D5FF 0 5px,transparent 6px)' }
    ]
  }
,
  castle: {
    label: 'LAVA CASTLE', swatch: 'linear-gradient(#5b0f0f,#c2410c 60%,#3f0f0f 60%)',
    sky: 'linear-gradient(#1b0505 0%,#5b0f0f 52%,#c2410c 100%)',
    panel: '#2a0f12', panel2: '#45161b', muted: '#f3b9a0', text: '#ffe9df',
    accent: '#FFB020', accentInk: '#2a0f12', titleShadow: '#7c2d12', subInk: '#ffe0cc',
    ground: '#3f0f0f', ground2: '#170303', groundEdge: '#000000',
    good: '#22C55E', bad: '#EF4444', alt: '#5a2020', hi: '#5c1c22',
    card: '#fff6ef', cardInk: '#2a0f12', taskBg: '#FFE9C7', taskInk: '#9a3412', defBg: '#FFF1E6', defInk: '#5b2210',
    deco: [
      { top: 0, h: 1080, size: '320px 400px', op: 0.85, anim: 'pv-emberRise 11s linear infinite', img: 'radial-gradient(circle at 50px 300px,#FFB020 0 5px,transparent 6px),radial-gradient(circle at 180px 120px,#FF6B00 0 4px,transparent 5px),radial-gradient(circle at 270px 340px,#FFD166 0 6px,transparent 7px)' },
      { top: 0, h: 1080, size: '460px 400px', op: 0.55, anim: 'pv-emberRise 18s linear infinite', img: 'radial-gradient(circle at 90px 200px,#FF8A3D 0 7px,transparent 8px),radial-gradient(circle at 340px 60px,#FFB020 0 5px,transparent 6px),radial-gradient(circle at 420px 300px,#FF5722 0 6px,transparent 7px)' },
      { top: 0, h: 1080, size: '620px 400px', op: 0.35, anim: 'pv-emberRise 30s linear infinite', img: 'radial-gradient(circle at 260px 240px,#FFD166 0 9px,transparent 10px),radial-gradient(circle at 540px 100px,#FF7043 0 8px,transparent 9px)' }
    ]
  },
  ocean: {"label":"UNDERWATER","swatch":"linear-gradient(#0ea5e9,#0369a1 60%,#F2D59B 60%)","sky":"linear-gradient(#38bdf8 0%,#0284c7 50%,#075985 100%)","panel":"#06283d","panel2":"#0b3b5a","muted":"#9fd8f5","text":"#e6f7ff","accent":"#FFD23F","accentInk":"#06283d","titleShadow":"#075985","subInk":"#e0f4ff","ground":"#F2D59B","ground2":"#D9B46A","groundEdge":"#7a5a1c","good":"#14B8A6","bad":"#F43F5E","alt":"#12507a","hi":"#0e4466","card":"#f5fcff","cardInk":"#06283d","taskBg":"#FFF6D6","taskInk":"#0b5a86","defBg":"#E6F6FF","defInk":"#063a5a","deco":[{"top":0,"h":1080,"size":"340px 400px","op":0.7,"anim":"pv-emberRise 12s linear infinite","img":"radial-gradient(circle at 60px 300px,rgba(255,255,255,.55) 0 8px,transparent 9px),radial-gradient(circle at 210px 120px,rgba(255,255,255,.45) 0 5px,transparent 6px),radial-gradient(circle at 300px 360px,rgba(255,255,255,.6) 0 11px,transparent 12px)"},{"top":0,"h":1080,"size":"520px 400px","op":0.45,"anim":"pv-emberRise 20s linear infinite","img":"radial-gradient(circle at 120px 200px,rgba(255,255,255,.5) 0 14px,transparent 15px),radial-gradient(circle at 420px 60px,rgba(255,255,255,.45) 0 7px,transparent 8px)"},{"top":120,"h":260,"size":"1300px 260px","op":0.18,"anim":"pv-cloudB 90s linear infinite","img":"radial-gradient(ellipse 260px 40px at 300px 130px,#fff 0 99%,transparent 100%),radial-gradient(ellipse 200px 30px at 950px 90px,#fff 0 99%,transparent 100%)"}]},
  jungle: {"label":"JUNGLE","swatch":"linear-gradient(#86efac,#15803d 60%,#5b3a1a 60%)","sky":"linear-gradient(#bbf7d0 0%,#4ade80 45%,#166534 100%)","panel":"#0f2a14","panel2":"#1a4221","muted":"#b5e8b0","text":"#eefbe9","accent":"#FACC15","accentInk":"#0f2a14","titleShadow":"#14532d","subInk":"#0b3014","ground":"#6b4423","ground2":"#4a2e15","groundEdge":"#1f1206","good":"#22C55E","bad":"#EF4444","alt":"#2b5a31","hi":"#1f4d26","card":"#fbfff6","cardInk":"#0f2a14","taskBg":"#FEF9C3","taskInk":"#166534","defBg":"#ECFCE5","defInk":"#14361a","deco":[{"top":0,"h":1080,"size":"360px 400px","op":0.85,"anim":"pv-fallDown 13s linear infinite","img":"radial-gradient(ellipse 14px 7px at 60px 80px,#15803d 0 99%,transparent 100%),radial-gradient(ellipse 12px 6px at 250px 240px,#65a30d 0 99%,transparent 100%),radial-gradient(ellipse 10px 5px at 160px 350px,#166534 0 99%,transparent 100%)"},{"top":0,"h":1080,"size":"520px 400px","op":0.5,"anim":"pv-fallDown 21s linear infinite","img":"radial-gradient(ellipse 18px 9px at 100px 160px,#4d7c0f 0 99%,transparent 100%),radial-gradient(ellipse 16px 8px at 420px 40px,#15803d 0 99%,transparent 100%)"},{"top":0,"h":1080,"size":"640px 400px","op":0.55,"anim":"pv-cloudC 60s linear infinite","img":"radial-gradient(circle at 200px 220px,#fef08a 0 4px,transparent 5px),radial-gradient(circle at 520px 90px,#fde047 0 3px,transparent 4px)"}]},
  space: {"label":"SPACE","swatch":"linear-gradient(#0b0620,#1e1b4b 60%,#6b7280 60%)","sky":"radial-gradient(ellipse at 70% 30%,#312e81 0%,#1e1b4b 35%,#05030f 100%)","panel":"#0d0a24","panel2":"#1c1740","muted":"#b4b0ec","text":"#eeeaff","accent":"#F472B6","accentInk":"#1a0718","titleShadow":"#4338ca","subInk":"#e0dcff","ground":"#6b7280","ground2":"#4b5563","groundEdge":"#1f2937","good":"#34D399","bad":"#FB7185","alt":"#2e2766","hi":"#29225a","card":"#f8f7ff","cardInk":"#0d0a24","taskBg":"#FCE7F3","taskInk":"#9d174d","defBg":"#EEF0FF","defInk":"#1e1b4b","deco":[{"top":0,"h":1080,"size":"300px 300px","op":0.95,"anim":"pv-cloudA 120s linear infinite","img":"radial-gradient(circle at 30px 40px,#fff 0 2px,transparent 3px),radial-gradient(circle at 140px 190px,#fff 0 1px,transparent 2px),radial-gradient(circle at 250px 90px,#c7d2fe 0 2px,transparent 3px),radial-gradient(circle at 90px 270px,#fff 0 1px,transparent 2px)"},{"top":0,"h":1080,"size":"470px 420px","op":0.7,"anim":"pv-cloudB 200s linear infinite","img":"radial-gradient(circle at 80px 120px,#fbcfe8 0 3px,transparent 4px),radial-gradient(circle at 360px 310px,#fff 0 2px,transparent 3px),radial-gradient(circle at 240px 40px,#a5b4fc 0 2px,transparent 3px)"},{"top":90,"h":300,"size":"1900px 300px","op":0.9,"anim":"pv-cloudC 160s linear infinite","img":"radial-gradient(circle at 1500px 150px,#f59e0b 0 70px,#b45309 70px 76px,transparent 77px),radial-gradient(ellipse 130px 16px at 1500px 150px,transparent 0 60%,#fcd34d 61% 70%,transparent 71%)"}]},
  candy: {"label":"CANDY LAND","swatch":"linear-gradient(#fbcfe8,#f9a8d4 60%,#a78bfa 60%)","sky":"linear-gradient(#fdf2f8 0%,#fbcfe8 50%,#f9a8d4 100%)","panel":"#4a1340","panel2":"#6b1f5c","muted":"#fbd0ec","text":"#fff0fa","accent":"#7DD3FC","accentInk":"#3b0a33","titleShadow":"#BE185D","subInk":"#6b1147","ground":"#a78bfa","ground2":"#8b5cf6","groundEdge":"#4c1d95","good":"#10B981","bad":"#E11D48","alt":"#7c2d6c","hi":"#6a1f5b","card":"#ffffff","cardInk":"#4a1340","taskBg":"#E0F2FE","taskInk":"#9d174d","defBg":"#FDF2F8","defInk":"#5b1348","deco":[{"top":0,"h":1080,"size":"280px 360px","op":0.9,"anim":"pv-fallDown 10s linear infinite","img":"radial-gradient(ellipse 4px 11px at 40px 60px,#f43f5e 0 99%,transparent 100%),radial-gradient(ellipse 11px 4px at 170px 200px,#38bdf8 0 99%,transparent 100%),radial-gradient(ellipse 4px 11px at 240px 320px,#facc15 0 99%,transparent 100%),radial-gradient(ellipse 11px 4px at 90px 300px,#34d399 0 99%,transparent 100%)"},{"top":60,"h":220,"size":"1100px 220px","op":0.85,"anim":"pv-cloudA 58s linear infinite","img":"radial-gradient(circle at 120px 120px,#fff 0 46px,transparent 47px),radial-gradient(circle at 180px 96px,#fff 0 58px,transparent 59px),radial-gradient(circle at 246px 122px,#fff 0 42px,transparent 43px),radial-gradient(circle at 700px 110px,#fde2f3 0 44px,transparent 45px),radial-gradient(circle at 760px 92px,#fde2f3 0 54px,transparent 55px)"},{"top":0,"h":1080,"size":"460px 400px","op":0.6,"anim":"pv-emberRise 24s linear infinite","img":"radial-gradient(circle at 120px 300px,#fff 0 6px,transparent 7px),radial-gradient(circle at 380px 120px,#fef9c3 0 5px,transparent 6px)"}]},
  neon: {"label":"NEON ARCADE","swatch":"linear-gradient(#0f0524,#7e22ce 60%,#06b6d4 60%)","sky":"linear-gradient(#07010f 0%,#1e0638 55%,#4c1d95 100%)","panel":"#10041f","panel2":"#220a3d","muted":"#e0b3ff","text":"#fbeaff","accent":"#22F5C8","accentInk":"#04241d","titleShadow":"#db2777","subInk":"#f5d0fe","ground":"#0b0217","ground2":"#22d3ee","groundEdge":"#f0abfc","good":"#22C55E","bad":"#F43F5E","alt":"#3b1466","hi":"#2d0f52","card":"#fdf8ff","cardInk":"#10041f","taskBg":"#DCFCF3","taskInk":"#86198f","defBg":"#F5EDFF","defInk":"#2e0b52","deco":[{"top":620,"h":380,"size":"120px 60px","op":0.45,"anim":"pv-cloudA 30s linear infinite","img":"linear-gradient(90deg,#f0abfc 0 2px,transparent 2px),linear-gradient(0deg,#22d3ee 0 2px,transparent 2px)"},{"top":0,"h":600,"size":"360px 320px","op":0.9,"anim":"pv-cloudB 140s linear infinite","img":"radial-gradient(circle at 40px 50px,#fff 0 2px,transparent 3px),radial-gradient(circle at 200px 180px,#f0abfc 0 2px,transparent 3px),radial-gradient(circle at 300px 90px,#67e8f9 0 2px,transparent 3px),radial-gradient(circle at 120px 260px,#fff 0 1px,transparent 2px)"},{"top":70,"h":340,"size":"1900px 340px","op":0.85,"anim":"pv-cloudC 200s linear infinite","img":"radial-gradient(circle at 1450px 190px,transparent 0 118px,#f472b6 118px 124px,transparent 125px),linear-gradient(transparent 0 0)"}]},
  autumn: {"label":"AUTUMN WOODS","swatch":"linear-gradient(#fed7aa,#ea580c 60%,#78350f 60%)","sky":"linear-gradient(#fff1dc 0%,#fdba74 55%,#f97316 100%)","panel":"#3a1c0a","panel2":"#5a2c10","muted":"#fcd3a8","text":"#fff3e6","accent":"#FDE047","accentInk":"#3a1c0a","titleShadow":"#9a3412","subInk":"#4a1e06","ground":"#78350f","ground2":"#5a270a","groundEdge":"#2a1003","good":"#16A34A","bad":"#DC2626","alt":"#6d3413","hi":"#6a3010","card":"#fffaf2","cardInk":"#3a1c0a","taskBg":"#FEF3C7","taskInk":"#9a3412","defBg":"#FFF4E6","defInk":"#4a1e06","deco":[{"top":0,"h":1080,"size":"340px 400px","op":0.9,"anim":"pv-fallDown 12s linear infinite","img":"radial-gradient(ellipse 13px 8px at 50px 70px,#dc2626 0 99%,transparent 100%),radial-gradient(ellipse 12px 7px at 230px 220px,#f59e0b 0 99%,transparent 100%),radial-gradient(ellipse 10px 6px at 150px 340px,#b45309 0 99%,transparent 100%)"},{"top":0,"h":1080,"size":"500px 400px","op":0.6,"anim":"pv-fallDown 19s linear infinite","img":"radial-gradient(ellipse 17px 10px at 120px 150px,#ea580c 0 99%,transparent 100%),radial-gradient(ellipse 15px 9px at 400px 50px,#facc15 0 99%,transparent 100%)"},{"top":80,"h":220,"size":"1200px 220px","op":0.45,"anim":"pv-cloudB 80s linear infinite","img":"radial-gradient(circle at 200px 120px,#fff7ed 0 44px,transparent 45px),radial-gradient(circle at 262px 98px,#fff7ed 0 56px,transparent 57px),radial-gradient(circle at 900px 110px,#fff7ed 0 40px,transparent 41px)"}]}
};

const TEAM_COLORS = ['#E52521', '#049CD8', '#43B047', '#FBD000'];
const SUBJECTS = ['I', 'You', 'He', 'She', 'It', 'We', 'They', 'My brother', 'My best friend', 'The teacher', 'Nobody', 'Everyone', 'My parents', 'Somebody', 'This class', 'Our neighbour'];
const CONTEXTS = [
  'At the airport', 'In a job interview', 'At the doctor\u2019s', 'In a supermarket', 'During a football match',
  'At a birthday party', 'In class, talking to your teacher', 'At a restaurant', 'On the phone with a friend',
  'At the train station', 'In a hotel reception', 'At the gym', 'On holiday abroad', 'Talking to your boss',
  'At home with your family', 'In a bank', 'Shopping for clothes', 'At the cinema', 'Planning a weekend trip',
  'Moving into a new flat', 'In a museum', 'At a music festival', 'Waiting at the bus stop', 'In a driving lesson',
  'At a friend’s sleepover', 'On a school trip', 'During a thunderstorm', 'At a job fair', 'In a hospital waiting room',
  'At a wedding', 'On a camping trip', 'During a power cut', 'At a video game tournament', 'Volunteering at an animal shelter',
  'At the hairdresser’s', 'In a lift that gets stuck', 'On a first date', 'At the beach', 'During a school play'
];

export class Engine extends Logic {
  state = {
    screen: 'menu', front: true, pool: [], nameInput: '', students: [],
    levels: ['A1', 'A2'], rounds: 10, sound: true, randomOrder: false,
    sfxVol: 80, audioOpen: false,
    theme: 'overworld', wagerOn: true, multOn: true, aidsPer: 3, penalty: 5,
    teamsOn: false, teamCount: 2, subjOn: true, ctxOn: true, subject: null, context: null,
    round: 1, order: [], turn: 0, currentIdx: null, passedTo: null,
    segments: [], picks: [], rot: 0, spinning: false, card: null, tense: null,
    prizeInput: '',
    mult: 1, wager: 0, defShown: false, esShown: false, exShown: false, startShown: false,
    conjShown: false, teacherHelp: false, aidGain: false, bonusSeg: -1, endPhase: 'board',
    time: 30, running: false, bump: null, pop: null, scale: 1, joinInput: ''
  };

  _fit = () => {
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = document.documentElement.clientHeight || window.innerHeight;
    if (!w || !h) return false;
    const scale = Math.min(w / 1920, h / 1080);
    if (scale > 0 && Math.abs(scale - this.state.scale) > 0.0005) this.setState({ scale });
    return true;
  };

  fx(color, fn, o) { fade(color, fn, o); }
  // From the title screen into the set-up: a tile only preloads a way of playing.
  leaveFront(preset, label, focusPrize) {
    this.fx('white', () => {
      this.setState(Object.assign({ front: false }, preset || {}));
      if (label) setTimeout(() => this.showPop(label, '#FBD000'), 500);
      if (focusPrize) setTimeout(() => { const el = document.querySelector('[data-prize]'); if (el) el.focus(); }, 700);
    }, { in: 380, hold: 120, out: 620 });
  }
  componentDidMount() {
    try {
      const a = JSON.parse(localStorage.getItem('pvr-audio') || 'null');
      if (a) this.setState({ sfxVol: a.sfxVol != null ? a.sfxVol : 80, sound: a.sound !== false });
    } catch (e) {}
    import('./data').then(m => {
      this._ctxGroups = m.CONTEXT_GROUPS || {}; this._ctxGeneral = m.GENERAL_CONTEXTS || [];
      this.setState({ pool: m.VERBS }, () => this.buildSegments());
    });
    this._fit();
    window.addEventListener('resize', this._fit);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(this._fit);
      this._ro.observe(document.documentElement);
      this._ro.observe(document.body);
    }
    const t0 = Date.now();
    this._fitPoll = setInterval(() => {
      if (this._fit() || Date.now() - t0 > 2500) clearInterval(this._fitPoll);
    }, 50);
  }
  saveAudio() {
    const s = this.state;
    try { localStorage.setItem('pvr-audio', JSON.stringify({ sfxVol: s.sfxVol, sound: s.sound })); } catch (e) {}
    this.applyVolumes();
  }
  toggleSfx = () => this.setState(s => ({ sound: !s.sound }), () => { this.saveAudio(); this.sfx('click'); });
  componentWillUnmount() {
    if (this._ac) this._ac.close();
    clearInterval(this._t); clearTimeout(this._sp); clearTimeout(this._pop); clearInterval(this._fitPoll); clearTimeout(this._end1); clearTimeout(this._end2);
    window.removeEventListener('resize', this._fit);
    if (this._ro) this._ro.disconnect();
  }

  // ---------- sound ----------
  ctx() {
    if (!this._ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      this._ac = new C();
      this._sfxBus = this._ac.createGain(); this._sfxBus.connect(this._ac.destination);
            this.applyVolumes();
    }
    if (this._ac.state === 'suspended') this._ac.resume();
    return this._ac;
  }
  ac() { return this.state.sound ? this.ctx() : null; }
  applyVolumes() {
    if (!this._ac) return;
    const s = this.state, now = this._ac.currentTime;
    this._sfxBus.gain.setTargetAtTime(Math.pow(s.sfxVol / 100, 1.6) * 1.4, now, 0.03);
  }
  beep(freq, dur, type, vol, delay) {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol == null ? 0.16 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  sfx(kind) {
    if (kind === 'coin') { this.beep(988, 0.08, 'square', 0.18, 0); this.beep(1319, 0.42, 'square', 0.18, 0.08); }
    else if (kind === 'wrong') { this.beep(196, 0.18, 'sawtooth', 0.16, 0); this.beep(147, 0.34, 'sawtooth', 0.16, 0.16); }
    else if (kind === 'pass') { [523, 659, 784].forEach((f, i) => this.beep(f, 0.1, 'triangle', 0.14, i * 0.07)); }
    else if (kind === 'click') { this.beep(660, 0.06, 'square', 0.1, 0); }
    else if (kind === 'aid') { [784, 988, 1175].forEach((f, i) => this.beep(f, 0.09, 'triangle', 0.13, i * 0.06)); }
    else if (kind === 'time') { [660, 880].forEach((f, i) => this.beep(f, 0.12, 'sine', 0.16, i * 0.1)); }
    else if (kind === 'jackpot') { [1047, 1319, 1568, 2093].forEach((f, i) => this.beep(f, 0.13, 'square', 0.15, i * 0.09)); }
    else if (kind === 'stop') { this.beep(880, 0.09, 'square', 0.18, 0); this.beep(1175, 0.09, 'square', 0.18, 0.1); this.beep(1568, 0.3, 'square', 0.18, 0.2); }
    else if (kind === 'over') { [659, 587, 523, 392].forEach((f, i) => this.beep(f, 0.3, 'triangle', 0.18, i * 0.22)); }
    else if (kind === 'spin') { for (let i = 0; i < 34; i++) this.beep(520 + (i % 3) * 90, 0.04, 'square', 0.07, Math.pow(i / 34, 2.1) * 4.4); }
  }

  // ---------- tenses ----------
  tensePool(level) {
    const A2 = [
      { n: 'PRESENT SIMPLE', h: 'I / she usually …' },
      { n: 'PRESENT CONTINUOUS', h: 'I am / she is … -ing' },
      { n: 'PAST SIMPLE', h: 'Yesterday I …' },
      { n: 'FUTURE: GOING TO', h: 'I am going to …' },
      { n: 'CAN / CAN\u2019T', h: 'I can … / I can\u2019t …' }
    ];
    const B1 = A2.concat([
      { n: 'PRESENT PERFECT', h: 'I have already …' },
      { n: 'FUTURE: WILL', h: 'I think I will …' },
      { n: 'PAST CONTINUOUS', h: 'I was … -ing when …' },
      { n: 'SHOULD / MUST', h: 'You should … / You must …' },
      { n: 'NEGATIVE FORM', h: 'I don\u2019t / didn\u2019t …' }
    ]);
    const B2 = B1.concat([
      { n: 'PRESENT PERFECT CONT.', h: 'I have been … -ing' },
      { n: 'PAST PERFECT', h: 'I had … before …' },
      { n: 'FIRST CONDITIONAL', h: 'If I …, I will …' },
      { n: 'SECOND CONDITIONAL', h: 'If I …, I would …' },
      { n: 'PASSIVE VOICE', h: 'It was … by …' },
      { n: 'QUESTION FORM', h: 'Do you …? / Did you …?' }
    ]);
    const C1 = B2.concat([
      { n: 'THIRD CONDITIONAL', h: 'If I had …, I would have …' },
      { n: 'FUTURE PERFECT', h: 'By 2030 I will have …' },
      { n: 'PAST PERFECT CONT.', h: 'I had been … -ing' },
      { n: 'REPORTED SPEECH', h: 'She said that she …' },
      { n: 'MIXED CONDITIONAL', h: 'If I had …, I would be …' }
    ]);
    return level === 'A2' ? A2 : level === 'B1' ? B1 : level === 'B2' ? B2 : C1;
  }
  pickSubject() { return this.state.subjOn ? SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)] : null; }
  pickContext(card) {
    if (!this.state.ctxOn) return null;
    const G = this._ctxGroups || {};
    let list = [];
    (card && card.ctx || []).forEach(k => { list = list.concat(G[k] || []); });
    if (!list.length) list = CONTEXTS.concat(this._ctxGeneral || []);
    const cur = this.state.context;
    const opts = list.length > 1 ? list.filter(c => c !== cur) : list;
    return opts[Math.floor(Math.random() * opts.length)];
  }
  teamOf(p) { return Math.min(p.team || 0, this.state.teamCount - 1); }
  pickTense(level) {
    if (level === 'A1') return null;
    const p = this.tensePool(level);
    return p[Math.floor(Math.random() * p.length)];
  }
  baseTime(level) { return level === 'A1' ? 60 : level === 'A2' ? 40 : 30; }
  // catch-up balance: gap > 75% of the leader's score → leader capped, trailers boosted
  standing(i) {
    const s = this.state; if (i == null || !s.students[i]) return 'normal';
    const val = j => s.teamsOn ? s.students.filter(p => p.team === s.students[j].team).reduce((a, p) => a + p.score, 0) : s.students[j].score;
    const vals = s.students.map((p, j) => val(j));
    const top = Math.max.apply(null, vals), low = Math.min.apply(null, vals);
    if (top <= 0) return 'normal';
    const far = v => top - v > top * 0.75;
    if (vals[i] === top && far(low)) return 'leader';
    if (far(vals[i])) return 'trailing';
    return 'normal';
  }
  rollMult(i) {
    if (!this.state.multOn) return 1;
    const st = this.standing(i), r = Math.random();
    if (st === 'leader') return 1;
    if (st === 'trailing') return r < 0.35 ? 1 : r < 0.55 ? 2 : r < 0.7 ? 3 : r < 0.87 ? 4 : 5;
    return r < 0.6 ? 1 : r < 0.85 ? 2 : 3;
  }

  // ---------- data ----------
  filtered() { const L = this.state.levels; return this.state.pool.filter(v => L.indexOf(v.level) >= 0); }
  buildSegments() {
    const pool = this.filtered(); if (!pool.length) return;
    const n = 12, picks = [], used = {};
    const seen = this._seen || (this._seen = {});
    const fresh = pool.filter(v => !seen[v.pv]);
    const src = fresh.length >= n ? fresh : (this._seen = {}, pool);
    while (picks.length < Math.min(n, src.length)) {
      const v = src[Math.floor(Math.random() * src.length)];
      if (!used[v.pv]) { used[v.pv] = 1; picks.push(v); }
    }
    const bonusSeg = Math.floor(Math.random() * picks.length);
    this.setState({ segments: this.geom(picks, bonusSeg), picks, bonusSeg });
  }
  geom(picks, bonusSeg) {
    const cx = 310, cy = 310, r = 300, n = picks.length, step = 360 / n;
    return picks.map((v, i) => {
      const a0 = (i * step - 90) * Math.PI / 180, a1 = ((i + 1) * step - 90) * Math.PI / 180;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const mid = i * step + step / 2 - 90, mr = mid * Math.PI / 180;
      const tx = cx + r * 0.66 * Math.cos(mr), ty = cy + r * 0.66 * Math.sin(mr);
      const flip = mid > 90 || mid < -90;
      const label = v.pv.length > 15 ? v.pv.slice(0, 14) + '…' : v.pv;
      return {
        d: 'M' + cx + ' ' + cy + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z',
        fill: v.color, label: label,
        lx: (tx / 620 * 100).toFixed(2), ly: (ty / 620 * 100).toFixed(2),
        lrot: (flip ? mid + 180 : mid).toFixed(1),
        bonus: i === bonusSeg,
        bx: ((cx + r * 0.33 * Math.cos(mr)) / 620 * 100).toFixed(2),
        by: ((cy + r * 0.33 * Math.sin(mr)) / 620 * 100).toFixed(2)
      };
    });
  }

  // ---------- menu ----------
  smallestTeam(list) {
    const counts = Array.from({ length: this.state.teamCount }, () => 0);
    list.forEach(p => { counts[Math.min(p.team || 0, counts.length - 1)]++; });
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] < counts[best]) best = i;
    return best;
  }
  addStudent = () => {
    const n = this.state.nameInput.trim();
    if (!n || this.state.students.length >= 24) return;
    this.sfx('click');
    this.setState(s => ({ students: s.students.concat([{ name: n, score: 0, aids: s.aidsPer, team: this.smallestTeam(s.students) }]), nameInput: '' }));
  };
  joinStudent = () => {
    const n = this.state.joinInput.trim();
    if (!n || this.state.students.length >= 24) return;
    this.sfx('coin');
    this.setState(s => {
      const i = s.students.length;
      const order = s.order.slice();
      order.splice(s.turn + 1, 0, i);
      return {
        students: s.students.concat([{ name: n, score: 0, aids: s.aidsPer, team: this.smallestTeam(s.students) }]),
        order, joinInput: ''
      };
    });
  };
  toggleLevel(id) {
    this.sfx('click');
    this.setState(s => ({ levels: s.levels.indexOf(id) >= 0 ? s.levels.filter(x => x !== id) : s.levels.concat([id]) }), () => this.buildSegments());
  }
  roundsFrom(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    const v = Math.max(1, Math.min(100, Math.ceil(p * 100)));
    if (v !== this.state.rounds) { this.sfx('click'); this.setState({ rounds: v }); }
  }
  startGame = () => {
    const s = this.state;
    if (s.students.length < 2 || !s.levels.length) return;
    let order = s.students.map((_, i) => i);
    if (s.randomOrder) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    if (s.teamsOn) {
      const buckets = Array.from({ length: s.teamCount }, () => []);
      order.forEach(i => buckets[Math.min(s.students[i].team || 0, s.teamCount - 1)].push(i));
      const woven = [];
      for (let k = 0; buckets.some(b => b.length > k); k++) buckets.forEach(b => { if (b[k] != null) woven.push(b[k]); });
      order = woven;
    }
    this._seen = {};
    this.sfx('stop');
    this.setState({
      screen: 'game', order, turn: 0, round: 1, currentIdx: order[0], card: null, tense: null, subject: null, context: null,
      passedTo: null, wager: 0, mult: 1, pop: null, bump: null,
      students: s.students.map(p => ({ name: p.name, score: 0, aids: s.aidsPer, team: Math.min(p.team || 0, s.teamCount - 1) }))
    }, () => this.buildSegments());
  };

  // ---------- game ----------
  activeIdx() { const s = this.state; return s.passedTo != null ? s.passedTo : s.currentIdx; }

  spin = () => {
    if (this.state.spinning || this.state.card || !this.state.segments.length) return;
    this.sfx('spin');
    const n = this.state.segments.length, k = Math.floor(Math.random() * n), step = 360 / n;
    const target = -(k * step) - step / 2;
    const cur = this.state.rot;
    const delta = ((target - cur) % 360 + 360) % 360;
    this.setState({ spinning: true, rot: cur + 360 * 6 + delta });
    clearTimeout(this._sp);
    this._sp = setTimeout(() => {
      const card = this.state.picks[k];
      if (this._seen) this._seen[card.pv] = 1;
      const mult = this.rollMult(this.activeIdx());
      this.sfx('stop');
      if (mult > 1) setTimeout(() => this.sfx('jackpot'), 420);
      const idx = this.activeIdx();
      const lucky = k === this.state.bonusSeg && this.state.aidsPer > 0;
      this.setState(st => ({
        students: lucky ? st.students.map((p, i) => i === idx ? { name: p.name, score: p.score, aids: p.aids + 1, team: p.team } : p) : st.students,
        aidGain: lucky,
        spinning: false, card, tense: this.pickTense(card.level), subject: this.pickSubject(), context: this.pickContext(card), mult, wager: 0,
        defShown: false, esShown: false, exShown: false, startShown: false, conjShown: false, teacherHelp: false, time: this.baseTime(card.level), running: false
      }), () => { if (lucky) setTimeout(() => this.sfx('aid'), 220); });
    }, 4700);
  };
  startTimer() {
    clearInterval(this._t);
    this._t = setInterval(() => {
      this.setState(s => {
        if (!s.running) return null;
        const t = s.time - 1;
        if (t <= 0) { clearInterval(this._t); this.sfx('wrong'); return { time: 0, running: false }; }
        if (t <= 5) this.beep(440, 0.07, 'square', 0.12, 0);
        return { time: t };
      });
    }, 1000);
  }
  addTime = () => {
    if (!this.state.card) return;
    this.sfx('time');
    this.setState(s => ({ time: Math.min(s.time + this.baseTime(s.card.level) / 2, 300) }), () => { if (this.state.running) this.startTimer(); });
  };
  toggleTimer = () => {
    const s = this.state;
    if (!s.card) return;
    if (s.running) { clearInterval(this._t); this.sfx('click'); this.setState({ running: false }); return; }
    if (s.time <= 0) return;
    this.sfx('click');
    this.setState({ running: true }, () => this.startTimer());
  };
  showPop(text, color) {
    clearTimeout(this._pop);
    this.setState({ pop: { text, color } });
    this._pop = setTimeout(() => this.setState({ pop: null }), 1150);
  }
  award(correct) {
    const s = this.state, idx = this.activeIdx();
    const base = (this.props.pointsPerCorrect != null ? this.props.pointsPerCorrect : 10) * s.mult;
    const penalty = s.penalty * s.mult;
    const delta = correct ? base + s.wager : -(penalty + s.wager);
    // shared penalty: if the turn was passed, a wrong answer also costs the skipper
    const skipper = (s.passedTo != null && s.currentIdx !== idx) ? s.currentIdx : null;
    // passed turn: correct → receiver 75%, skipper 25%; wrong → both take the full penalty
    let recvDelta = delta, skipperDelta = 0;
    if (skipper != null) {
      if (correct) { recvDelta = Math.round(delta * 0.75); skipperDelta = delta - recvDelta; }
      else skipperDelta = delta;
    }
    clearInterval(this._t);
    this.sfx(correct ? 'coin' : 'wrong');
    this.showPop((delta > 0 ? '+' : '') + delta, delta > 0 ? '#FBD000' : (delta < 0 ? '#E52521' : '#ffffff'));
    this.setState(st => ({
      students: st.students.map((p, i) => {
        const d = i === idx ? recvDelta : (i === skipper ? skipperDelta : 0);
        return d ? { name: p.name, score: p.score + d, aids: p.aids, team: p.team } : p;
      }),
      running: false, bump: delta > 0 ? idx : null
    }), () => setTimeout(() => this.nextRound(), 1000));
  }
  markCorrect = () => this.award(true);
  markWrong = () => this.award(false);
  passTurn = () => {
    if (this.state.passedTo != null) return;
    const pool = this.state.students.map((_, i) => i).filter(i => i !== this.state.currentIdx);
    if (!pool.length) return;
    const to = pool[Math.floor(Math.random() * pool.length)];
    this.sfx('pass');
    this.setState(st => ({ passedTo: to, wager: 0, mult: this.standing(to) === 'leader' ? 1 : st.mult, time: this.baseTime(st.card && st.card.level), running: false }));
  };
  conjugate(pv) {
    if (!pv) return [];
    const IRREG = {
      bear: ['bore', 'borne'], break: ['broke', 'broken'], bring: ['brought', 'brought'],
      cast: ['cast', 'cast'], catch: ['caught', 'caught'], come: ['came', 'come'], cut: ['cut', 'cut'],
      deal: ['dealt', 'dealt'], do: ['did', 'done'], drink: ['drank', 'drunk'], dwell: ['dwelt', 'dwelt'],
      eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], find: ['found', 'found'], get: ['got', 'got / gotten'],
      give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'], hang: ['hung', 'hung'],
      hold: ['held', 'held'], keep: ['kept', 'kept'], lay: ['laid', 'laid'], let: ['let', 'let'],
      lie: ['lay', 'lain'], make: ['made', 'made'], pay: ['paid', 'paid'], put: ['put', 'put'],
      run: ['ran', 'run'], see: ['saw', 'seen'], send: ['sent', 'sent'], set: ['set', 'set'],
      show: ['showed', 'shown'], shut: ['shut', 'shut'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'],
      speak: ['spoke', 'spoken'], speed: ['sped', 'sped'], stand: ['stood', 'stood'], stick: ['stuck', 'stuck'],
      take: ['took', 'taken'], tear: ['tore', 'torn'], throw: ['threw', 'thrown'], wake: ['woke', 'woken'],
      wear: ['wore', 'worn'], wind: ['wound', 'wound'], write: ['wrote', 'written']
    };
    const DOUBLE = ['chip', 'drop', 'drum', 'fob', 'log', 'plug', 'shrug', 'stem', 'whip', 'wrap', 'slow'];
    const clean = pv.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const parts = clean.split(' ');
    const v = parts[0].toLowerCase(), rest = parts.slice(1).join(' ');
    const tail = rest ? ' ' + rest : '';
    let third;
    if (v === 'do') third = 'does';
    else if (v === 'go') third = 'goes';
    else if (/(s|x|z|ch|sh)$/.test(v)) third = v + 'es';
    else if (/[^aeiou]y$/.test(v)) third = v.slice(0, -1) + 'ies';
    else third = v + 's';
    let past, pp;
    if (IRREG[v]) { past = IRREG[v][0]; pp = IRREG[v][1]; }
    else {
      let base;
      if (/e$/.test(v)) base = v + 'd';
      else if (/[^aeiou]y$/.test(v)) base = v.slice(0, -1) + 'ied';
      else if (DOUBLE.indexOf(v) >= 0) base = v + v.slice(-1) + 'ed';
      else base = v + 'ed';
      past = base; pp = base;
    }
    return [
      { label: 'PRESENT', form: v + tail + ' / ' + third + tail },
      { label: 'PAST', form: past + tail },
      { label: 'PAST PARTICIPLE', form: pp + tail }
    ];
  }
  useAid(kind) {
    const s = this.state, idx = this.activeIdx();
    if (idx == null || !s.students[idx] || s.students[idx].aids <= 0) return;
    this.sfx('aid');
    const spend = st => ({ students: st.students.map((p, i) => i === idx ? { name: p.name, score: p.score, aids: p.aids - 1, team: p.team } : p) });
    if (kind === 'time') this.setState(st => Object.assign(spend(st), { time: Math.min(st.time + this.baseTime(st.card.level) / 2, 300) }), () => { if (this.state.running) this.startTimer(); });
    else if (kind === 'tense') this.setState(st => Object.assign(spend(st), { tense: this.pickTense(st.card.level), subject: this.pickSubject(), context: this.pickContext(st.card) }));
    else if (kind === 'conj') this.setState(st => Object.assign(spend(st), { conjShown: true }));
    else if (kind === 'teacher') { clearInterval(this._t); this.setState(st => Object.assign(spend(st), { teacherHelp: true, running: false })); }
    else if (kind === 'swap') {
      clearInterval(this._t);
      this.setState(st => Object.assign(spend(st), { card: null, tense: null, subject: null, context: null, wager: 0, running: false, startShown: false, conjShown: false, teacherHelp: false }), () => { this.buildSegments(); this.spin(); });
    }
  }
  nextRound() {
    const s = this.state;
    if (s.round >= s.rounds) { this.goPodium(); return; }
    const turn = (s.turn + 1) % s.order.length;
    this.setState({ round: s.round + 1, turn, currentIdx: s.order[turn], card: null, tense: null, subject: null, context: null, passedTo: null, wager: 0, mult: 1, bump: null, time: 30, running: false }, () => this.buildSegments());
  }
  stepRounds = (d) => {
    const s = this.state;
    const next = Math.max(Math.max(s.round, 1), Math.min(100, s.rounds + d));
    if (next === s.rounds) return;
    this.sfx('click');
    this.showPop(next + ' ROUNDS', THEMES[s.theme].accent);
    this.setState({ rounds: next });
  };
  goPodium() {
    clearInterval(this._t); clearTimeout(this._end1); clearTimeout(this._end2);
    this.sfx('over');
    this.setState({ screen: 'podium', endPhase: 'board', card: null, running: false, bump: null, pop: null });
    this._end1 = setTimeout(() => this.revealPrize(), 7000);
  }
  revealPrize = () => {
    if (this.state.screen !== 'podium' || this.state.endPhase !== 'board') return;
    clearTimeout(this._end1);
    this.setState({ endPhase: 'fade' });
    this._end2 = setTimeout(() => { this.setState({ endPhase: 'prize' }); this.sfx('coin'); }, 1600);
  };
  endMatch = () => this.goPodium();
  quitGame = () => { clearInterval(this._t); clearTimeout(this._end1); clearTimeout(this._end2); this.setState({ screen: 'menu', endPhase: 'board', card: null, running: false, pop: null }); };
  playAgain = () => { clearTimeout(this._end1); clearTimeout(this._end2); this._seen = {}; this.setState({ endPhase: 'board' }); this.startGame(); };

  // ---------- view ----------
  renderVals() {
    const s = this.state, t = THEMES[s.theme] || THEMES.overworld;
    const pts = this.props.pointsPerCorrect != null ? this.props.pointsPerCorrect : 10;
    const counts = {}; s.pool.forEach(v => counts[v.level] = (counts[v.level] || 0) + 1);
    const active = this.activeIdx();
    const me = active != null ? s.students[active] : null;
    const ranked = s.students.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score || a.i - b.i);
    const medals = ['🥇', '🥈', '🥉'];
    const teams = [];
    if (s.teamsOn) {
      for (let ti = 0; ti < s.teamCount; ti++) {
        const mem = s.students.filter(p => Math.min(p.team || 0, s.teamCount - 1) === ti);
        teams.push({
          ti, name: 'TEAM ' + (ti + 1), color: TEAM_COLORS[ti],
          score: mem.reduce((a, p) => a + p.score, 0),
          members: mem.length ? mem.map(p => p.name).join(', ') : 'no players yet'
        });
      }
      teams.sort((a, b) => b.score - a.score || a.ti - b.ti);
    }
    const podColors = [t.accent, '#C9D3DE', '#C87F3C'], podH = [180, 134, 102];
    const aidsLeft = me ? me.aids : 0;
    const wagerBase = pts * s.mult;

    const isLeader = this.standing(active) === 'leader';
    const wagerVals = [0, 5, 10, 20];
    const wagerOpts = wagerVals.map(v => ({
      label: v === 0 ? 'NO BET' : '+' + v, off: me ? (v > me.score || (isLeader && v > 10)) : true,
      bg: s.wager === v ? t.accent : t.panel2, fg: s.wager === v ? t.accentInk : t.muted,
      onClick: () => { this.sfx('click'); this.setState({ wager: v }); }
    })).concat([{
      label: 'ALL IN', off: !me || me.score <= 0 || (isLeader && me.score > 10),
      bg: me && s.wager === me.score && me.score > 0 ? t.bad : t.panel2,
      fg: me && s.wager === me.score && me.score > 0 ? '#fff' : t.muted,
      onClick: () => { if (me && me.score > 0) { this.sfx('click'); this.setState({ wager: me.score }); } }
    }]);

    const aidDefs = [
      { kind: 'time', icon: '⏱', short: '+' + (s.card ? this.baseTime(s.card.level) / 2 : 15) + ' SEC' },
      { kind: 'tense', icon: '🎲', short: 'REROLL RULES' },
      { kind: 'conj', icon: '📐', short: 'CONJUGATION' },
      { kind: 'teacher', icon: '🙋', short: 'TEACHER HELP' },
      { kind: 'swap', icon: '🔀', short: 'SWAP VERB' }
    ];

    return {
      scale: s.scale, t: t, deco: t.deco,
      titleBtn: !s.front && s.screen === 'menu' ? 'flex' : 'none',
      isFront: s.front && s.screen === 'menu', frontStart: () => this.leaveFront(),
      frontPractice: () => this.leaveFront({ teamsOn: false, wagerOn: false, multOn: false, penalty: 0 }, 'PRACTICE'),
      frontLearn: () => this.leaveFront({ teamsOn: false, wagerOn: false, multOn: false, penalty: 0, aidsPer: 5 }, 'LEARN'),
      frontCompete: () => this.leaveFront({ wagerOn: true, multOn: true, penalty: 10, aidsPer: 2 }, 'COMPETE'),
      frontTeams: () => this.leaveFront({ teamsOn: true, teamCount: 2 }, 'TEAMS'),
      frontRewards: () => this.leaveFront({}, 'SET A PRIZE', true),
      toFront: () => this.fx('black', () => this.setState({ front: true })),
      toGames: () => this.props.onExit(),
      toFull: () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => {}); },
      isMenu: !s.front && s.screen === 'menu', isGame: s.screen === 'game', isPodium: s.screen === 'podium',
      popShown: !!s.pop, popText: s.pop ? s.pop.text : '', popColor: s.pop ? s.pop.color : '#fff',

      levelChips: ['A1', 'A2', 'B1', 'B2', 'C1'].map(id => {
        const on = s.levels.indexOf(id) >= 0;
        return { id, count: counts[id] || 0, bg: on ? t.accent : t.panel2, fg: on ? t.accentInk : t.muted, onClick: () => this.toggleLevel(id) };
      }),
      selectAllLevels: () => { this.sfx('click'); this.setState({ levels: ['A1', 'A2', 'B1', 'B2', 'C1'] }, () => this.buildSegments()); },
      clearLevels: () => { this.sfx('click'); this.setState({ levels: [] }); },

      themeChips: Object.keys(THEMES).map(k => ({
        label: THEMES[k].label, swatch: THEMES[k].swatch,
        bg: s.theme === k ? t.accent : t.panel2, fg: s.theme === k ? t.accentInk : t.muted,
        onClick: () => { this.sfx('click'); this.setState({ theme: k }); }
      })),

      rounds: s.rounds,
      roundBlocks: Array.from({ length: 50 }, (_, i) => ({ bg: i < Math.ceil(s.rounds / 2) ? t.accent : 'rgba(255,255,255,.14)' })),
      onRoundsDown: e => { this._drag = true; this.roundsFrom(e); },
      onRoundsMove: e => { if (this._drag) this.roundsFrom(e); },
      onRoundsUp: () => { this._drag = false; },

      penaltyChips: [0, 5, 10, 15].map(n => ({
        label: n === 0 ? 'NONE' : '-' + n, bg: s.penalty === n ? t.bad : t.panel2, fg: s.penalty === n ? '#fff' : t.muted,
        onClick: () => { this.sfx('click'); this.setState({ penalty: n }); }
      })),

      teamChips: [0, 2, 3, 4].map(n => ({
        label: n === 0 ? 'NO TEAMS' : n + ' TEAMS',
        bg: (n === 0 ? !s.teamsOn : (s.teamsOn && s.teamCount === n)) ? TEAM_COLORS[1] : t.panel2,
        fg: (n === 0 ? !s.teamsOn : (s.teamsOn && s.teamCount === n)) ? '#fff' : t.muted,
        onClick: () => {
          this.sfx('click');
          if (n === 0) { this.setState({ teamsOn: false }); return; }
          this.setState(st => ({
            teamsOn: true, teamCount: n,
            students: st.students.map((p, i) => ({ name: p.name, score: p.score, aids: p.aids, team: i % n }))
          }));
        }
      })),

      aidChips: [0, 2, 3, 5].map(n => ({
        label: n === 0 ? 'NONE' : String(n), bg: s.aidsPer === n ? t.good : t.panel2, fg: s.aidsPer === n ? '#fff' : t.muted,
        onClick: () => { this.sfx('click'); this.setState({ aidsPer: n }); }
      })),
      toggles: [
        { icon: '🎯', label: 'WAGER COINS', state: s.wagerOn ? 'ON' : 'OFF', stateColor: s.wagerOn ? t.accent : t.muted, bg: s.wagerOn ? t.hi : t.panel2, onClick: () => { this.sfx('click'); this.setState({ wagerOn: !s.wagerOn }); } },
        { icon: '✨', label: 'RANDOM MULTIPLIERS', state: s.multOn ? 'ON' : 'OFF', stateColor: s.multOn ? t.accent : t.muted, bg: s.multOn ? t.hi : t.panel2, onClick: () => { this.sfx('click'); this.setState({ multOn: !s.multOn }); } },
        { icon: '🔊', label: 'SOUND EFFECTS', state: s.sound ? 'ON' : 'OFF', stateColor: s.sound ? t.accent : t.muted, bg: s.sound ? t.hi : t.panel2, onClick: () => this.setState({ sound: !s.sound }, () => this.saveAudio()) },
        { icon: '👤', label: 'RANDOM SUBJECT', state: s.subjOn ? 'ON' : 'OFF', stateColor: s.subjOn ? t.accent : t.muted, bg: s.subjOn ? t.hi : t.panel2, onClick: () => { this.sfx('click'); this.setState({ subjOn: !s.subjOn }); } },
        { icon: '🌍', label: 'RANDOM SITUATION', state: s.ctxOn ? 'ON' : 'OFF', stateColor: s.ctxOn ? t.accent : t.muted, bg: s.ctxOn ? t.hi : t.panel2, onClick: () => { this.sfx('click'); this.setState({ ctxOn: !s.ctxOn }); } },
        { icon: '🎲', label: 'TURN ORDER', state: s.randomOrder ? 'RANDOM' : 'LIST', stateColor: t.accent, bg: t.panel2, onClick: () => { this.sfx('click'); this.setState({ randomOrder: !s.randomOrder }); } }
      ],

      prizeInput: s.prizeInput,
      onPrizeChange: e => this.setState({ prizeInput: e.target.value }),
      nameInput: s.nameInput,
      onNameChange: e => this.setState({ nameInput: e.target.value }),
      onNameKey: e => { if (e.key === 'Enter') this.addStudent(); },
      addStudent: this.addStudent,
      students: s.students.map((p, i) => ({
        name: p.name, num: String(i + 1).padStart(2, '0'),
        teamDisplay: s.teamsOn ? 'inline-block' : 'none',
        teamLabel: 'T' + (Math.min(p.team || 0, s.teamCount - 1) + 1),
        teamColor: TEAM_COLORS[Math.min(p.team || 0, s.teamCount - 1)],
        cycleTeam: () => {
          this.sfx('click');
          this.setState(st => ({ students: st.students.map((q, j) => j === i ? { name: q.name, score: q.score, aids: q.aids, team: (Math.min(q.team || 0, st.teamCount - 1) + 1) % st.teamCount } : q) }));
        },
        remove: () => this.setState({ students: s.students.filter((_, j) => j !== i) })
      })),
      startGame: () => { const st = this.state; if (st.students.length < 2 || !st.levels.length) return; this.fx('black', () => this.startGame(), { in: 420, hold: 160, out: 650 }); },
      cantStart: s.students.length < 2 || !s.levels.length,
      startBg: (s.students.length < 2 || !s.levels.length) ? '#6b6b6b' : t.accent,
      startHint: s.students.length < 2 ? 'Add at least 2 players to begin'
        : (!s.levels.length ? 'Select at least one CEFR level'
        : s.students.length + ' players · ' + (s.teamsOn ? s.teamCount + ' teams · ' : '') + s.rounds + ' rounds · ' + this.filtered().length + ' verbs in play'),

      roundLabel: s.round + ' / ' + s.rounds,
      incRound: () => this.stepRounds(1),
      decRound: () => this.stepRounds(-1),
      incRoundOff: s.rounds >= 100,
      decRoundOff: s.rounds <= Math.max(s.round, 1),
      incRoundBg: s.rounds >= 100 ? '#6b6b6b' : t.titleShadow,
      decRoundBg: s.rounds <= Math.max(s.round, 1) ? '#6b6b6b' : t.titleShadow,
      endMatch: this.endMatch,
      levelsLabel: s.levels.join(' '),
      timeLabel: s.card ? String(s.time).padStart(2, '0') + 's' : '--',
      timePct: s.card ? Math.min(100, (s.time / this.baseTime(s.card.level)) * 100) : 0,
      timerColor: !s.card ? t.muted : (s.time <= 5 ? t.bad : s.time <= 12 ? t.accent : t.good),
      addTime: this.addTime, addTimeBg: s.card ? t.alt : '#555',
      toggleTimer: this.toggleTimer,
      toggleTimerLabel: s.running ? 'PAUSE' : (s.time > 0 ? 'START TIMER' : 'TIME UP'),
      toggleTimerBg: !s.card ? '#555' : (s.running ? t.alt : t.good),
      quitGame: this.quitGame,

      segments: s.segments, rot: s.rot,
      wheelAnim: s.spinning ? 'pv-glowPulse 1.1s ease-in-out infinite' : 'none',
      hubAnim: s.spinning ? 'pv-spinSlow 1.4s linear infinite' : 'none',
      spin: this.spin, spinDisabled: s.spinning || !!s.card,
      spinLabel: s.spinning ? 'SPINNING…' : (s.card ? 'ANSWER!' : 'SPIN!'),
      spinBg: (s.spinning || s.card) ? '#6b6b6b' : t.accent,

      turnCaption: s.passedTo != null ? '🔀 PASSED! NOW ANSWERING' : (s.card ? 'NOW ANSWERING' : 'READY TO SPIN'),
      currentName: me ? me.name : '—',
      wasPassed: s.passedTo != null,
      passNote: (() => {
        if (s.passedTo == null) return '';
        const from = s.students[s.currentIdx], to = s.students[s.passedTo];
        const loss = s.penalty * s.mult + s.wager;
        const win = (this.props.pointsPerCorrect != null ? this.props.pointsPerCorrect : 10) * s.mult + s.wager;
        const rw = Math.round(win * 0.75);
        if (!from || !to) return '';
        return '🔀 ' + from.name.toUpperCase() + ' PASSED TO ' + to.name.toUpperCase() +
          ' — CORRECT: ' + to.name.toUpperCase() + ' +' + rw + ', ' + from.name.toUpperCase() + ' +' + (win - rw) + '.' +
          (loss > 0 ? '  WRONG: BOTH LOSE ' + loss + ' COINS.' : '  WRONG: NO PENALTY.');
      })(),

      hasCard: !!s.card, noCard: !s.card,
      idleMessage: s.spinning ? 'THE WHEEL IS SPINNING…' : 'PRESS SPIN TO GET\nYOUR PHRASAL VERB',
      cardPv: s.card ? s.card.pv : '', cardDef: s.card ? s.card.def : '', cardEx: s.card ? s.card.ex : '',
      cardEmoji: s.card ? s.card.emoji : '', cardFamily: s.card ? s.card.family : '',
      cardLevel: s.card ? s.card.level : '', cardColor: s.card ? s.card.color : '#000',
      cardEs: s.card && s.card.es ? s.card.es : '',
      cardStart: s.card ? s.card.ex.split(' ').slice(0, 3).join(' ') : '',
      hasEs: !!(s.card && s.card.es), esShown: s.esShown,
      esLabel: s.esShown ? 'HIDE SPANISH HINT' : '🇪🇸 SPANISH HINT',
      toggleEs: () => this.setState({ esShown: !s.esShown }),
      defHidden: !s.defShown, defShown: s.defShown,
      revealDef: () => { this.sfx('click'); this.setState({ defShown: true }); },
      exShown: s.exShown, showModel: () => this.setState({ exShown: !s.exShown }),
      startShown: s.startShown,
      conjShown: s.conjShown, conjForms: s.card ? this.conjugate(s.card.pv) : [],
      teacherHelp: s.teacherHelp,
      hasPrize: !!s.prizeInput.trim(), prizeText: s.prizeInput.trim(),

      audioOpen: s.audioOpen,
      toggleAudioPanel: () => { this.sfx('click'); this.setState(st => ({ audioOpen: !st.audioOpen })); },
      audioIcon: s.sound ? '🔊' : '🔇', audioBtnLabel: s.audioOpen ? 'CLOSE' : 'SOUND',
      toggleSfx: this.toggleSfx,
      sfxBtnLabel: s.sound ? 'SFX ON' : 'SFX OFF', sfxBtnBg: s.sound ? t.accent : '#555', sfxBtnInk: s.sound ? t.accentInk : '#fff',
      sfxVol: s.sfxVol,
      onSfxVol: e => this.setState({ sfxVol: +e.target.value }, () => this.saveAudio()),

      hasTense: !!s.tense, tenseName: s.tense ? s.tense.n : '', tenseHint: s.tense ? s.tense.h : '',
      hasExtra: !!(s.card && (s.subject || s.context)),
      hasSubject: !!(s.card && s.subject), subjectLabel: s.subject || '',
      hasContext: !!(s.card && s.context), contextLabel: s.context || '',
      hasMult: s.mult > 1, multLabel: 'x' + s.mult, multBg: s.mult >= 3 ? '#FF3B3B' : t.accent,
      addTimeLabel: '+' + (s.card ? this.baseTime(s.card.level) / 2 : 15) + ' SEC',

      wagerOn: s.wagerOn && !!s.card, wagerOpts,
      wagerNote: '+' + (wagerBase + s.wager) + '/-' + (s.penalty * s.mult + s.wager) + (isLeader ? ' · LEADER CAP' : ''),

      aidsOn: s.aidsPer > 0 && !!s.card,
      aidsLeft: aidsLeft + ' / ' + s.aidsPer,
      aidGain: s.aidGain,
      aids: aidDefs.map(a => {
        const used = (a.kind === 'conj' && s.conjShown) || (a.kind === 'teacher' && s.teacherHelp);
        const dead = aidsLeft <= 0 || used || (a.kind === 'tense' && !s.tense && !s.subject && !s.context);
        return {
        icon: a.icon, short: a.short,
        off: dead,
        bg: dead ? '#555' : t.alt,
        onClick: () => this.useAid(a.kind)
        };
      }),

      markCorrect: this.markCorrect, markWrong: this.markWrong,
      pointsLabel: '+' + (wagerBase + s.wager),
      wrongLabel: (s.penalty * s.mult + s.wager) > 0 ? '-' + (s.penalty * s.mult + s.wager) + ' COINS' : 'NO POINTS',
      passTurn: this.passTurn, passDisabled: s.passedTo != null,
      passBg: s.passedTo != null ? '#6b6b6b' : t.titleShadow,

      joinInput: s.joinInput,
      onJoinChange: e => this.setState({ joinInput: e.target.value }),
      onJoinKey: e => { if (e.key === 'Enter') this.joinStudent(); },
      joinStudent: this.joinStudent,
      joinDisabled: !s.joinInput.trim() || s.students.length >= 24,

      boardNote: '+' + pts + ' correct' + (s.penalty > 0 ? ' \u00b7 -' + s.penalty + ' wrong' : '') + (s.multOn ? ' \u00b7 multipliers on' : ''),
      board: ranked.map((r, k) => ({
        rank: k < 3 ? medals[k] : String(k + 1),
        rankColor: k < 3 ? '#fff' : t.muted,
        name: r.p.name, score: r.p.score,
        aidDots: (s.teamsOn ? 'TEAM ' + (Math.min(r.p.team || 0, s.teamCount - 1) + 1) + (s.aidsPer > 0 ? ' · ' : '') : '') + (s.aidsPer > 0 ? '🧰'.repeat(r.p.aids) || '—' : ''),
        aidColor: t.muted,
        bg: r.i === active && s.screen === 'game' ? t.good : (k === 0 && r.p.score > 0 ? t.hi : t.panel2),
        nameColor: r.i === active && s.screen === 'game' ? '#fff' : t.text,
        scale: s.bump === r.i ? 1.06 : 1
      })),

      teamBoard: teams.map(tm => ({
        name: tm.name, members: tm.members, score: tm.score, color: tm.color,
        bg: teams[0] && tm.ti === teams[0].ti && tm.score > 0 ? t.hi : t.panel2
      })),

      podium: s.teamsOn
        ? teams.slice(0, 3).map((tm, k) => ({ medal: medals[k], name: tm.name, score: tm.score, color: podColors[k], h: podH[k] }))
        : ranked.slice(0, 3).map((r, k) => ({ medal: medals[k], name: r.p.name, score: r.p.score, color: podColors[k], h: podH[k] })),
      endOpacity: s.endPhase === 'board' ? 0 : 1, endPointer: s.endPhase === 'board' ? 'none' : 'auto',
      endShowPrize: s.endPhase === 'prize',
      revealPrize: this.revealPrize,
      winnerName: (s.teamsOn ? (teams[0] ? teams[0].name : '') : (ranked[0] ? ranked[0].p.name : '')).toUpperCase(),
      finalPrize: s.prizeInput.trim() || 'Eternal glory and bragging rights',
      winnerLine: s.teamsOn
        ? (teams.length ? teams[0].name + ' wins with ' + teams[0].score + ' coins!' : '')
        : (ranked.length ? ranked[0].p.name + ' wins with ' + ranked[0].p.score + ' coins!' : ''),
      playAgain: this.playAgain
    };
  }
}
