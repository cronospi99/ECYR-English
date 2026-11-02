/* Class Wars — simple bot brains (demo mode and optional class fillers). They run inside the
   host simulation and drive the same SimPlayer fields a human input would. */
import { PAINT_CELL, PLAYER_R } from './constants';
import { floorBelow } from './kb';
import { paintCols } from './map';
import { UPGRADES, WEAPONS } from './defs';
import type { Sim, SimPlayer } from './sim';

export const BOT_NAMES = ['Valen', 'Mateo', 'Sofi', 'Tomás', 'Isa', 'Juanes', 'Majo', 'Santi', 'Dani', 'Luci', 'Nico', 'Pau', 'Emi', 'Sara'];

export function botThink(sim: Sim, p: SimPlayer) {
  const now = sim.now;
  const R = sim.rand;
  const L = sim.bot;
  const b = (p.brain ??= {
    acc: L.acc[0] + R() * (L.acc[1] - L.acc[0]), aggro: L.aggro + R() * 0.3, tx: p.x, ty: p.y, retarget: 0, target: -1, goal: 0,
    avoid: 0, avoidUntil: 0, lx: p.x, ly: p.y, stuckCheck: now + 500, nextQuiz: now + 8000 + R() * 20000, quizUntil: 0, nextAns: 0,
    strafe: R() < 0.5 ? 1 : -1, strafeAt: 0, aimErr: 0, hold: 0,
  });
  if (!p.alive) { p.mx = p.my = 0; p.attackHeld = false; return; }

  // Answering questions (the only way to refill energy).
  if (p.inQuiz) {
    p.mx = p.my = 0;
    const threatened = now - p.lastCombatAt < 1500 && p.en > 0;
    if ((now > b.quizUntil && p.en > 900) || threatened) { sim.setQuiz(p, false); return; }
    if (now > b.nextAns) {
      sim.answer(p, R() < b.acc);
      b.nextAns = now + 2200 + R() * 3500;
      // Shop: the cheapest useful upgrade, keeping enough energy to keep playing.
      for (const u of [...UPGRADES].sort((x, y) => x.costs[Math.min(p.ups[x.id] + 1, x.costs.length - 1)] - y.costs[Math.min(p.ups[y.id] + 1, y.costs.length - 1)])) {
        const next = p.ups[u.id] + 1;
        if (next < u.values.length && p.en > u.costs[next] + 1500) { sim.buy(p, u.id); break; }
      }
    }
    return;
  }
  // Out of energy (or nearly): go study.
  if (p.en < 60 && now - p.lastCombatAt > 800) {
    sim.setQuiz(p, true);
    b.quizUntil = now + 5000 + R() * 6000;
    b.nextQuiz = b.quizUntil + 14000 + R() * 26000;
    b.nextAns = now + 1600;
    return;
  }

  // Pick a target a few times per second.
  if (now > b.retarget) {
    b.retarget = now + 350 + R() * 250;
    let enemy: SimPlayer | null = null, ed: number = L.range;
    for (const q of sim.players) {
      if (!sim.foe(p, q) || sim.has(q, 'invis') || sim.has(q, 'invuln') || q.inQuiz) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y) - (q.hp < 40 ? 80 : 0);
      if (d < ed) { ed = d; enemy = q; }
    }
    const healthy = p.hp + p.sh > 70 || (enemy && enemy.hp + enemy.sh < p.hp + p.sh);
    if (enemy && healthy && R() < 0.15 + b.aggro) {
      b.target = enemy.idx; b.goal = 1;
    } else if (sim.paint && R() < 0.75) {
      // Color Clash: head for a nearby cell that is not ours yet.
      b.target = -1;
      const cols = paintCols(sim.map), mine = p.team + 1;
      let best = 1e9;
      for (let i = 0; i < 14; i++) {
        const a = R() * Math.PI * 2, d = 120 + R() * 420;
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        const c = Math.floor(y / PAINT_CELL) * cols + Math.floor(x / PAINT_CELL);
        if (!sim.paintable?.[c] || sim.paint[c] === mine) continue;
        const score = d - (sim.paint[c] ? 120 : 0);
        if (score < best) { best = score; b.tx = x; b.ty = y; }
      }
      b.goal = best < 1e9 ? 4 : 3;
      if (best >= 1e9) { b.tx = 200 + R() * (sim.map.w - 400); b.ty = 200 + R() * (sim.map.h - 400); }
    } else {
      b.target = -1;
      let best = 1e9, bx = 0, by = 0;
      for (const g of sim.gems.values()) {
        const d = Math.hypot(g.x - p.x, g.y - p.y) - g.v * 6;
        if (d < best && d < 650) { best = d; bx = g.x; by = g.y; }
      }
      for (const bo of sim.boxes.values()) {
        if (bo.readyAt > now) continue;
        const d = Math.hypot(bo.x - p.x, bo.y - p.y) - 60;
        if (d < best) { best = d; bx = bo.x; by = bo.y; }
      }
      if (best < 1e9) { b.tx = bx; b.ty = by; b.goal = 2; }
      else if (b.goal !== 3 || Math.hypot(b.tx - p.x, b.ty - p.y) < 60) {
        b.tx = 200 + R() * (sim.map.w - 400); b.ty = 200 + R() * (sim.map.h - 400); b.goal = 3;
      }
    }
    // Time to study?
    if (now > b.nextQuiz && b.goal !== 1 && now - p.lastCombatAt > 4000) {
      sim.setQuiz(p, true);
      b.quizUntil = now + 6000 + R() * 9000;
      b.nextQuiz = b.quizUntil + 14000 + R() * 26000;
      b.nextAns = now + 1800;
      return;
    }
  }

  let gx = b.tx, gy = b.ty;
  p.attackHeld = false;
  const enemy = b.target >= 0 ? sim.players[b.target] : null;
  if (enemy && enemy.alive) {
    const w = WEAPONS[p.weapon];
    const want = w.kind === 'melee' ? 40 : Math.min(w.range * 0.55, 260);
    const dx = enemy.x - p.x, dy = enemy.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (now > b.strafeAt) { b.strafe = R() < 0.5 ? 1 : -1; b.strafeAt = now + 700 + R() * 900; b.aimErr = (R() - 0.5) * L.aimErr; b.hold = R() < L.fire ? 1 : 0; }
    const toward = d > want ? 1 : d < want * 0.6 ? -0.6 : 0;
    gx = p.x + (dx / d) * toward * 100 + (-dy / d) * b.strafe * 70;
    gy = p.y + (dy / d) * toward * 100 + (dx / d) * b.strafe * 70;
    // Lead the target a little.
    const lead = w.speed ? d / w.speed : 0;
    p.aim = Math.atan2(enemy.y + enemy.vy * 0 + (enemy.y - enemy.py) * 30 * lead - p.y, enemy.x + (enemy.x - enemy.px) * 30 * lead - p.x) + b.aimErr;
    p.ad = d;
    if (b.hold && d < (w.kind === 'melee' ? w.range + PLAYER_R : w.range * 0.9)) p.attackHeld = true;
    if (d < 260 && R() < L.power) sim.usePower(p, false);
    if (d < 300 && p.borrowed >= 0 && R() < L.power * 0.7) sim.usePower(p, true);
  } else if (p.hp < p.ups.hp * 20 + 50 && R() < 0.01) {
    sim.usePower(p, false);
  }

  if (sim.game === 'kb') { steerKb(sim, p, gx, gy, enemy); return; }
  let dx = gx - p.x, dy = gy - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) { p.mx = p.my = 0; return; }
  dx /= dist; dy /= dist;
  if (now < b.avoidUntil) {
    const c = Math.cos(b.avoid), s = Math.sin(b.avoid);
    [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
  }
  p.mx = dx; p.my = dy;
  if (!enemy) { p.aim = Math.atan2(dy, dx); p.ad = 200; }
  // Unstick: if we barely moved, slide sideways for a moment.
  if (now > b.stuckCheck) {
    if (Math.hypot(p.x - b.lx, p.y - b.ly) < 25 && sim.speedMul(p) > 0) { b.avoid = (R() < 0.5 ? 1 : -1) * (1.2 + R()); b.avoidUntil = now + 700; }
    b.lx = p.x; b.ly = p.y; b.stuckCheck = now + 500;
  }
}

/** Knockback: walk toward the goal, jump up to higher ledges, never walk off an edge on purpose,
    and fly back to the stage after a launch (double jump). */
function steerKb(sim: Sim, p: SimPlayer, gx: number, gy: number, enemy: SimPlayer | null) {
  const m = sim.map, body = p.body;
  if (!body) return;
  const R = sim.rand;
  const main = m.plats[0];
  const off = !floorBelow(m, p.x, p.y, 1400);
  if (off) {
    // recovering: steer back over the main island and jump when falling
    gx = main.x + main.w / 2;
    gy = main.y;
  } else if (!enemy && Math.abs(gx - p.x) < 40) {
    gx = p.x + (R() < 0.5 ? -1 : 1) * 300;
  }
  let dir = Math.abs(gx - p.x) > 18 ? Math.sign(gx - p.x) : 0;
  if (enemy && !off && Math.abs(enemy.x - p.x) < 110 && Math.abs(enemy.y - p.y) < 60) dir = 0; // close enough to hit
  // do not walk off a ledge unless the goal is down there
  if (dir && body.ground && !off) {
    const ahead = p.x + dir * 46;
    if (!floorBelow(m, ahead, p.y, gy > p.y + 40 ? 900 : 8)) dir = 0;
  }
  p.mx = dir;
  if (body.ground && gy < p.y - 70 && R() < 0.08) p.jumpQ = true;
  else if (!body.ground && off && body.vy > 120 && body.air > 0) p.jumpQ = true;
  else if (body.ground && gy > p.y + 90 && Math.abs(gx - p.x) < 200 && R() < 0.05) p.downQ = true;
  if (enemy) p.aim = Math.atan2(enemy.y - 22 - (p.y - 18), enemy.x - p.x) + (p.brain?.aimErr ?? 0);
  else p.aim = dir < 0 ? Math.PI : 0;
}
