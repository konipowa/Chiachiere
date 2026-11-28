// 🎱 Motore del biliardo (palla 8): fisica, regole e computer.
// Solo + - * / e sqrt nella simulazione: stesso tiro = stesso risultato su ogni telefono.

export const W = 1000, H = 500, R = 11.25;           // tavolo (piano di gioco) e raggio bilia
export const HEAD_X = W / 4, FOOT = [W * 0.75, H / 2];
export const POCKETS = [[-3, -3, 25], [W / 2, -9, 21], [W + 3, -3, 25], [-3, H + 3, 25], [W / 2, H + 9, 21], [W + 3, H + 3, 25]];
const DT = 1 / 240, FRICTION = 190, STOP = 4, BALL_E = 0.95, RAIL_E = 0.72, MAX_T = 16;
export const MAX_SPEED = 2600;
const MOUTH_C = 30, MOUTH_S = 22;

export const COLORS = { 0: '#fbfbf4', 1: '#f5c518', 2: '#1f5fd1', 3: '#d62b2b', 4: '#6a2fb3', 5: '#f07b17', 6: '#1c8a3c', 7: '#7a1f1f', 8: '#111' };
export const colorOf = (id) => COLORS[id > 8 ? id - 8 : id];
export const isStripe = (id) => id > 8;
export const groupOf = (id) => (id >= 1 && id <= 7 ? 'piene' : id >= 9 ? 'rigate' : null);

/* ---------------- disposizione ---------------- */
export function rack(rand = Math.random) {
  const ids = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  // gli angoli in fondo: una piena e una rigata
  const solid = ids.findIndex((x) => x < 8), sId = ids.splice(solid, 1)[0];
  const stripe = ids.findIndex((x) => x > 8), tId = ids.splice(stripe, 1)[0];
  const corners = rand() < 0.5 ? [sId, tId] : [tId, sId];
  const pos = [];
  const dx = 2 * R * 0.866 + 0.2, dy = 2 * R + 0.2;
  for (let row = 0; row < 5; row++) for (let k = 0; k <= row; k++) pos.push([FOOT[0] + row * dx, FOOT[1] + (k - row / 2) * dy]);
  const order = [];
  let q = 0;
  for (let i = 0; i < 15; i++) {
    if (i === 4) order.push(8);               // centro della terza fila
    else if (i === 10) order.push(corners[0]); // angolo in fondo
    else if (i === 14) order.push(corners[1]);
    else order.push(ids[q++]);
  }
  return [[0, HEAD_X - 60, H / 2], ...order.map((id, i) => [id, +pos[i][0].toFixed(2), +pos[i][1].toFixed(2)])];
}
export function newState() {
  return { balls: rack(), turn: 1, v: [0, 0], groups: { 1: null, 2: null }, inHand: true, kitchen: true, broken: false, msg: 'Spacca! Puoi spostare la bianca nella zona di partenza' };
}

/* ---------------- simulazione ---------------- */
// balls: [[id,x,y],...]  shot: {dx,dy,power 0..1}  → { balls, events, frames }
export function simulate(ballsIn, shot, { record = true, maxT = MAX_T } = {}) {
  const b = ballsIn.map(([id, x, y]) => ({ id, x, y, vx: 0, vy: 0, on: true }));
  const cue = b.find((x) => x.id === 0);
  const len = Math.sqrt(shot.dx * shot.dx + shot.dy * shot.dy) || 1;
  const sp = Math.max(0.02, Math.min(1, shot.power)) * MAX_SPEED;
  cue.vx = (shot.dx / len) * sp; cue.vy = (shot.dy / len) * sp;
  const ev = { first: null, rail: false, pocketed: [], hits: 0, cueRail: 0 };
  const frames = [];
  let t = 0, step = 0;
  const snap = () => frames.push(b.map((o) => (o.on ? [o.id, Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10] : null)).filter(Boolean));
  if (record) snap();
  while (t < maxT) {
    let moving = false;
    for (const o of b) {
      if (!o.on) continue;
      const s2 = o.vx * o.vx + o.vy * o.vy;
      if (s2 === 0) continue;
      const s = Math.sqrt(s2), ns = s - FRICTION * DT;
      if (ns <= STOP) { o.vx = 0; o.vy = 0; continue; }
      o.vx *= ns / s; o.vy *= ns / s;
      o.x += o.vx * DT; o.y += o.vy * DT;
      moving = true;
    }
    // bilia contro bilia
    for (let i = 0; i < b.length; i++) {
      const p = b[i]; if (!p.on) continue;
      for (let j = i + 1; j < b.length; j++) {
        const q = b[j]; if (!q.on) continue;
        const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
        const over = 2 * R - d;
        p.x -= nx * over / 2; p.y -= ny * over / 2; q.x += nx * over / 2; q.y += ny * over / 2;
        if (rel <= 0) continue;
        const jmp = rel * (1 + BALL_E) / 2;
        p.vx -= jmp * nx; p.vy -= jmp * ny; q.vx += jmp * nx; q.vy += jmp * ny;
        if (p.id === 0 || q.id === 0) { if (ev.first === null) ev.first = p.id === 0 ? q.id : p.id; }
        ev.hits++;
      }
    }
    // sponde e buche
    for (const o of b) {
      if (!o.on) continue;
      let pocketed = false;
      for (const [px, py, pr] of POCKETS) {
        const dx = o.x - px, dy = o.y - py;
        if (dx * dx + dy * dy < pr * pr) { pocketed = true; break; }
      }
      if (pocketed || o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
        o.on = false; o.vx = 0; o.vy = 0; ev.pocketed.push(o.id); continue;
      }
      const nearCornerY = o.y < MOUTH_C || o.y > H - MOUTH_C, nearCornerX = o.x < MOUTH_C || o.x > W - MOUTH_C;
      const nearSide = o.x > W / 2 - MOUTH_S && o.x < W / 2 + MOUTH_S;
      let hit = false;
      if (o.x < R && !nearCornerY && o.vx < 0) { o.x = R; o.vx = -o.vx * RAIL_E; o.vy *= 0.97; hit = true; }
      if (o.x > W - R && !nearCornerY && o.vx > 0) { o.x = W - R; o.vx = -o.vx * RAIL_E; o.vy *= 0.97; hit = true; }
      if (o.y < R && !nearCornerX && !nearSide && o.vy < 0) { o.y = R; o.vy = -o.vy * RAIL_E; o.vx *= 0.97; hit = true; }
      if (o.y > H - R && !nearCornerX && !nearSide && o.vy > 0) { o.y = H - R; o.vy = -o.vy * RAIL_E; o.vx *= 0.97; hit = true; }
      if (hit) { if (ev.first !== null) ev.rail = true; if (o.id === 0) ev.cueRail++; }
    }
    t += DT; step++;
    if (record && step % 2 === 0) snap();
    if (!moving) break;
  }
  if (record) snap();
  return { balls: b.filter((o) => o.on).map((o) => [o.id, Math.round(o.x * 100) / 100, Math.round(o.y * 100) / 100]), events: ev, frames };
}

/* ---------------- regole della palla 8 ---------------- */
export function legalTargets(state, team = state.turn) {
  const g = state.groups[team];
  const on = state.balls.map((b) => b[0]).filter((id) => id !== 0);
  if (!state.broken) return on;
  if (!g) return on.filter((id) => id !== 8);
  const mine = on.filter((id) => groupOf(id) === g);
  return mine.length ? mine : [8];
}
export function freeSpot(balls, x, y) {
  let tx = x;
  const busy = (px, py) => balls.some(([, bx, by]) => (bx - px) ** 2 + (by - py) ** 2 < (2 * R + 0.5) ** 2);
  while (busy(tx, y) && tx < W - R) tx += 2 * R + 1;
  if (busy(tx, y)) { tx = x; while (busy(tx, y) && tx > R) tx -= 2 * R + 1; }
  return [tx, y];
}
// valuta un tiro: restituisce il nuovo stato e cosa è successo
export function applyRules(state, result) {
  const ev = result.events, me = state.turn, other = 3 - me;
  const isBreak = !state.broken;
  const targets = legalTargets(state);
  const P = ev.pocketed;
  const scratch = P.includes(0);
  const potted = P.filter((id) => id !== 0);
  let foul = null;
  if (scratch) foul = 'bianca in buca';
  else if (ev.first === null) foul = 'non hai colpito nessuna bilia';
  else if (!isBreak && !targets.includes(ev.first)) foul = ev.first === 8 ? 'hai colpito prima la nera' : 'hai colpito prima una bilia avversaria';
  else if (!isBreak && !potted.length && !ev.rail) foul = 'nessuna bilia ha toccato la sponda';
  const groups = { ...state.groups };
  let balls = result.balls.map((b) => [...b]);
  let end = null, winner = null, msg = '';
  const eight = potted.includes(8);
  if (eight) {
    if (isBreak) {
      const [x, y] = freeSpot(balls, FOOT[0], FOOT[1]);
      balls.push([8, x, y]); msg = 'La nera è entrata allo spacco: torna sul dischetto. ';
    } else if (targets.includes(8) && !foul) { end = 'nera'; winner = me; msg = '🎱 Nera in buca: partita vinta!'; }
    else { end = 'nera'; winner = other; msg = foul ? `Nera in buca con fallo (${foul}): partita persa` : 'Nera in buca troppo presto: partita persa'; }
  }
  // assegnazione dei gruppi
  let assigned = false;
  if (!end && !isBreak && !groups[me] && !foul) {
    const firstPot = potted.find((id) => id !== 8);
    if (firstPot) { groups[me] = groupOf(firstPot); groups[other] = groups[me] === 'piene' ? 'rigate' : 'piene'; assigned = true; }
  }
  const mineGroup = groups[me];
  const pottedMine = potted.filter((id) => (mineGroup ? groupOf(id) === mineGroup : id !== 8));
  const keep = !end && !foul && (isBreak ? potted.some((id) => id !== 8) : pottedMine.length > 0);
  let inHand = false;
  if (scratch) { const [x, y] = freeSpot(balls, HEAD_X, H / 2); balls.unshift([0, x, y]); }
  if (foul && !end) inHand = true;
  const v = [...(state.v || [0, 0])];
  let turn = me;
  if (!end && !keep) { v[me - 1]++; turn = other; }
  if (!end) {
    if (foul) msg += `Fallo: ${foul}. Palla in mano agli avversari.`;
    else if (assigned) msg += `Gruppi decisi: ${groups[me] === 'piene' ? 'piene (1-7)' : 'rigate (9-15)'} per chi ha tirato.`;
    else if (keep) msg += potted.length > 1 ? `Dentro ${potted.length} bilie! Tira ancora.` : 'Dentro! Tira ancora.';
    else msg += potted.length ? 'Dentro, ma non era tua: tocca agli altri.' : 'Niente in buca: tocca agli altri.';
  }
  return {
    state: { balls, turn, v, groups, inHand, kitchen: false, broken: true, msg: msg.trim() },
    foul, keep, end, winner, potted, scratch,
  };
}

/* ---------------- percorsi e mira ---------------- */
// prima bilia colpita lungo una direzione (per la linea di mira)
export function aimRay(balls, cx, cy, dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1; dx /= len; dy /= len;
  let best = null;
  for (const [id, x, y] of balls) {
    if (id === 0) continue;
    const ox = x - cx, oy = y - cy, along = ox * dx + oy * dy;
    if (along <= 0) continue;
    const perp2 = ox * ox + oy * oy - along * along, rr = 4 * R * R;
    if (perp2 > rr) continue;
    const t = along - Math.sqrt(rr - perp2);
    if (!best || t < best.t) best = { t, id, x, y };
  }
  // sponda
  let tw = Infinity;
  if (dx > 0) tw = Math.min(tw, (W - R - cx) / dx); if (dx < 0) tw = Math.min(tw, (R - cx) / dx);
  if (dy > 0) tw = Math.min(tw, (H - R - cy) / dy); if (dy < 0) tw = Math.min(tw, (R - cy) / dy);
  if (best && best.t < tw) {
    const gx = cx + dx * best.t, gy = cy + dy * best.t;
    let nx = best.x - gx, ny = best.y - gy; const nl = Math.sqrt(nx * nx + ny * ny) || 1; nx /= nl; ny /= nl;
    return { ghost: [gx, gy], ball: best, dir: [nx, ny], dx, dy };
  }
  return { wall: [cx + dx * tw, cy + dy * tw], dx, dy };
}
function pathClear(balls, x1, y1, x2, y2, skip) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
  for (const [id, x, y] of balls) {
    if (skip.includes(id)) continue;
    const ox = x - x1, oy = y - y1, a = ox * ux + oy * uy;
    if (a < 0 || a > L) continue;
    if (ox * ox + oy * oy - a * a < (2 * R - 0.5) ** 2) return false;
  }
  return true;
}
export function validCueSpot(balls, x, y, kitchen) {
  if (x < R || x > W - R || y < R || y > H - R) return false;
  if (kitchen && x > HEAD_X) return false;
  return !balls.some(([id, bx, by]) => id !== 0 && (bx - x) ** 2 + (by - y) ** 2 < (2 * R + 0.5) ** 2);
}

/* ---------------- il computer ---------------- */
const NOISE = { facile: 0.05, medio: 0.018, difficile: 0.005 };
export function cpuShot(state, level = 'medio', rand = Math.random) {
  const balls = state.balls, targets = legalTargets(state);
  const others = () => balls.filter((b) => b[0] !== 0);
  let cue = balls.find((b) => b[0] === 0);
  if (!state.broken) { // spacco: forte verso il triangolo
    const cx = state.inHand ? HEAD_X - 60 : cue[1], cy = state.inHand ? H / 2 + (rand() - 0.5) * 60 : cue[2];
    return { place: state.inHand ? [cx, cy] : null, dx: FOOT[0] - cx, dy: FOOT[1] - cy + (rand() - 0.5) * 4, power: 1 };
  }
  const cands = [];
  const tryFrom = (cx, cy, place) => {
    for (const [id, x, y] of others()) {
      if (!targets.includes(id)) continue;
      for (const [px, py] of POCKETS) {
        const tx = px - x, ty = py - y, tl = Math.sqrt(tx * tx + ty * ty), ux = tx / tl, uy = ty / tl;
        const gx = x - ux * 2 * R, gy = y - uy * 2 * R;          // posizione "fantasma" della bianca
        const ax = gx - cx, ay = gy - cy, al = Math.sqrt(ax * ax + ay * ay);
        if (al < 1) continue;
        const cut = (ax * ux + ay * uy) / al;                     // coseno dell'angolo di taglio
        if (cut < 0.3) continue;
        if (!pathClear(balls, x, y, px, py, [id, 0])) continue;
        if (!pathClear(balls, cx, cy, gx, gy, [id, 0])) continue;
        const need = Math.min(1, 0.25 + (al + tl) / 1700 / Math.max(0.35, cut));
        cands.push({ dx: ax, dy: ay, power: need, place, score0: cut * 2 - (al + tl) / 1500 });
      }
    }
  };
  if (state.inHand) {
    // prova qualche posizione comoda per la bianca
    for (const [id, x, y] of others()) {
      if (!targets.includes(id)) continue;
      for (const [px, py] of POCKETS) {
        const ux = px - x, uy = py - y, l = Math.sqrt(ux * ux + uy * uy);
        for (const back of [90, 170]) {
          const cx = x - (ux / l) * back, cy = y - (uy / l) * back;
          if (validCueSpot(balls, cx, cy, state.kitchen)) tryFrom(cx, cy, [cx, cy]);
        }
      }
    }
    if (!cands.length) {
      for (let k = 0; k < 40 && !cands.length; k++) {
        const cx = R + rand() * ((state.kitchen ? HEAD_X : W) - 2 * R), cy = R + rand() * (H - 2 * R);
        if (validCueSpot(balls, cx, cy, state.kitchen)) { cue = [0, cx, cy]; tryFrom(cx, cy, [cx, cy]); if (!cands.length) cands.push({ place: [cx, cy], safety: true }); }
      }
    }
  } else tryFrom(cue[1], cue[2], null);
  // valuta i candidati simulando il tiro
  const evalShot = (c) => {
    const bs = c.place ? [[0, c.place[0], c.place[1]], ...balls.filter((b) => b[0] !== 0)] : balls;
    let best = -1e9, bestP = c.power;
    for (const p of [c.power, Math.min(1, c.power * 1.35), c.power * 0.8]) {
      const r = simulate(bs, { dx: c.dx, dy: c.dy, power: p }, { record: false, maxT: 9 });
      const out = applyRules({ ...state, balls: bs }, r);
      let sc = out.end ? (out.winner === state.turn ? 5000 : -5000) : out.foul ? -300 : out.keep ? 400 + out.potted.length * 40 : 0;
      if (sc > best) { best = sc; bestP = p; }
    }
    return { ...c, power: bestP, score: best + (c.score0 || 0) * 30 };
  };
  let pool = cands.filter((c) => !c.safety).sort((a, b) => b.score0 - a.score0).slice(0, 14).map(evalShot);
  if (!pool.length || Math.max(...pool.map((c) => c.score)) <= 0) {
    // tiro di sicurezza: tocca almeno una bilia giusta
    const from = cands.find((c) => c.place)?.place || (cue ? [cue[1], cue[2]] : [HEAD_X, H / 2]);
    for (const [id, x, y] of others()) if (targets.includes(id)) pool.push(evalShot({ dx: x - from[0], dy: y - from[1], power: 0.35, place: state.inHand ? from : null, score0: 0 }));
  }
  pool.sort((a, b) => b.score - a.score);
  const pick = pool[0] || { dx: 1, dy: 0, power: 0.5, place: state.inHand ? [HEAD_X - 40, H / 2] : null };
  const n = NOISE[level] || NOISE.medio, a = (rand() - 0.5) * 2 * n, c = Math.cos(a), s = Math.sin(a);
  return { place: pick.place, dx: pick.dx * c - pick.dy * s, dy: pick.dx * s + pick.dy * c, power: pick.power };
}
