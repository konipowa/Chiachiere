// 🐭 Topolini Golosi — i topolini escono dalle tane e si mangiano il disegno, un blocchetto alla volta.
// Regole: tocchi la tana in cima a una colonna, va in uno dei 5 posti e i topolini del suo colore
// escono a mangiare solo i blocchetti raggiungibili dall'esterno. Se riempi i 5 posti senza poter mangiare, hai perso.

import { MOSAICI } from './livelli-topolini.js?v=23';

const SLOTS = 5;

/* ---------------- DISEGNI ---------------- */
const C = {
  rosso: '#ff5d73', rossoScuro: '#d93a55', rosa: '#ff9fc8', bianco: '#fff4e8', giallo: '#ffd23f', arancio: '#ff9f43',
  marrone: '#9b6b4e', cacao: '#6e4a3a', verde: '#5fcf80', verdeScuro: '#2f9e5b', azzurro: '#5ec8f2', blu: '#4a7ef0',
  viola: '#a07cf0', grigio: '#b9b4cc', nero: '#4b4045', menta: '#7fe0c4', beige: '#f2d3a6', crema: '#ffe7a8',
};
const DESIGNS = [
  { name: 'Cuore', pal: { D: C.rosso, R: C.rosa, P: C.bianco }, map: [
    '.DDD...DDD.', 'DRRRD.DRRRD', 'DRPPRDRRRRD', 'DRPRRRRRRRD', 'DRRRRRRRRRD', '.DRRRRRRRD.', '..DRRRRRD..', '...DRRRD...', '....DRD....', '.....D.....'] },
  { name: 'Formaggio', pal: { Y: C.giallo, O: C.arancio, K: C.marrone }, map: [
    '..........YY', '........YYYY', '......YYOYYY', '....YYYYYYYY', '..YYOYYYYOYY', 'YYYYYYYYYYYY', 'KKKKKKKKKKKK', 'YYOYYYYYOYYY', 'YYYYYYOYYYYY', 'YYYYYYYYYYYY', 'KKKKKKKKKKKK'] },
  { name: 'Fungo', pal: { R: C.rosso, W: C.bianco, B: C.beige }, map: [
    '....RRRR....', '..RRWWRRRR..', '.RRWWWRRWWR.', '.RRRWRRRWWR.', 'RRRRRRRRRRRR', 'RWWRRRRRRWWR', 'RWWRRRRRRWWR', '.RRRRRRRRRR.', '....BBBB....', '...BBBBBB...', '...BBBBBB...', '....BBBB....'] },
  { name: 'Topolino', pal: { G: C.grigio, P: C.rosa, K: C.nero, W: C.bianco }, map: [
    'GG........GG', 'GPPG....GPPG', 'GPPGGGGGGPPG', '.GGGGGGGGGG.', '.GGWKGGWKGG.', '.GGKKGGKKGG.', 'GGGGGGGGGGGG', 'GGGGGPPGGGGG', '.GGGGGGGGGG.', '..GGGGGGGG..', '....GGGG....'] },
  { name: 'Cupcake', pal: { C: C.rosso, P: C.rosa, W: C.bianco, B: C.cacao, L: C.beige }, map: [
    '.....CC.....', '.....CC.....', '...PPPPPP...', '..PPWPPPPP..', '.PPPPPPWPPP.', 'PPWPPPPPPPPP', 'PPPPPPPPWPPP', '.BLBLBLBLBL.', '.BLBLBLBLBL.', '..BLBLBLBL..', '..BLBLBLBL..', '...BBBBBB...'] },
  { name: 'Fiore', pal: { P: C.rosa, Y: C.giallo, G: C.verde }, map: [
    '...PP..PP...', '..PPPPPPPP..', '..PPYYYYPP..', '.PPPYYYYPPP.', '.PPPYYYYPPP.', '..PPYYYYPP..', '..PPPPPPPP..', '...PP.GPP...', '......G.....', '..GG..G.....', '...GGGG..GG.', '......GGGG..'] },
  { name: 'Fragola', pal: { G: C.verde, R: C.rosso, Y: C.crema }, map: [
    '....GGGG....', '..GGGGGGGG..', '...RRGGRR...', '.RRRRRRRRRR.', 'RRYRRRYRRRYR', 'RRRRRRRRRRRR', 'RRRYRRRYRRRR', '.RRRRRRRRRR.', '.RYRRRYRRYR.', '..RRRRRRRR..', '...RRYRRR...', '....RRRR....', '.....RR.....'] },
  { name: 'Gelato', pal: { M: C.menta, W: C.bianco, P: C.rosa, C: C.beige, K: C.marrone }, map: [
    '...MMMMMM...', '..MMMMMMMM..', '..MMWMMMMM..', '.PPPPPPPPPP.', 'PPPWPPPPPPPP', 'PPPPPPPPPPPP', '.CKCKCKCKCK.', '..CKCKCKCK..', '..KCKCKCKC..', '...CKCKCK...', '....CKCK....', '.....CC.....'] },
  { name: 'Gattino', pal: { O: C.arancio, W: C.bianco, K: C.nero, P: C.rosa }, map: [
    'O..........O', 'OO........OO', 'OPO......OPO', 'OPPOOOOOOPPO', 'OOOOOOOOOOOO', 'OOKKOOOOKKOO', 'OOKWOOOOKWOO', 'OOOOOPPOOOOO', 'WWOOOOOOOOWW', '.OOWWWWWWOO.', '..OOOOOOOO..'] },
  { name: 'Stella', pal: { Y: C.giallo, O: C.arancio }, map: [
    '.....YY.....', '.....YY.....', '....YYYY....', 'YYYYYOOYYYYY', '.YYYOOOOYYY.', '..YYOOOOYY..', '...YYOOYY...', '...YYYYYY...', '..YYY..YYY..', '..YY....YY..', '.YY......YY.'] },
  { name: 'Arcobaleno', pal: { R: C.rosso, O: C.arancio, Y: C.giallo, G: C.verde, B: C.azzurro, V: C.viola }, map: [
    '...RRRRRR...', '..RRRRRRRR..', '.RROOOOOORR.', 'RROOYYYYOORR', 'ROOYYGGYYOOR', 'ROYYGGGGYYOR', 'ROYGGBBGGYOR', 'ROYGBVVBGYOR', 'ROYGBVVBGYOR'] },
];
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function designFor(level) {
  if (level <= DESIGNS.length) {
    const d = DESIGNS[level - 1];
    const colors = [...new Set(d.map.join('').replace(/\./g, ''))];
    const grid = d.map.map((row) => [...row].map((ch) => (ch === '.' ? -1 : colors.indexOf(ch))));
    return { name: d.name, grid, colors: colors.map((ch) => d.pal[ch]) };
  }
  // dal livello 12: mosaici ricavati da Twemoji, dal più facile al più difficile, poi un giro bonus infinito
  const idx = level - DESIGNS.length - 1, P = MOSAICI.percorso.length, B = MOSAICI.bonus.length;
  const giro = idx < P ? 0 : 1 + Math.floor((idx - P) / B);
  const m = idx < P ? MOSAICI.percorso[idx] : MOSAICI.bonus[(idx - P) % B];
  const grid = [];
  for (let y = 0; y < m.h; y++) grid.push([...m.g.slice(y * m.w, (y + 1) * m.w)].map((ch) => (ch === '.' ? -1 : 'abcdefgh'.indexOf(ch))));
  return { name: m.n + (giro ? ' ' + '✦'.repeat(Math.min(giro, 5)) : ''), grid, colors: m.c };
}

/* ---------------- LOGICA ---------------- */
function exposedSet(grid) {
  const H = grid.length, W = grid[0].length;
  const out = Array.from({ length: H + 2 }, () => Array(W + 2).fill(false));
  const q = [[0, 0]]; out[0][0] = true;
  while (q.length) {
    const [y, x] = q.pop();
    for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ny = y + dy, nx = x + dx;
      if (ny < 0 || nx < 0 || ny > H + 1 || nx > W + 1 || out[ny][nx]) continue;
      const inside = ny >= 1 && nx >= 1 && ny <= H && nx <= W;
      if (inside && grid[ny - 1][nx - 1] !== -1) continue;
      out[ny][nx] = true; q.push([ny, nx]);
    }
  }
  const exp = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] === -1) continue;
    if (out[y][x + 1] || out[y + 2][x + 1] || out[y + 1][x] || out[y + 1][x + 2]) exp.add(y * W + x);
  }
  return exp;
}

// difficoltà extra: tane legate (dal 20) e blocchi duri (dal 30)
function features(level) {
  return {
    links: level < 20 ? 0 : level < 60 ? 1 : level < 120 ? 2 : 3,
    hard: level < 30 ? 0 : Math.min(4, 1 + Math.floor((level - 30) / 35)),
    hpMax: level < 30 ? 0 : Math.min(50, 10 + 5 * Math.floor((level - 30) / 15)),
  };
}

function makeTanks(grid, hp, nColors, level, r) {
  const counts = Array(nColors).fill(0);
  grid.forEach((row, y) => row.forEach((c, x) => c >= 0 && (counts[c] += hp[y][x])));
  const sizes = level < 4 ? [10] : level < 12 ? [10, 20] : [10, 20, 30];
  const tanks = [];
  counts.forEach((n, color) => {
    while (n > 0) {
      let take = sizes[Math.floor(r() * sizes.length)];
      if (take > n) take = n;
      if (n - take > 0 && n - take < 6) take = n; // niente tane minuscole
      tanks.push({ color, count: take }); n -= take;
    }
  });
  return tanks;
}

// la tana in cima alla colonna li è prendibile? (se è legata, serve anche la compagna in cima)
function partnerLane(lanes, li) {
  const t = lanes[li][0];
  if (!t || t.link == null) return -1;
  return lanes.findIndex((l, j) => j !== li && l[0] && l[0].link === t.link);
}

// controllo che il livello sia risolvibile (giocatore "ragionevole")
function solvable(grid0, hp0, lanes0, slots) {
  const grid = grid0.map((r) => r.slice()), hp = hp0.map((r) => r.slice()), W = grid[0].length;
  const lanes = lanes0.map((l) => l.map((t) => ({ ...t })));
  const active = [];
  let left = hp.flat().reduce((a, b) => a + b, 0);
  for (let guard = 0; guard < 4000; guard++) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const t of active) {
        if (!t.count) continue;
        const exp = exposedSet(grid);
        for (const i of exp) {
          const y = Math.floor(i / W), x = i % W;
          if (grid[y][x] !== t.color) continue;
          const bite = Math.min(t.count, hp[y][x]);
          hp[y][x] -= bite; t.count -= bite; left -= bite; moved = true;
          if (!hp[y][x]) grid[y][x] = -1;
          break;
        }
      }
      for (let i = active.length - 1; i >= 0; i--) if (!active[i].count) active.splice(i, 1);
    }
    if (!left) return true;
    const exp = exposedSet(grid);
    const expColors = new Set([...exp].map((i) => grid[Math.floor(i / W)][i % W]));
    const options = lanes.map((l, li) => {
      if (!l.length) return null;
      if (l[0].link == null) return active.length < slots ? { li, pj: -1, good: expColors.has(l[0].color) } : null;
      const pj = partnerLane(lanes, li);
      if (pj < 0 || active.length + 2 > slots) return null;
      return { li, pj, good: expColors.has(l[0].color) || expColors.has(lanes[pj][0].color) };
    }).filter(Boolean);
    if (!options.length) return false;
    const o = options.find((x) => x.good) || options[0];
    const t = lanes[o.li].shift(); active.push(t);
    if (o.pj >= 0) active.push(lanes[o.pj].shift());
  }
  return false;
}

function buildLevel(level) {
  const d = designFor(level);
  const nLanes = 3;
  const base = d.grid.map((row) => row.map((c) => (c >= 0 ? 1 : 0)));
  const tryBuild = (attempt, f) => {
    const r = rng(level * 1000 + attempt);
    const hp = base.map((row) => row.slice());
    const cells = [];
    d.grid.forEach((row, y) => row.forEach((c, x) => c >= 0 && cells.push([y, x])));
    const steps = [5, 10, 15, 20, 30, 40, 50].filter((v) => v <= f.hpMax);
    for (let k = 0; k < f.hard && cells.length > 20; k++) {
      const [y, x] = cells.splice(Math.floor(r() * cells.length), 1)[0];
      hp[y][x] = steps[Math.floor(r() * steps.length)];
    }
    const tanks = makeTanks(d.grid, hp, d.colors.length, level, r);
    for (let i = tanks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tanks[i], tanks[j]] = [tanks[j], tanks[i]]; }
    const lanes = Array.from({ length: nLanes }, () => []);
    tanks.forEach((t, i) => lanes[i % nLanes].push(t));
    for (let k = 0, tries = 0; k < f.links && tries < 40; tries++) {
      const li = Math.floor(r() * (nLanes - 1)), j = Math.floor(r() * Math.max(1, Math.min(lanes[li].length, lanes[li + 1].length)));
      const a = lanes[li][j], b = lanes[li + 1][j];
      if (!a || !b || a.link != null || b.link != null || a.color === b.color) continue;
      a.link = b.link = k++;
    }
    return solvable(d.grid, hp, lanes, SLOTS) ? { ...d, hp, lanes, feats: { links: lanes.flat().some((t) => t.link != null), hard: hp.flat().some((v) => v > 1) } } : null;
  };
  const f = features(level);
  for (let attempt = 0; attempt < 80; attempt++) { const L = tryBuild(attempt, f); if (L) return L; }
  for (let attempt = 80; attempt < 200; attempt++) { const L = tryBuild(attempt, { links: 0, hard: 0, hpMax: 0 }); if (L) return L; }
  return tryBuild(999, { links: 0, hard: 0, hpMax: 0 }) || { ...d, hp: base, lanes: [makeTanks(d.grid, base, d.colors.length, level, rng(level)), [], []], feats: {} };
}

/* ---------------- DISEGNO ---------------- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function drawBlock(ctx, x, y, s, col, scale = 1) {
  const pad = s * 0.06, w = (s - pad * 2) * scale, o = (s - w) / 2;
  const g = ctx.createLinearGradient(0, y + o, 0, y + o + w);
  g.addColorStop(0, shade(col, 0.12)); g.addColorStop(1, shade(col, -0.1));
  rr(ctx, x + o, y + o, w, w, w * 0.3); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  rr(ctx, x + o + w * 0.16, y + o + w * 0.12, w * 0.45, w * 0.18, w * 0.1); ctx.fill();
}
function drawMouse(ctx, x, y, s, col, t = 0, flip = false) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 25) * s * 0.04); if (flip) ctx.scale(-1, 1);
  // coda
  ctx.strokeStyle = shade(col, -0.2); ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.38, s * 0.12); ctx.quadraticCurveTo(-s * 0.7, s * 0.05 + Math.sin(t * 18) * s * 0.1, -s * 0.62, -s * 0.2); ctx.stroke();
  // corpo
  const g = ctx.createRadialGradient(-s * 0.1, -s * 0.15, s * 0.05, 0, 0, s * 0.55);
  g.addColorStop(0, shade(col, 0.22)); g.addColorStop(1, shade(col, -0.05));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.45, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  // orecchie
  for (const ex of [-0.05, 0.28]) {
    ctx.fillStyle = shade(col, 0.05); ctx.beginPath(); ctx.arc(s * ex, -s * 0.3, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb3cf'; ctx.beginPath(); ctx.arc(s * ex, -s * 0.3, s * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  // occhi e naso
  ctx.fillStyle = '#3a2d33'; ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.05, s * 0.065, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.24, -s * 0.07, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.arc(s * 0.45, s * 0.04, s * 0.07, 0, Math.PI * 2); ctx.fill();
  // guance
  ctx.fillStyle = 'rgba(255,140,180,.35)'; ctx.beginPath(); ctx.arc(s * 0.2, s * 0.12, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawTank(ctx, cx, cy, w, col, n, opts = {}) {
  const h = w * 1.05, x = cx - w / 2, y = cy - h / 2;
  ctx.save(); ctx.globalAlpha = opts.alpha ?? 1;
  ctx.shadowColor = 'rgba(80,30,10,.18)'; ctx.shadowBlur = w * 0.15; ctx.shadowOffsetY = w * 0.06;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.12));
  rr(ctx, x, y, w, h, w * 0.3); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(ctx, x + w * 0.14, y + w * 0.1, w * 0.5, w * 0.14, w * 0.07); ctx.fill();
  // tana (buchetto) con topolino che sbircia
  ctx.fillStyle = 'rgba(60,30,20,.35)'; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.72, w * 0.26, w * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  if (n > 0) drawMouse(ctx, cx, y + h * 0.6, w * 0.34, col);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = w * 0.06;
  ctx.font = `800 ${Math.round(w * 0.3)}px "Atkinson Hyperlegible", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(String(n), cx, y + h * 0.3); ctx.fillText(String(n), cx, y + h * 0.3);
  if (opts.glow) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; rr(ctx, x - 3, y - 3, w + 6, h + 6, w * 0.34); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- PARTITA ---------------- */
export function startTopolini({ level: startLevel = 1, onWin, onClose }) {
  let level = startLevel;
  const root = document.createElement('div');
  root.className = 'topo-root';
  root.innerHTML = `
    <div class="topo-top">
      <button class="topo-x" aria-label="Chiudi">✕</button>
      <div class="topo-title"><b class="topo-lvl"></b><span class="topo-name"></span></div>
      <button class="topo-x topo-restart" aria-label="Ricomincia">↻</button>
    </div>
    <div class="topo-bar"><span></span></div>
    <div class="topo-stage"><canvas></canvas></div>
    <div class="topo-credit">originale Chiacchiere · disegni da Twemoji (CC-BY 4.0)</div>
    <div class="topo-modal" hidden></div>`;
  document.body.append(root); document.body.style.overflow = 'hidden';
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const modal = root.querySelector('.topo-modal');
  root.querySelector('.topo-x').onclick = close;
  root.querySelector('.topo-restart').onclick = () => load(level);

  let G, HP, W, H, colors, lanes, slots, mice, particles, eating, exposed, totalBlocks, leftBlocks, cell, ox, oy, layout, running, over, stuckTimer, raf, last;

  function load(lv) {
    level = lv; modal.hidden = true; over = false; stuckTimer = 0;
    const L = buildLevel(lv);
    G = L.grid.map((r) => r.slice()); HP = L.hp.map((r) => r.slice()); H = G.length; W = G[0].length; colors = L.colors;
    lanes = L.lanes.map((l) => l.map((t) => ({ ...t, left: t.count })));
    slots = Array(SLOTS).fill(null); mice = []; particles = []; eating = new Map();
    exposed = exposedSet(G);
    totalBlocks = leftBlocks = HP.flat().reduce((a, b) => a + b, 0);
    root.querySelector('.topo-lvl').textContent = `Livello ${lv}`;
    root.querySelector('.topo-name').textContent = L.name;
    resize(); running = true;
    // spiegazione la prima volta che compaiono le novità
    if (L.feats?.links && !localStorage.getItem('topo-legate')) {
      localStorage.setItem('topo-legate', '1');
      showModal('<div class="topo-emoji">🔗🐭</div><h2>Novità: tane legate</h2><p>Due tane unite dalla <b>catena</b> partono <b>insieme</b>: servono <b>2 posti liberi</b> e devono essere tutte e due in cima alla loro colonna.</p>', [['Ok!', () => (modal.hidden = true)]]);
    } else if (L.feats?.hard && !localStorage.getItem('topo-duri')) {
      localStorage.setItem('topo-duri', '1');
      showModal('<div class="topo-emoji">🧀💪</div><h2>Novità: blocchi duri</h2><p>I blocchetti con un <b>numero</b> sono duri: spariscono solo dopo <b>quel numero di morsi</b> del loro colore. Finché ci sono, coprono quelli dietro!</p>', [['Ok!', () => (modal.hidden = true)]]);
    }
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = rect.width, ch = rect.height;
    const picH = ch * 0.5;
    // spazio attorno al disegno per il sentiero dei topolini (1 casella + margine), così non escono dallo schermo
    cell = Math.min(cw / (W + 3.4), (picH - 6) / (H + 3.4));
    ox = (cw - cell * W) / 2; oy = 6 + cell * 1.7 + (picH - 6 - cell * (H + 3.4)) / 2;
    const slotW = Math.min(62, (cw - 24) / SLOTS - 10);
    const slotY = picH + slotW * 0.75 + 12;
    const laneTop = slotY + slotW * 0.6 + 24;
    const laneW = cw / lanes.length;
    const tankW = Math.max(40, Math.min(84, laneW * 0.66, (ch - laneTop - 10) / (1.05 * 2.8)));
    layout = { cw, ch, picH, slotY, slotW, laneTop, laneW, tankW };
  }
  const slotX = (i) => layout.cw / 2 + (i - (SLOTS - 1) / 2) * (layout.slotW + 10);
  const laneX = (i) => layout.laneW * (i + 0.5);
  const laneY = (k) => layout.laneTop + layout.tankW * 0.53 + k * layout.tankW * 0.95;

  function tap(e) {
    if (!running || over) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    lanes.forEach((lane, i) => {
      if (!lane.length) return;
      const cx = laneX(i), cy = laneY(0), w = layout.tankW;
      if (Math.abs(x - cx) < w * 0.6 && Math.abs(y - cy) < w * 0.65) {
        const free = slots.map((s, k) => (s ? -1 : k)).filter((k) => k >= 0);
        const pj = lane[0].link != null ? partnerLane(lanes, i) : -1;
        if (lane[0].link != null && pj < 0) { buzz(); hint = { text: '🔗 La tana legata non è ancora in cima', t: performance.now() }; return; }
        const need = pj >= 0 ? 2 : 1;
        if (free.length < need) { buzz(); if (need === 2) hint = { text: '🔗 Servono 2 posti liberi', t: performance.now() }; return; }
        const go = (li, slot) => { const t = lanes[li].shift(); slots[slot] = { ...t, from: { x: laneX(li), y: laneY(0) }, born: performance.now(), cool: 0, inFlight: 0 }; };
        go(i, free[0]); if (pj >= 0) go(pj, free[1]);
        navigator.vibrate?.(8);
      }
    });
  }
  let hint = null;
  let buzzT = 0; const buzz = () => { buzzT = performance.now(); navigator.vibrate?.([20, 40, 20]); };
  canvas.addEventListener('pointerdown', tap);
  window.addEventListener('resize', resize);
  const ro = new ResizeObserver(() => G && resize()); ro.observe(canvas.parentNode);
  window.__topo = { laneX: (i) => laneX(i), laneY: (k) => laneY(k), rect: () => canvas.getBoundingClientRect() };

  function pickTarget(color, sx) {
    let best = -1, bestScore = -1e9;
    for (const i of exposed) {
      const y = Math.floor(i / W), x = i % W;
      if ((eating.get(i) || 0) >= HP[y][x]) continue;
      if (G[y][x] !== color) continue;
      const score = y * 3 - Math.abs(ox + (x + 0.5) * cell - sx) / cell;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  // la passeggiata: camminano sul bordo e nei buchi già mangiati, mai sopra i blocchetti
  const WALK = 175; // pixel al secondo su un telefono normale
  const GAP = 450; // millisecondi tra un topolino e il successivo all'ingresso (fila ordinata)
  let lastDoor = 0;
  const layoutScale = () => Math.max(0.8, Math.min(1.4, layout.cw / 390));
  const cellCenter = (gy, gx) => [ox + (gx - 0.5) * cell, oy + (gy - 0.5) * cell]; // coordinate con bordo di 1 cella
  // percorso ordinato: tutti entrano dallo stesso punto in basso e girano attorno al disegno in senso orario,
  // in fila indiana; arrivati all'altezza giusta entrano nei buchi, mordono, poi riprendono il giro fino a casa.
  function ringOf() {
    const PH = H + 2, PW = W + 2, ex = Math.floor(PW / 2), ring = [];
    for (let x = ex; x >= 0; x--) ring.push([PH - 1, x]);
    for (let y = PH - 2; y >= 0; y--) ring.push([y, 0]);
    for (let x = 1; x < PW; x++) ring.push([0, x]);
    for (let y = 1; y < PH; y++) ring.push([y, PW - 1]);
    for (let x = PW - 2; x > ex; x--) ring.push([PH - 1, x]);
    return ring;
  }
  function walkPath(sx, sy, target) {
    const PH = H + 2, PW = W + 2, tyy = Math.floor(target / W) + 1, txx = (target % W) + 1;
    const ring = ringOf(), ringIdx = new Map(ring.map(([y, x], i) => [y * PW + x, i]));
    const free = (y, x) => y >= 0 && x >= 0 && y < PH && x < PW && (y === 0 || x === 0 || y === PH - 1 || x === PW - 1 || G[y - 1][x - 1] === -1);
    // BFS dal blocchetto verso l'esterno: next = passo successivo verso il blocchetto
    const next = new Map(), dist = new Map(), q = [];
    for (const [dy, dx] of [[1, 0], [0, -1], [0, 1], [-1, 0]]) {
      const y = tyy + dy, x = txx + dx;
      if (free(y, x)) { const k = y * PW + x; if (!dist.has(k)) { dist.set(k, 0); next.set(k, -1); q.push([y, x]); } }
    }
    while (q.length) {
      const [y, x] = q.shift(), k = y * PW + x;
      for (const [dy, dx] of [[1, 0], [0, -1], [0, 1], [-1, 0]]) {
        const ny = y + dy, nx = x + dx, nk = ny * PW + nx;
        if (!free(ny, nx) || dist.has(nk)) continue;
        dist.set(nk, dist.get(k) + 1); next.set(nk, k); q.push([ny, nx]);
      }
    }
    // da quale punto del giro conviene entrare
    let best = 0, bestScore = 1e9;
    ring.forEach(([y, x], i) => { const d = dist.get(y * PW + x); if (d !== undefined && i + d * 1.5 < bestScore) { bestScore = i + d * 1.5; best = i; } });
    const c = (y, x) => cellCenter(y, x);
    const tgt = c(tyy, txx);
    const inner = [];
    let k = ring[best][0] * PW + ring[best][1];
    while (k !== -1 && k !== undefined) { const nk = next.get(k); if (nk === undefined) break; if (nk !== -1) inner.push(c(Math.floor(nk / PW), nk % PW)); k = nk; }
    const lastP = inner.length ? inner[inner.length - 1] : c(...ring[best]);
    const bite = [(lastP[0] + tgt[0]) / 2, (lastP[1] + tgt[1]) / 2];
    const goRing = ring.slice(0, best + 1).map(([y, x]) => c(y, x));
    const backRing = ring.slice(best).map(([y, x]) => c(y, x)).concat([c(...ring[0])]);
    const door = [c(...ring[0])[0], c(...ring[0])[1] + cell * 0.9];
    return {
      go: [[sx, sy], door, ...goRing, ...inner, bite],
      back: [bite, ...inner.slice().reverse(), ...backRing, door, [sx, sy]],
    };
  }
  function pathLens(p) {
    const acc = [0];
    for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    return { acc, total: acc[acc.length - 1] || 0.001 };
  }
  function posOnPath(m) {
    const { acc } = m.lens, p = m.path;
    let i = 1; while (i < acc.length - 1 && acc[i] < m.d) i++;
    const seg = acc[i] - acc[i - 1] || 1, k = Math.max(0, Math.min(1, (m.d - acc[i - 1]) / seg));
    const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k;
    return [x, y, p[i][0] - p[i - 1][0] || (m.phase === 'back' ? 1 : -1)];
  }

  function step(dt, now) {
    // ogni tana manda fuori i suoi topolini
    slots.forEach((s, si) => {
      if (!s) return;
      s.cool -= dt;
      if (s.left > 0 && s.cool <= 0 && now - s.born > 300 && now - lastDoor > GAP) {
        const sx = slotX(si), sy = layout.slotY - layout.slotW * 0.3;
        const target = pickTarget(s.color, sx);
        if (target >= 0) {
          eating.set(target, (eating.get(target) || 0) + 1);
          const route = walkPath(sx, sy, target);
          mice.push({ slot: si, color: s.color, target, route, path: route.go, lens: pathLens(route.go), d: 0, phase: 'go', wait: 0 });
          s.left--; s.inFlight++; s.cool = 0.3; lastDoor = now;
        }
      }
    });
    // topolini in passeggiata
    for (const m of mice) {
      if (m.phase === 'go' || m.phase === 'back') {
        m.d += WALK * layoutScale() * dt;
        if (m.d >= m.lens.total) {
          m.d = m.lens.total;
          if (m.phase === 'go') {
            m.phase = 'eat'; m.wait = 0;
            const y = Math.floor(m.target / W), x = m.target % W;
            const col = colors[G[y][x]];
            HP[y][x]--; leftBlocks--; m.carry = col;
            const n = (eating.get(m.target) || 1) - 1; if (n > 0) eating.set(m.target, n); else eating.delete(m.target);
            const gone = HP[y][x] <= 0;
            if (gone) { G[y][x] = -1; exposed = exposedSet(G); }
            const [px, py] = m.path[m.path.length - 1];
            for (let k = 0; k < (gone ? 5 : 2); k++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120 - 30, life: 0.5, col, r: cell * (0.07 + Math.random() * 0.07) });
          } else {
            m.phase = 'done';
            const s = slots[m.slot]; if (s) s.inFlight--;
          }
        }
      } else if (m.phase === 'eat') {
        m.wait += dt;
        if (m.wait >= 0.22) { m.phase = 'back'; m.path = m.route.back; m.lens = pathLens(m.path); m.d = 0; }
      }
    }
    mice = mice.filter((m) => m.phase !== 'done');
    slots.forEach((s, i) => { if (s && s.left === 0 && s.inFlight === 0) { slots[i] = null; for (let k = 0; k < 8; k++) particles.push({ x: slotX(i), y: layout.slotY, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, life: 0.5, col: '#ffffff', r: 4 }); } });
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; }
    particles = particles.filter((p) => p.life > 0);

    if (!leftBlocks && !mice.length) return win();
    // bloccato? 5 posti pieni e nessuno può mangiare
    const full = slots.every(Boolean);
    const anyMove = mice.length || slots.some((s) => s && s.left > 0 && pickTarget(s.color, 0) >= 0);
    if (full && !anyMove) { stuckTimer += dt; if (stuckTimer > 0.8) lose(); } else stuckTimer = 0;
  }

  function draw(now) {
    const { cw, ch, picH, slotY, slotW, tankW } = layout;
    ctx.clearRect(0, 0, cw, ch);
    // tavola del disegno
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, ox - 10, oy - 10, cell * W + 20, cell * H + 20, 24); ctx.fill();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = G[y][x];
      if (c < 0) { ctx.fillStyle = 'rgba(255,200,170,.18)'; rr(ctx, ox + x * cell + cell * 0.3, oy + y * cell + cell * 0.3, cell * 0.4, cell * 0.4, cell * 0.2); ctx.fill(); continue; }
      const i = y * W + x;
      drawBlock(ctx, ox + x * cell, oy + y * cell, cell, colors[c], eating.has(i) ? 0.92 : 1);
      if (HP[y][x] > 1) {
        const bx = ox + x * cell, by = oy + y * cell;
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1.5, cell * 0.1);
        rr(ctx, bx + cell * 0.1, by + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.25); ctx.stroke();
        ctx.font = `800 ${Math.round(cell * (HP[y][x] > 9 ? 0.5 : 0.62))}px "Atkinson Hyperlegible", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(2, cell * 0.12); ctx.strokeStyle = 'rgba(40,20,20,.75)'; ctx.fillStyle = '#fff';
        ctx.strokeText(HP[y][x], bx + cell / 2, by + cell / 2 + 1); ctx.fillText(HP[y][x], bx + cell / 2, by + cell / 2 + 1);
      }
    }
    // posti
    const shake = now - buzzT < 300 ? Math.sin(now / 20) * 4 : 0;
    for (let i = 0; i < SLOTS; i++) {
      const x = slotX(i) + shake;
      ctx.strokeStyle = 'rgba(200,140,110,.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      rr(ctx, x - slotW / 2, slotY - slotW / 2, slotW, slotW * 1.05, slotW * 0.3); ctx.stroke(); ctx.setLineDash([]);
      const s = slots[i];
      if (s) {
        const k = Math.min(1, (now - s.born) / 220);
        const cx = s.from.x + (x - s.from.x) * k, cy = s.from.y + (slotY - s.from.y) * k;
        drawTank(ctx, cx, cy, slotW * (0.9 + 0.1 * Math.sin(k * Math.PI)), colors[s.color], s.left);
      }
    }
    // colonne di tane
    // catene tra le tane legate visibili
    const seen = {};
    lanes.forEach((lane, li) => lane.slice(0, 3).forEach((t, k) => { if (t.link != null) (seen[t.link] = seen[t.link] || []).push([laneX(li), laneY(k)]); }));
    Object.values(seen).forEach((pts) => {
      if (pts.length < 2) return;
      const [[x1, y1], [x2, y2]] = pts; const n = 7;
      for (let q = 0; q <= n; q++) {
        const px = x1 + (x2 - x1) * q / n, py = y1 + (y2 - y1) * q / n;
        ctx.strokeStyle = '#8f7466'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 6, 4, q % 2 ? 0 : Math.PI / 2, 0, Math.PI * 2); ctx.stroke();
      }
    });
    lanes.forEach((lane, li) => {
      for (let k = Math.min(lane.length, 3) - 1; k >= 0; k--) {
        const t = lane[k];
        drawTank(ctx, laneX(li), laneY(k), tankW * (k ? 0.82 : 1), colors[t.color], t.count, { alpha: k ? 0.55 : 1, glow: !k && slots.some((s) => !s) });
      }
      if (lane[0]?.link != null) { ctx.font = `${Math.round(tankW * 0.28)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🔗', laneX(li) + tankW * 0.42, laneY(0) - tankW * 0.42); }
      if (lane.length > 3) { ctx.fillStyle = '#9c7f70'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`+${lane.length - 3}`, laneX(li), laneY(2) + tankW * 0.6); }
    });
    // topolini
    for (const m of mice) {
      const [x, y, dx] = posOnPath(m);
      const sz = Math.max(13, Math.min(20, cell * 0.8));
      if (m.phase === 'back' && m.carry) {
        drawMouse(ctx, x, y, sz, colors[m.color], now / 1000 + m.slot, dx < 0);
        const b = sz * 0.42; drawBlock(ctx, x - b / 2 + (dx < 0 ? sz * 0.08 : -sz * 0.08), y - sz * 0.62, b, m.carry);
      } else drawMouse(ctx, x, y, sz * (m.phase === 'eat' ? 1 + Math.sin(m.wait * 40) * 0.06 : 1), colors[m.color], now / 1000 + m.slot, dx < 0);
    }
    if (hint && now - hint.t < 1800) {
      ctx.globalAlpha = Math.min(1, (1800 - (now - hint.t)) / 300);
      ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif'; const tw = ctx.measureText(hint.text).width + 28;
      ctx.fillStyle = 'rgba(43,33,24,.9)'; rr(ctx, cw / 2 - tw / 2, slotY - slotW - 18, tw, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hint.text, cw / 2, slotY - slotW - 1);
      ctx.globalAlpha = 1;
    }
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    root.querySelector('.topo-bar span').style.width = `${(1 - leftBlocks / totalBlocks) * 100}%`;
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (running && !over) step(dt, now);
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function showModal(html, buttons) {
    modal.innerHTML = `<div class="topo-card">${html}<div class="topo-btns"></div></div>`;
    const b = modal.querySelector('.topo-btns');
    buttons.forEach(([label, fn, cls]) => { const x = document.createElement('button'); x.className = 'btn block ' + (cls || ''); x.textContent = label; x.onclick = fn; b.append(x); });
    modal.hidden = false;
  }
  function win() {
    over = true;
    for (let k = 0; k < 60; k++) particles.push({ x: layout.cw / 2, y: layout.picH / 2, vx: (Math.random() - 0.5) * 600, vy: -Math.random() * 500, life: 1.4, col: colors[k % colors.length], r: 5 + Math.random() * 5 });
    onWin?.(level + 1);
    setTimeout(() => showModal(`<div class="topo-emoji">🐭🧀</div><h2>Livello ${level} finito!</h2><p class="muted">I topolini hanno mangiato tutto. Che fame!</p>`,
      [[`Livello ${level + 1} ▶`, () => load(level + 1)], ['Basta per ora', close, 'plain']]), 700);
  }
  function lose() {
    over = true;
    showModal('<div class="topo-emoji">😵🐭</div><h2>Tane bloccate!</h2><p class="muted">I 5 posti sono pieni e nessun topolino trova da mangiare. Scegli l\'ordine con più attenzione: prima i colori che stanno fuori!</p>',
      [['↻ Riprova', () => load(level)], ['Esci', close, 'plain']]);
  }
  function close() {
    cancelAnimationFrame(raf); window.removeEventListener('resize', resize); ro.disconnect();
    root.remove(); document.body.style.overflow = ''; onClose?.(level);
  }

  load(level);
  raf = requestAnimationFrame(loop);
  // primo livello: due righe di spiegazione
  if (level === 1 && !localStorage.getItem('topo-tutorial')) {
    localStorage.setItem('topo-tutorial', '1');
    showModal('<div class="topo-emoji">🐭</div><h2>Topolini Golosi</h2><p>Tocca una <b>tana</b> in basso: i topolini del suo colore escono e mangiano i blocchetti di quel colore, ma <b>solo quelli che raggiungono da fuori</b>.</p><p>Hai <b>5 posti</b>: se li riempi con tane che non possono mangiare niente, ti blocchi!</p>',
      [['Ho capito, giochiamo!', () => { modal.hidden = true; }]]);
  }
}
