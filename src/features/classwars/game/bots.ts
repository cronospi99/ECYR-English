/* Class Wars — simple bot brains (demo mode and optional class fillers). They run inside the
   host simulation and drive the same SimPlayer fields a human input would. */
import { PLAYER_R } from './constants';
import { UPGRADES, WEAPONS } from './defs';
import type { Sim, SimPlayer } from './sim';

export const BOT_NAMES = ['Valen', 'Mateo', 'Sofi', 'Tomás', 'Isa', 'Juanes', 'Majo', 'Santi', 'Dani', 'Luci', 'Nico', 'Pau', 'Emi', 'Sara'];

export function botThink(sim: Sim, p: SimPlayer) {
  const now = sim.now;
  const R = sim.rand;
  const b = (p.brain ??= {
    acc: 0.55 + R() * 0.35, aggro: 0.4 + R() * 0.5, tx: p.x, ty: p.y, retarget: 0, target: -1, goal: 0,
    avoid: 0, avoidUntil: 0, lx: p.x, ly: p.y, stuckCheck: now + 500, nextQuiz: now + 8000 + R() * 20000, quizUntil: 0, nextAns: 0,
    strafe: R() < 0.5 ? 1 : -1, strafeAt: 0, aimErr: 0,
  });
  if (!p.alive) { p.mx = p.my = 0; p.attackHeld = false; return; }

  // Answering questions (the main income).
  if (p.inQuiz) {
    p.mx = p.my = 0;
    const threatened = now - p.lastCombatAt < 1500;
    if (now > b.quizUntil || threatened) { sim.setQuiz(p, false); return; }
    if (now > b.nextAns) {
      sim.answer(p, R() < b.acc);
      b.nextAns = now + 2200 + R() * 3500;
      // Shop: the cheapest useful upgrade we can afford comfortably.
      for (const u of [...UPGRADES].sort((x, y) => x.costs[Math.min(p.ups[x.id] + 1, x.costs.length - 1)] - y.costs[Math.min(p.ups[y.id] + 1, y.costs.length - 1)])) {
        const next = p.ups[u.id] + 1;
        if (next < u.values.length && p.dia > u.costs[next] * 1.4) { sim.buy(p, u.id); break; }
      }
    }
    return;
  }

  // Pick a target a few times per second.
  if (now > b.retarget) {
    b.retarget = now + 350 + R() * 250;
    let enemy: SimPlayer | null = null, ed = 460;
    for (const q of sim.players) {
      if (q === p || !q.alive || !q.connected || sim.has(q, 'invis') || sim.has(q, 'invuln') || q.inQuiz) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y) - (q.hp < 40 ? 80 : 0);
      if (d < ed) { ed = d; enemy = q; }
    }
    const healthy = p.hp + p.sh > 70 || (enemy && enemy.hp + enemy.sh < p.hp + p.sh);
    if (enemy && healthy && R() < 0.4 + b.aggro) {
      b.target = enemy.idx; b.goal = 1;
    } else {
      b.target = -1;
      let best = 1e9, bx = 0, by = 0;
      for (const g of sim.gems.values()) {
        const d = Math.hypot(g.x - p.x, g.y - p.y) - g.v * 6;
        if (d < best && d < 650) { best = d; bx = g.x; by = g.y; }
      }
      for (const bo of sim.boxes.values()) {
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
    if (now > b.strafeAt) { b.strafe = R() < 0.5 ? 1 : -1; b.strafeAt = now + 700 + R() * 900; b.aimErr = (R() - 0.5) * 0.35; }
    const toward = d > want ? 1 : d < want * 0.6 ? -0.6 : 0;
    gx = p.x + (dx / d) * toward * 100 + (-dy / d) * b.strafe * 70;
    gy = p.y + (dy / d) * toward * 100 + (dx / d) * b.strafe * 70;
    // Lead the target a little.
    const lead = w.speed ? d / w.speed : 0;
    p.aim = Math.atan2(enemy.y + enemy.vy * 0 + (enemy.y - enemy.py) * 30 * lead - p.y, enemy.x + (enemy.x - enemy.px) * 30 * lead - p.x) + b.aimErr;
    p.ad = d;
    if (d < (w.kind === 'melee' ? w.range + PLAYER_R : w.range * 0.9)) p.attackHeld = true;
    if (d < 260 && R() < 0.03) sim.usePower(p, false);
    if (d < 300 && p.borrowed >= 0 && R() < 0.02) sim.usePower(p, true);
  } else if (p.hp < p.ups.hp * 20 + 50 && R() < 0.01) {
    sim.usePower(p, false);
  }

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
