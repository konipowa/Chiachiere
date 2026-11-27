// 🐭 Topolini Golosi — i topolini escono dalle tane e si mangiano il disegno, un blocchetto alla volta.
// Regole: tocchi la tana in cima a una colonna, va in uno dei 5 posti e i topolini del suo colore
// escono a mangiare solo i blocchetti raggiungibili dall'esterno. Se riempi i 5 posti senza poter mangiare, hai perso.

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
const RANDOM_PALS = [
  [C.rosso, C.rosa, C.bianco, C.giallo, C.arancio, C.viola],
  [C.blu, C.azzurro, C.menta, C.bianco, C.viola, C.rosa],
  [C.verdeScuro, C.verde, C.giallo, C.arancio, C.marrone, C.crema],
  [C.viola, C.rosa, C.azzurro, C.crema, C.rosso, C.menta],
];

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function designFor(level) {
  if (level <= DESIGNS.length) {
    const d = DESIGNS[level - 1];
    const colors = [...new Set(d.map.join('').replace(/\./g, ''))];
    const grid = d.map.map((row) => [...row].map((ch) => (ch === '.' ? -1 : colors.indexOf(ch))));
    return { name: d.name, grid, colors: colors.map((ch) => d.pal[ch]) };
  }
  // livelli generati: forme simmetriche a strati, sempre più grandi e con più colori
  const r = rng(level * 7919);
  const size = Math.min(16, 10 + Math.floor((level - DESIGNS.length) / 5));
  const nCol = Math.min(6, 3 + Math.floor((level - DESIGNS.length) / 8));
  const pal = RANDOM_PALS[level % RANDOM_PALS.length].slice(0, nCol);
  const half = Math.ceil(size / 2), cx = (size - 1) / 2, cy = (size - 1) / 2;
  const wobble = Array.from({ length: 8 }, () => 0.75 + r() * 0.35);
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));
  for (let y = 0; y < size; y++) for (let x = 0; x < half; x++) {
    const dx = (x - cx) / (size / 2), dy = (y - cy) / (size / 2);
    const ang = Math.atan2(dy, Math.abs(dx));
    const k = wobble[Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 8) % 8];
    const d = Math.hypot(dx, dy) / k;
    if (d > 1) continue;
    let layer = Math.min(nCol - 1, Math.floor((1 - d) * nCol * 0.999));
    if (r() < 0.12) layer = Math.max(0, layer - 1);
    grid[y][x] = layer; grid[y][size - 1 - x] = layer;
  }
  return { name: `Disegno ${level}`, grid, colors: pal };
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

function makeTanks(grid, nColors, level, r) {
  const counts = Array(nColors).fill(0);
  grid.forEach((row) => row.forEach((c) => c >= 0 && counts[c]++));
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

// controllo che il livello sia risolvibile (giocatore "ragionevole")
function solvable(grid0, lanes0, slots) {
  const grid = grid0.map((r) => r.slice()), W = grid[0].length;
  const lanes = lanes0.map((l) => l.map((t) => ({ ...t })));
  const active = [];
  let left = grid.flat().filter((c) => c >= 0).length;
  for (let guard = 0; guard < 2000; guard++) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const t of active) {
        if (!t.count) continue;
        const exp = exposedSet(grid);
        for (const i of exp) { const y = Math.floor(i / W), x = i % W; if (grid[y][x] === t.color) { grid[y][x] = -1; t.count--; left--; moved = true; break; } }
      }
      for (let i = active.length - 1; i >= 0; i--) if (!active[i].count) active.splice(i, 1);
    }
    if (!left) return true;
    if (active.length >= slots) return false;
    const exp = exposedSet(grid);
    const expColors = new Set([...exp].map((i) => grid[Math.floor(i / W)][i % W]));
    let pick = lanes.findIndex((l) => l.length && expColors.has(l[0].color));
    if (pick < 0) pick = lanes.findIndex((l) => l.length);
    if (pick < 0) return false;
    active.push(lanes[pick].shift());
  }
  return false;
}

function buildLevel(level) {
  const d = designFor(level);
  const nLanes = 3;
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = rng(level * 1000 + attempt);
    const tanks = makeTanks(d.grid, d.colors.length, level, r);
    for (let i = tanks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tanks[i], tanks[j]] = [tanks[j], tanks[i]]; }
    const lanes = Array.from({ length: nLanes }, () => []);
    tanks.forEach((t, i) => lanes[i % nLanes].push(t));
    if (solvable(d.grid, lanes, SLOTS)) return { ...d, lanes };
  }
  // ripiego: ordina dall'esterno verso l'interno (sempre risolvibile)
  const r = rng(level);
  const tanks = makeTanks(d.grid, d.colors.length, level, r);
  const lanes = Array.from({ length: nLanes }, () => []);
  tanks.forEach((t, i) => lanes[i % nLanes].push(t));
  return { ...d, lanes };
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
    <canvas></canvas>
    <div class="topo-modal" hidden></div>`;
  document.body.append(root); document.body.style.overflow = 'hidden';
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const modal = root.querySelector('.topo-modal');
  root.querySelector('.topo-x').onclick = close;
  root.querySelector('.topo-restart').onclick = () => load(level);

  let G, W, H, colors, lanes, slots, mice, particles, eating, exposed, totalBlocks, leftBlocks, cell, ox, oy, layout, running, over, stuckTimer, raf, last;

  function load(lv) {
    level = lv; modal.hidden = true; over = false; stuckTimer = 0;
    const L = buildLevel(lv);
    G = L.grid.map((r) => r.slice()); H = G.length; W = G[0].length; colors = L.colors;
    lanes = L.lanes.map((l) => l.map((t) => ({ ...t, left: t.count })));
    slots = Array(SLOTS).fill(null); mice = []; particles = []; eating = new Map();
    exposed = exposedSet(G);
    totalBlocks = leftBlocks = G.flat().filter((c) => c >= 0).length;
    root.querySelector('.topo-lvl').textContent = `Livello ${lv}`;
    root.querySelector('.topo-name').textContent = L.name;
    resize(); running = true;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = rect.width, ch = rect.height;
    const picH = ch * 0.5;
    cell = Math.min((cw - 28) / W, (picH - 20) / H);
    ox = (cw - cell * W) / 2; oy = 10 + (picH - 10 - cell * H) / 2;
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
        const free = slots.findIndex((s) => !s);
        if (free < 0) { buzz(); return; }
        const t = lane.shift();
        slots[free] = { ...t, from: { x: cx, y: cy }, born: performance.now(), cool: 0, inFlight: 0 };
        navigator.vibrate?.(8);
      }
    });
  }
  let buzzT = 0; const buzz = () => { buzzT = performance.now(); navigator.vibrate?.([20, 40, 20]); };
  canvas.addEventListener('pointerdown', tap);
  window.addEventListener('resize', resize);
  const ro = new ResizeObserver(() => G && resize()); ro.observe(canvas);
  window.__topo = { laneX: (i) => laneX(i), laneY: (k) => laneY(k), rect: () => canvas.getBoundingClientRect() };

  function pickTarget(color, sx) {
    let best = -1, bestScore = -1e9;
    for (const i of exposed) {
      if (eating.has(i)) continue;
      const y = Math.floor(i / W), x = i % W;
      if (G[y][x] !== color) continue;
      const score = y * 3 - Math.abs(ox + (x + 0.5) * cell - sx) / cell;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  function step(dt, now) {
    // ogni tana manda fuori i suoi topolini
    slots.forEach((s, si) => {
      if (!s) return;
      s.cool -= dt;
      if (s.left > 0 && s.cool <= 0 && now - s.born > 250) {
        const sx = slotX(si), sy = layout.slotY;
        const target = pickTarget(s.color, sx);
        if (target >= 0) {
          eating.set(target, true);
          const tx = ox + ((target % W) + 0.5) * cell, ty = oy + (Math.floor(target / W) + 0.5) * cell;
          const dist = Math.hypot(tx - sx, ty - sy);
          mice.push({ slot: si, color: s.color, target, x0: sx, y0: sy, x1: tx, y1: ty, t: 0, dur: Math.min(0.8, Math.max(0.3, dist / 650)), phase: 'go' });
          s.left--; s.inFlight++; s.cool = 0.085;
        }
      }
    });
    // topolini in viaggio
    for (const m of mice) {
      m.t += dt;
      if (m.phase === 'go' && m.t >= m.dur) {
        m.phase = 'eat'; m.t = 0;
        const y = Math.floor(m.target / W), x = m.target % W;
        const col = colors[G[y][x]];
        G[y][x] = -1; eating.delete(m.target); leftBlocks--;
        exposed = exposedSet(G);
        for (let k = 0; k < 6; k++) particles.push({ x: m.x1, y: m.y1, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160 - 40, life: 0.6, col, r: cell * (0.08 + Math.random() * 0.08) });
      } else if (m.phase === 'eat' && m.t >= 0.18) {
        m.phase = 'done';
        const s = slots[m.slot]; if (s) s.inFlight--;
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
    lanes.forEach((lane, li) => {
      for (let k = Math.min(lane.length, 3) - 1; k >= 0; k--) {
        const t = lane[k];
        drawTank(ctx, laneX(li), laneY(k), tankW * (k ? 0.82 : 1), colors[t.color], t.count, { alpha: k ? 0.55 : 1, glow: !k && slots.some((s) => !s) });
      }
      if (lane.length > 3) { ctx.fillStyle = '#9c7f70'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`+${lane.length - 3}`, laneX(li), laneY(2) + tankW * 0.6); }
    });
    // topolini
    for (const m of mice) {
      if (m.phase === 'go') {
        const k = m.t / m.dur, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const x = m.x0 + (m.x1 - m.x0) * e, y = m.y0 + (m.y1 - m.y0) * e - Math.sin(k * Math.PI) * 20;
        drawMouse(ctx, x, y, Math.max(16, cell * 0.9), colors[m.color], now / 1000, m.x1 < m.x0);
      } else drawMouse(ctx, m.x1, m.y1, Math.max(16, cell * 0.9) * (1 - m.t * 3), colors[m.color], now / 1000);
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
