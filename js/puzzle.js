// 🧩 Puzzle di Chiacchiere: pezzi con la forma classica, disegni generati (sempre diversi), le tue foto,
// puzzle del giorno uguale per tutti e sfide in chat con la classifica dei tempi.
let D;
export function initPuzzle(deps) { D = deps; }
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(Boolean));
const IMG_W = 1200, IMG_H = 900;
export const PEZZI = [12, 24, 48, 96];
const GRID = { 12: [4, 3], 24: [6, 4], 48: [8, 6], 96: [12, 8] };
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function rng(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* =============== DISEGNI =============== */
export const SCENE = {
  tramonto: '🌅 Tramonto sul mare', montagne: '🏔️ Montagne di notte', mongolfiere: '🎈 Mongolfiere', fiori: '🌼 Prato fiorito',
  acquario: '🐠 Acquario', citta: '🌃 Città di sera', faro: '🗼 Il faro', spiaggia: '🏖️ Spiaggia',
};
export function drawScene(kind, seed, w = IMG_W, h = IMG_H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), r = rng(seed), k = w / IMG_W;
  x.scale(k, k);
  const W = IMG_W, H = IMG_H, rand = (a, b) => a + r() * (b - a), pick = (arr) => arr[Math.floor(r() * arr.length)];
  const grad = (y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const circle = (cx, cy, rr, col) => { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  const hills = (y, amp, col, n = 5) => {
    x.beginPath(); x.moveTo(0, H); x.lineTo(0, y);
    const ph = r() * 6;
    for (let i = 0; i <= 60; i++) { const px = (W * i) / 60; x.lineTo(px, y - Math.sin(i / 60 * Math.PI * n / 2 + ph) * amp - Math.sin(i / 7 + ph) * amp * 0.2); }
    x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill();
  };
  const cloud = (cx, cy, s, col = 'rgba(255,255,255,.9)') => { for (const [dx, dy, rr] of [[0, 0, 40], [40, -18, 46], [86, 0, 38], [44, 14, 40]]) circle(cx + dx * s, cy + dy * s, rr * s, col); };
  const PAL = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f45', '#ff8fab', '#43c6ac'];
  const stars = (n, maxY) => { for (let i = 0; i < n; i++) circle(rand(0, W), rand(0, maxY), rand(0.8, 2.6), `rgba(255,255,255,${rand(0.4, 1)})`); };

  if (kind === 'tramonto') {
    x.fillStyle = grad(0, H * 0.62, [[0, pick(['#2b1055', '#3a1c71', '#1e3c72'])], [0.55, pick(['#d76d77', '#ee5a6f', '#f0627e'])], [1, '#ffaf7b']]); x.fillRect(0, 0, W, H);
    const sx = rand(300, 900); circle(sx, H * 0.58, 90, '#ffe29a'); circle(sx, H * 0.58, 130, 'rgba(255,226,154,.25)');
    for (let i = 0; i < 4; i++) cloud(rand(0, W), rand(80, 300), rand(0.6, 1.1), 'rgba(255,190,200,.55)');
    x.fillStyle = grad(H * 0.6, H, [[0, '#7a4e8a'], [1, '#1d2b64']]); x.fillRect(0, H * 0.6, W, H * 0.4);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,226,154,${rand(0.15, 0.6)})`; const y = H * 0.6 + rand(5, 200); x.fillRect(sx - rand(10, 160) * (1 + (y - H * 0.6) / 200), y, rand(30, 160), 3); }
    // barca a vela
    const bx = rand(150, 1000), by = H * 0.68;
    x.fillStyle = '#2a1736'; x.beginPath(); x.moveTo(bx - 70, by); x.lineTo(bx + 70, by); x.lineTo(bx + 45, by + 26); x.lineTo(bx - 45, by + 26); x.fill();
    x.beginPath(); x.moveTo(bx, by - 150); x.lineTo(bx, by - 6); x.lineTo(bx + 75, by - 10); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(bx - 4, by - 130); x.lineTo(bx - 4, by - 8); x.lineTo(bx - 60, by - 12); x.closePath(); x.fill();
    for (let i = 0; i < 5; i++) { const gx = rand(100, 1100), gy = rand(120, 380); x.strokeStyle = '#2a1736'; x.lineWidth = 4; x.beginPath(); x.moveTo(gx - 16, gy); x.quadraticCurveTo(gx - 8, gy - 10, gx, gy); x.quadraticCurveTo(gx + 8, gy - 10, gx + 16, gy); x.stroke(); }
  } else if (kind === 'montagne') {
    x.fillStyle = grad(0, H, [[0, '#0b1d3a'], [0.6, '#27466e'], [1, '#3f6b8f']]); x.fillRect(0, 0, W, H); stars(220, H * 0.55);
    circle(rand(200, 1000), rand(110, 220), 60, '#f7f3d6'); circle(0, 0, 0, '#000');
    const layers = ['#2d4a6b', '#223a57', '#182c44', '#0f1e30'];
    layers.forEach((col, i) => {
      x.beginPath(); x.moveTo(0, H); let px = 0;
      while (px <= W) { const peak = H * (0.38 + i * 0.1) + rand(-60, 60); x.lineTo(px, peak); px += rand(110, 220); x.lineTo(px, H * (0.5 + i * 0.09) + rand(-20, 30)); px += rand(60, 140); }
      x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill();
      if (i === 0) { x.fillStyle = 'rgba(255,255,255,.35)'; }
    });
    for (let i = 0; i < 40; i++) { const tx = rand(0, W), ty = rand(H * 0.8, H), s = rand(0.6, 1.4); x.fillStyle = '#08131f'; x.beginPath(); x.moveTo(tx, ty - 90 * s); x.lineTo(tx + 26 * s, ty); x.lineTo(tx - 26 * s, ty); x.fill(); }
    x.fillStyle = '#ffd57a'; for (let i = 0; i < 3; i++) x.fillRect(rand(100, 1100), rand(H * 0.83, H * 0.9), 8, 8);
  } else if (kind === 'mongolfiere') {
    x.fillStyle = grad(0, H, [[0, '#8fd3f4'], [1, '#e0f7ff']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) cloud(rand(-50, W), rand(40, 600), rand(0.7, 1.6));
    hills(H * 0.86, 30, '#8bcf7a', 3); hills(H * 0.92, 25, '#5fb35f', 4);
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const bx = rand(80, W - 80), by = rand(120, 560), s = rand(0.5, 1.25), cols = [pick(PAL), pick(PAL), pick(PAL)];
      for (let k2 = 0; k2 < 6; k2++) {
        x.beginPath(); x.ellipse(bx, by, 70 * s * (1 - k2 / 6), 85 * s, 0, 0, Math.PI * 2); x.fillStyle = cols[k2 % 3]; x.fill();
      }
      x.strokeStyle = '#6b4a2a'; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(bx - 30 * s, by + 72 * s); x.lineTo(bx - 14 * s, by + 120 * s); x.moveTo(bx + 30 * s, by + 72 * s); x.lineTo(bx + 14 * s, by + 120 * s); x.stroke();
      x.fillStyle = '#8b5a2b'; x.fillRect(bx - 16 * s, by + 118 * s, 32 * s, 24 * s);
    }
  } else if (kind === 'fiori') {
    x.fillStyle = grad(0, H * 0.5, [[0, '#7ec8f2'], [1, '#d8f1ff']]); x.fillRect(0, 0, W, H);
    circle(rand(150, 1050), 120, 70, '#fff4a3'); for (let i = 0; i < 4; i++) cloud(rand(0, W), rand(60, 260), rand(0.7, 1.2));
    hills(H * 0.5, 40, '#9fd88a', 3); hills(H * 0.62, 30, '#7cc46b', 4); hills(H * 0.76, 25, '#5daf55', 5);
    const fl = [];
    for (let i = 0; i < 260; i++) fl.push([rand(0, W), rand(H * 0.56, H), pick(PAL)]);
    fl.sort((a, b) => a[1] - b[1]);
    for (const [fx, fy, col] of fl) {
      const s = 0.4 + (fy - H * 0.56) / (H * 0.44) * 1.3;
      x.strokeStyle = '#3f8a3a'; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, fy + 18 * s); x.stroke();
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; circle(fx + Math.cos(a) * 7 * s, fy + Math.sin(a) * 7 * s, 6 * s, col); }
      circle(fx, fy, 4.5 * s, '#fff3b0');
    }
    for (let i = 0; i < 5; i++) {
      const bx = rand(100, 1100), by = rand(300, 600), col = pick(PAL);
      x.fillStyle = col; x.beginPath(); x.ellipse(bx - 12, by, 14, 20, -0.5, 0, 7); x.ellipse(bx + 12, by, 14, 20, 0.5, 0, 7); x.fill(); x.fillStyle = '#333'; x.fillRect(bx - 2, by - 14, 4, 28);
    }
  } else if (kind === 'acquario') {
    x.fillStyle = grad(0, H, [[0, '#4fc3f7'], [0.6, '#0288d1'], [1, '#01579b']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); const lx = rand(0, W); x.moveTo(lx, 0); x.lineTo(lx + 120, 0); x.lineTo(lx + rand(-200, 200) + 60, H); x.lineTo(lx + rand(-200, 200), H); x.fill(); }
    x.fillStyle = '#f1d9a7'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= 20; i++) x.lineTo(W * i / 20, H * 0.86 + Math.sin(i) * 12); x.lineTo(W, H); x.fill();
    for (let i = 0; i < 14; i++) { const sx = rand(0, W), hh = rand(120, 320); x.strokeStyle = pick(['#2e7d32', '#43a047', '#66bb6a']); x.lineWidth = rand(8, 14); x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, H * 0.9); for (let t = 1; t <= 6; t++) x.lineTo(sx + Math.sin(t + i) * 22, H * 0.9 - hh * t / 6); x.stroke(); }
    for (let i = 0; i < 6; i++) circle(rand(0, W), H * 0.88 + rand(0, 40), rand(14, 30), pick(['#bcaaa4', '#a1887f', '#d7ccc8']));
    for (let i = 0; i < 11; i++) {
      const fx = rand(80, W - 80), fy = rand(100, H * 0.75), s = rand(0.6, 1.4), dir = r() < 0.5 ? 1 : -1, col = pick(PAL), col2 = pick(PAL);
      x.save(); x.translate(fx, fy); x.scale(dir * s, s);
      x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, 50, 30, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(-40, 0); x.lineTo(-80, -28); x.lineTo(-80, 28); x.closePath(); x.fill();
      x.fillStyle = col2; x.fillRect(-12, -28, 10, 56); x.fillRect(10, -24, 8, 48);
      circle(28, -8, 8, '#fff'); circle(30, -8, 4, '#222');
      x.restore();
    }
    for (let i = 0; i < 40; i++) { const bx = rand(0, W), by = rand(0, H * 0.85), br = rand(3, 12); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.beginPath(); x.arc(bx, by, br, 0, 7); x.stroke(); }
  } else if (kind === 'citta') {
    x.fillStyle = grad(0, H, [[0, '#141e30'], [0.7, '#35577d'], [1, '#e08e6d']]); x.fillRect(0, 0, W, H); stars(160, H * 0.5);
    circle(rand(150, 1050), 140, 50, '#fdf6c8');
    for (const [base, col, wmin, wmax] of [[H * 0.55, '#2b3a55', 60, 120], [H * 0.62, '#1c2639', 70, 140]]) {
      let bx = -20;
      while (bx < W) {
        const bw = rand(wmin, wmax), bh = rand(120, 380), top = base + 260 - bh - rand(0, 160);
        x.fillStyle = col; x.fillRect(bx, top, bw, H - top);
        for (let wy = top + 14; wy < H - 20; wy += 26) for (let wx = bx + 10; wx < bx + bw - 14; wx += 20) if (r() < 0.45) { x.fillStyle = pick(['#ffe08a', '#ffd166', '#fff1b8', '#ffb3c1']); x.fillRect(wx, wy, 10, 14); }
        bx += bw + rand(2, 14);
      }
    }
    x.fillStyle = '#0d1422'; x.fillRect(0, H * 0.92, W, H * 0.08);
    for (let i = 0; i < 8; i++) { const lx = 80 + i * 150; x.fillStyle = '#556'; x.fillRect(lx, H * 0.83, 5, H * 0.1); circle(lx + 2, H * 0.83, 10, 'rgba(255,230,150,.9)'); }
  } else if (kind === 'faro') {
    const night = r() < 0.5;
    x.fillStyle = night ? grad(0, H, [[0, '#0f2027'], [1, '#2c5364']]) : grad(0, H, [[0, '#89f7fe'], [1, '#e0f7fa']]); x.fillRect(0, 0, W, H);
    if (night) stars(180, H * 0.6); else for (let i = 0; i < 5; i++) cloud(rand(0, W), rand(40, 250), rand(0.7, 1.3));
    x.fillStyle = night ? '#16324a' : '#2f86c0'; x.fillRect(0, H * 0.66, W, H * 0.34);
    for (let i = 0; i < 50; i++) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(rand(0, W), rand(H * 0.68, H), rand(20, 70), 3); }
    const fx = rand(700, 950);
    x.fillStyle = '#5d5d5d'; x.beginPath(); x.ellipse(fx, H * 0.72, 220, 60, 0, Math.PI, 0); x.fill(); x.fillRect(fx - 220, H * 0.72, 440, 40);
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#fff' : '#d62828'; x.beginPath(); const y0 = H * 0.68 - i * 50, y1 = y0 - 50, w0 = 60 - i * 3, w1 = 60 - (i + 1) * 3; x.moveTo(fx - w0, y0); x.lineTo(fx + w0, y0); x.lineTo(fx + w1, y1); x.lineTo(fx - w1, y1); x.fill(); }
    const ty = H * 0.68 - 350;
    x.fillStyle = '#333'; x.fillRect(fx - 50, ty - 10, 100, 12); x.fillStyle = '#ffe066'; x.fillRect(fx - 32, ty - 60, 64, 50); x.fillStyle = '#333'; x.beginPath(); x.moveTo(fx - 42, ty - 60); x.lineTo(fx + 42, ty - 60); x.lineTo(fx, ty - 100); x.fill();
    if (night) { x.fillStyle = 'rgba(255,230,120,.25)'; x.beginPath(); x.moveTo(fx, ty - 35); x.lineTo(0, ty - 160); x.lineTo(0, ty + 60); x.fill(); x.beginPath(); x.moveTo(fx, ty - 35); x.lineTo(W, ty - 120); x.lineTo(W, ty + 30); x.fill(); }
    for (let i = 0; i < 4; i++) { const gx = rand(80, 600), gy = rand(100, 400); x.strokeStyle = night ? '#ccd' : '#333'; x.lineWidth = 4; x.beginPath(); x.moveTo(gx - 16, gy); x.quadraticCurveTo(gx - 8, gy - 10, gx, gy); x.quadraticCurveTo(gx + 8, gy - 10, gx + 16, gy); x.stroke(); }
  } else { // spiaggia
    x.fillStyle = grad(0, H * 0.45, [[0, '#4facfe'], [1, '#b6ecff']]); x.fillRect(0, 0, W, H);
    circle(rand(150, 1050), 110, 65, '#fff59d'); for (let i = 0; i < 3; i++) cloud(rand(0, W), rand(50, 200), rand(0.7, 1.1));
    x.fillStyle = grad(H * 0.42, H * 0.6, [[0, '#0077b6'], [1, '#48cae4']]); x.fillRect(0, H * 0.42, W, H * 0.2);
    x.fillStyle = '#f6d7a7'; x.beginPath(); x.moveTo(0, H * 0.6); for (let i = 0; i <= 30; i++) x.lineTo(W * i / 30, H * 0.6 + Math.sin(i * 0.8) * 8); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= 30; i++) x.lineTo(W * i / 30, H * 0.6 + Math.sin(i * 0.8) * 8); x.stroke();
    for (let i = 0; i < 5; i++) {
      const ux = rand(80, W - 80), uy = rand(H * 0.68, H * 0.9), cols = [pick(PAL), '#fff'];
      x.strokeStyle = '#7a5230'; x.lineWidth = 5; x.beginPath(); x.moveTo(ux, uy); x.lineTo(ux, uy - 150); x.stroke();
      for (let sgm = 0; sgm < 6; sgm++) { x.fillStyle = cols[sgm % 2]; x.beginPath(); x.moveTo(ux, uy - 170); x.arc(ux, uy - 150, 95, Math.PI + sgm * Math.PI / 6, Math.PI + (sgm + 1) * Math.PI / 6); x.closePath(); x.fill(); }
      x.fillStyle = pick(PAL); x.fillRect(ux + 20, uy - 10, 90, 22);
    }
    for (let i = 0; i < 6; i++) { const sx = rand(50, 1150), sy = rand(H * 0.75, H * 0.98); x.fillStyle = pick(['#ffb4a2', '#e5989b', '#fff']); x.beginPath(); x.arc(sx, sy, 10, Math.PI, 0); x.fill(); }
    const by = rand(H * 0.48, H * 0.55), bx2 = rand(200, 1000); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(bx2, by - 70); x.lineTo(bx2, by); x.lineTo(bx2 + 50, by); x.closePath(); x.fill(); x.fillStyle = '#d62828'; x.fillRect(bx2 - 40, by, 100, 12);
  }
  return c;
}
const SCENE_KEYS = Object.keys(SCENE);
function dailyPuzzle(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const r = rng(h);
  return { kind: 'scene', scene: SCENE_KEYS[Math.floor(r() * SCENE_KEYS.length)], seed: Math.floor(r() * 1e9), n: 24 };
}
async function loadImage(spec) {
  if (spec.kind === 'scene') return drawScene(spec.scene, spec.seed);
  const url = spec.url || D.sb.storage.from('foto').getPublicUrl(spec.path).data.publicUrl;
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement('canvas'); c.width = IMG_W; c.height = IMG_H;
  const k = Math.max(IMG_W / img.width, IMG_H / img.height), w = img.width * k, h = img.height * k;
  c.getContext('2d').drawImage(img, (IMG_W - w) / 2, (IMG_H - h) / 2, w, h);
  return c;
}
async function cropPhoto(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const c = document.createElement('canvas'); c.width = IMG_W; c.height = IMG_H;
  const k = Math.max(IMG_W / img.width, IMG_H / img.height), w = img.width * k, h = img.height * k;
  c.getContext('2d').drawImage(img, (IMG_W - w) / 2, (IMG_H - h) / 2, w, h);
  URL.revokeObjectURL(img.src);
  return c;
}

/* =============== FORMA DEI PEZZI =============== */
// lato del pezzo con la "linguetta" classica: s = +1 sporge in fuori, -1 rientra, 0 bordo dritto
function edge(p, ax, ay, bx, by, nx, ny, s, depth) {
  if (!s) { p.lineTo(bx, by); return; }
  const P = (a, q) => [ax + (bx - ax) * a + nx * q * depth * s, ay + (by - ay) * a + ny * q * depth * s];
  const L = (a, q) => p.lineTo(...P(a, q));
  const C = (a1, q1, a2, q2, a3, q3) => p.bezierCurveTo(...P(a1, q1), ...P(a2, q2), ...P(a3, q3));
  L(0.35, 0);
  C(0.40, 0.02, 0.43, 0.08, 0.385, 0.15);
  C(0.33, 0.24, 0.43, 0.31, 0.50, 0.31);
  C(0.57, 0.31, 0.67, 0.24, 0.615, 0.15);
  C(0.57, 0.08, 0.60, 0.02, 0.65, 0);
  L(1, 0);
}
function piecePath(pw, ph, t, r, b, l) {
  const p = new Path2D(), d = Math.min(pw, ph);
  p.moveTo(0, 0);
  edge(p, 0, 0, pw, 0, 0, -1, t, d);
  edge(p, pw, 0, pw, ph, 1, 0, r, d);
  edge(p, pw, ph, 0, ph, 0, 1, b, d);
  edge(p, 0, ph, 0, 0, -1, 0, l, d);
  p.closePath();
  return p;
}

/* =============== MENU =============== */
export function openPuzzleMenu() {
  let n = 24, choice = null, seedBase = Math.floor(Math.random() * 1e9);
  const body = D.h('div');
  const photoIn = D.h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: async () => {
    const f = photoIn.files[0]; photoIn.value = ''; if (!f) return;
    try { const c = await cropPhoto(f); choice = { kind: 'foto', canvas: c, file: f }; draw(); } catch { D.toast('Non riesco a leggere la foto'); }
  } });
  function draw() {
    const thumbs = SCENE_KEYS.map((k, i) => {
      const seed = seedBase + i * 7919, c = drawScene(k, seed, 160, 120);
      c.className = 'pz-thumb' + (choice?.kind === 'scene' && choice.scene === k ? ' on' : '');
      c.onclick = () => { choice = { kind: 'scene', scene: k, seed }; draw(); };
      return D.h('div', { class: 'pz-th' }, c, D.h('span', {}, SCENE[k]));
    });
    if (choice?.kind === 'foto') { choice.canvas.className = 'pz-thumb on'; }
    fill(body,
      D.h('button', { class: 'card game-card', style: 'width:100%;text-align:left', onclick: () => { D.closeSheet(); openPuzzleDaily(); } },
        D.h('div', { class: 'gico' }, '📅'), D.h('div', { style: 'flex:1' }, D.h('b', {}, 'Puzzle del giorno'), D.h('div', { class: 'small muted' }, '24 pezzi, uguale per tutti: classifica nelle Sfide di oggi'))),
      D.h('h3', { style: 'margin:14px 0 6px' }, 'Oppure scegli tu l\'immagine'),
      D.h('div', { class: 'pz-grid' }, thumbs,
        D.h('div', { class: 'pz-th' }, choice?.kind === 'foto' ? choice.canvas : D.h('button', { class: 'pz-thumb pz-photo', onclick: () => photoIn.click() }, '📷'), D.h('span', {}, choice?.kind === 'foto' ? '📷 La tua foto ✓' : '📷 Una tua foto'))),
      D.h('button', { class: 'linkbtn small', onclick: () => { seedBase = Math.floor(Math.random() * 1e9); if (choice?.kind === 'scene') choice = null; draw(); } }, '🎲 Altri disegni'),
      D.h('div', { class: 'field', style: 'margin-top:10px' }, D.h('label', {}, 'Quanti pezzi?'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, PEZZI.map((k) => D.h('button', { class: 'chip' + (n === k ? ' on' : ''), onclick: () => { n = k; draw(); } }, `${k}${k === 12 ? ' 🙂' : k === 96 ? ' 🤯' : ''}`)))),
      D.h('div', { class: 'row', style: 'gap:8px;margin-top:6px' },
        D.h('button', { class: 'btn ghost', style: 'flex:1', disabled: !choice, onclick: () => { D.closeSheet(); play({ ...specOf(), n }); } }, '▶️ Gioca'),
        D.h('button', { class: 'btn', style: 'flex:1', disabled: !choice, onclick: challenge }, '⚔️ Sfida la cerchia')),
      !choice ? D.h('p', { class: 'muted small center' }, 'Tocca un\'immagine per sceglierla') : null,
      photoIn);
  }
  const specOf = () => (choice.kind === 'scene' ? { kind: 'scene', scene: choice.scene, seed: choice.seed } : { kind: 'foto', canvas: choice.canvas });
  async function challenge() {
    let puzzle;
    if (choice.kind === 'scene') puzzle = { kind: 'scene', scene: choice.scene, seed: choice.seed, n };
    else {
      const blob = await new Promise((res) => choice.canvas.toBlob(res, 'image/jpeg', 0.85));
      const path = `${D.S.me.id}/puzzle-${Date.now()}.jpg`;
      const up = await D.sb.storage.from('foto').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) return D.toast(D.errMsg(up.error));
      puzzle = { kind: 'foto', path, n };
    }
    const { data, error } = await D.sb.from('messages').insert({ circle_id: D.S.circleId, user_id: D.S.me.id, body: `🧩 Puzzle da ${n} pezzi: chi lo finisce prima?`, puzzle }).select().single();
    if (error) return D.toast(D.errMsg(error));
    D.closeSheet(); D.toast('Sfida in chat! Ora tocca a te 🧩');
    play({ ...puzzle, canvas: choice.kind === 'foto' ? choice.canvas : null, msgId: data.id });
  }
  draw();
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '🧩 Puzzle'), D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')), body));
}
export async function openPuzzleDaily() {
  const day = D.todayRome();
  const { data: done } = await D.sb.from('game_scores').select('score').eq('user_id', D.S.me.id).eq('game', 'puzzle').eq('day', day).maybeSingle();
  play({ ...dailyPuzzle(day), daily: day, already: done?.score });
}

/* =============== SCHEDA IN CHAT =============== */
const cards = new Map();
export function puzzleChatCard(m) {
  const box = D.h('div', { class: 'chess-card' });
  if (!cards.has(m.id)) cards.set(m.id, new Set());
  cards.get(m.id).add(box); fillCard(box, m);
  return box;
}
async function fillCard(box, m) {
  const pz = m.puzzle;
  const thumb = pz.kind === 'scene' ? drawScene(pz.scene, pz.seed, 120, 90) : D.h('img', { src: D.sb.storage.from('foto').getPublicUrl(pz.path).data.publicUrl, loading: 'lazy' });
  thumb.className = 'pz-card-img';
  const { data } = await D.sb.from('puzzle_results').select('user_id,secs').eq('msg_id', m.id).order('secs').limit(20);
  const res = data || [], mine = res.find((x) => x.user_id === D.S.me.id);
  fill(box, D.h('div', { class: 'cc-head' }, D.h('b', {}, '🧩 Puzzle'), D.h('span', { class: 'muted small' }, `${pz.n} pezzi`)),
    D.h('div', { class: 'pool-card-body' }, thumb,
      D.h('div', { class: 'cc-side' }, res.length ? res.slice(0, 3).map((x, i) => D.h('div', { class: 'small' }, `${['🥇', '🥈', '🥉'][i]} ${D.person(x.user_id).username} · ${fmt(x.secs)}`))
        : D.h('div', { class: 'small muted' }, 'Nessuno l\'ha ancora finito: sii il primo!'),
        res.length > 3 ? D.h('div', { class: 'small muted' }, `e altri ${res.length - 3}`) : null)),
    D.h('button', { class: 'btn small ' + (mine ? 'ghost' : ''), style: 'margin-top:8px', onclick: () => play({ ...pz, msgId: m.id, already: mine?.secs }) }, mine ? `🔁 Rigioca (il tuo: ${fmt(mine.secs)})` : '🧩 Gioca'));
}
export function refreshPuzzle(msgId) {
  const set = cards.get(msgId); if (!set) return;
  for (const el of [...set]) { if (!el.isConnected) { set.delete(el); continue; } D.sb.from('messages').select('*').eq('id', msgId).maybeSingle().then(({ data }) => data && fillCard(el, data)); }
}

/* =============== IL GIOCO =============== */
let view = null;
async function play(spec) {
  closeView();
  const root = D.h('div', { class: 'chess-root pz-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  const [cols, rows] = GRID[spec.n] || GRID[24];
  const canvas = D.h('canvas', { class: 'pz-canvas' }), ctx = canvas.getContext('2d');
  const timerEl = D.h('b', { class: 'pz-timer' }, '0:00'), countEl = D.h('span', { class: 'small muted' });
  let ghost = true;
  const ghostBtn = D.h('button', { class: 'chip on', onclick: () => { ghost = !ghost; ghostBtn.classList.toggle('on', ghost); dirty = true; } }, '👁 Aiuto');
  const bar = D.h('div', { class: 'pz-bar' }, ghostBtn, D.h('button', { class: 'chip', onclick: () => { scatter(true); } }, '🔀 Sparpaglia'),
    D.h('button', { class: 'chip', onclick: () => { edgesFirst(); } }, '🔲 Bordi'));
  fill(root, D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'),
    D.h('div', { class: 'cg-title' }, D.h('b', {}, spec.daily ? '🧩 Puzzle del giorno' : '🧩 Puzzle'), D.h('span', {}, `${spec.n} pezzi · ${spec.kind === 'scene' ? SCENE[spec.scene] : 'foto'}`)),
    D.h('div', { class: 'pz-score' }, timerEl, countEl)), bar, canvas);
  view = { root, stop: () => {} };
  let img;
  try { img = spec.canvas || await loadImage(spec); } catch { D.toast('Non riesco a caricare l\'immagine'); return closeView(); }

  // bordi: +1 linguetta in fuori per il pezzo sopra/sinistra
  const r0 = rng(spec.seed || 12345), H = [], V = [];
  for (let r = 0; r < rows; r++) { H.push([]); V.push([]); for (let c = 0; c < cols; c++) { H[r].push(r0() < 0.5 ? 1 : -1); V[r].push(r0() < 0.5 ? 1 : -1); } }
  let CW = 0, CH = 0, bx = 0, by = 0, bw = 0, bh = 0, pw = 0, ph = 0, dpr = 1;
  const pieces = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    pieces.push({ r, c, t: r === 0 ? 0 : -H[r - 1][c], b: r === rows - 1 ? 0 : H[r][c], l: c === 0 ? 0 : -V[r][c - 1], rr: c === cols - 1 ? 0 : V[r][c], x: 0, y: 0, placed: false, fx: 0, fy: 0 });
  }
  function layout() {
    dpr = window.devicePixelRatio || 1;
    const top = canvas.getBoundingClientRect().top;
    CW = Math.min(root.clientWidth - 24, 900); CH = Math.max(300, window.innerHeight - top - 6);
    canvas.width = CW * dpr; canvas.height = CH * dpr; canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px';
    const old = { bx, by, pw, ph };
    bw = Math.min(CW - 24, (CH * 0.56) / 0.75); bh = bw * 0.75; bx = (CW - bw) / 2; by = 8;
    pw = bw / cols; ph = bh / rows;
    for (const p of pieces) {
      p.path = piecePath(pw, ph, p.t, p.rr, p.b, p.l);
      p.img = renderPiece(p);
      if (p.placed) { p.x = bx + p.c * pw; p.y = by + p.r * ph; }
      else if (old.pw) { p.x = (p.x - old.bx) * (pw / old.pw) + bx; p.y = (p.y - old.by) * (ph / old.ph) + by; }
    }
    dirty = true;
  }
  function renderPiece(p) {
    const m = Math.min(pw, ph) * 0.35, c = document.createElement('canvas');
    c.width = Math.ceil((pw + 2 * m) * dpr); c.height = Math.ceil((ph + 2 * m) * dpr);
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.translate(m, m);
    x.save(); x.clip(p.path);
    x.drawImage(img, -p.c * pw, -p.r * ph, bw, bh);
    x.restore();
    x.lineWidth = 1.2; x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke(p.path);
    x.save(); x.translate(-0.8, -0.8); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.stroke(p.path); x.restore();
    c.m = m;
    return c;
  }
  function scatter(onlyLoose) {
    const trayTop = by + bh + 14, trayH = CH - trayTop - ph * 1.2;
    const r = Math.random;
    for (const p of pieces) {
      if (onlyLoose && p.placed) continue;
      p.placed = false;
      p.x = 6 + r() * Math.max(10, CW - pw - 12);
      p.y = trayH > ph * 0.5 ? trayTop + ph * 0.2 + r() * trayH : by + r() * (CH - by - ph);
    }
    if (!onlyLoose) pieces.sort(() => r() - 0.5);
    dirty = true;
  }
  function edgesFirst() {
    const loose = pieces.filter((p) => !p.placed), edges = loose.filter((p) => !p.t || !p.b || !p.l || !p.rr);
    for (const p of edges) { pieces.splice(pieces.indexOf(p), 1); pieces.push(p); }
    D.toast(`🔲 ${edges.length} pezzi di bordo portati sopra`); dirty = true;
  }
  // disegno
  let dirty = true, raf = 0, drag = null;
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(80,50,20,.12)'; ctx.beginPath(); ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 10); ctx.fill();
    ctx.fillStyle = '#f7efe3'; ctx.fillRect(bx, by, bw, bh);
    if (ghost) { ctx.globalAlpha = 0.18; ctx.drawImage(img, bx, by, bw, bh); ctx.globalAlpha = 1; }
    ctx.strokeStyle = 'rgba(120,80,40,.15)'; ctx.lineWidth = 1;
    for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(bx + c * pw, by); ctx.lineTo(bx + c * pw, by + bh); ctx.stroke(); }
    for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(bx, by + r * ph); ctx.lineTo(bx + bw, by + r * ph); ctx.stroke(); }
    for (const p of pieces) if (p.placed) ctx.drawImage(p.img, p.x - p.img.m, p.y - p.img.m, p.img.width / dpr, p.img.height / dpr);
    for (const p of pieces) if (!p.placed) {
      if (drag && drag.p === p) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
      else { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; }
      ctx.drawImage(p.img, p.x - p.img.m, p.y - p.img.m, p.img.width / dpr, p.img.height / dpr);
      ctx.restore();
    }
  }
  const loop = () => { if (dirty) { dirty = false; draw(); } raf = requestAnimationFrame(loop); };
  // tocchi
  const pt = (e) => { const rc = canvas.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    if (done) return;
    const [x, y] = pt(e);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.placed) continue;
      if (x < p.x - pw || x > p.x + 2 * pw || y < p.y - ph || y > p.y + 2 * ph) continue;
      if (ctx.isPointInPath(p.path, x - p.x, y - p.y)) {
        pieces.splice(i, 1); pieces.push(p);
        drag = { p, dx: x - p.x, dy: y - p.y }; canvas.setPointerCapture(e.pointerId); start(); dirty = true; return;
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [x, y] = pt(e);
    drag.p.x = Math.max(-pw * 0.5, Math.min(CW - pw * 0.5, x - drag.dx)); drag.p.y = Math.max(-ph * 0.3, Math.min(CH - ph * 0.5, y - drag.dy)); dirty = true;
  });
  const up = () => {
    if (!drag) return;
    const p = drag.p; drag = null;
    const tx = bx + p.c * pw, ty = by + p.r * ph, tol = Math.min(pw, ph) * 0.3;
    if (Math.abs(p.x - tx) < tol && Math.abs(p.y - ty) < tol) {
      p.x = tx; p.y = ty; p.placed = true; navigator.vibrate?.(8);
      pieces.splice(pieces.indexOf(p), 1); pieces.unshift(p);
      updateCount();
      if (pieces.every((q) => q.placed)) finish();
    }
    dirty = true;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  // tempo
  let t0 = 0, done = false, tick = 0;
  function start() { if (!t0) { t0 = Date.now(); tick = setInterval(() => { timerEl.textContent = fmt(Math.floor((Date.now() - t0) / 1000)); }, 500); } }
  function updateCount() { countEl.textContent = `${pieces.filter((p) => p.placed).length}/${pieces.length}`; }
  async function finish() {
    done = true; clearInterval(tick);
    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    timerEl.textContent = fmt(secs);
    confetti();
    let note = '';
    if (spec.daily) {
      if (spec.already == null) { await D.saveScore('puzzle', secs, { pezzi: spec.n }); note = 'Tempo salvato nelle Sfide di oggi! 🏆'; }
      else note = `Per la classifica vale il primo tentativo (${fmt(spec.already)})`;
    } else if (spec.msgId) {
      if (spec.already == null) {
        const { error } = await D.sb.from('puzzle_results').insert({ msg_id: spec.msgId, user_id: D.S.me.id, secs });
        note = error ? D.errMsg(error) : 'Tempo salvato nella sfida in chat! 🏆';
      } else note = `In classifica resta il tuo primo tempo (${fmt(spec.already)})`;
    }
    setTimeout(() => D.openSheet(D.h('div', { class: 'center' }, D.h('div', { style: 'font-size:3rem' }, '🧩'), D.h('h2', { style: 'margin:4px 0' }, 'Completato!'),
      D.h('p', {}, `${spec.n} pezzi in `, D.h('b', {}, fmt(secs))), note ? D.h('p', { class: 'muted small' }, note) : null,
      D.h('button', { class: 'btn block', onclick: () => { D.closeSheet(); } }, 'Guarda l\'immagine'),
      D.h('button', { class: 'btn ghost block', style: 'margin-top:8px', onclick: () => { D.closeSheet(); closeView(); openPuzzleMenu(); } }, '🧩 Un altro puzzle'))), 900);
  }
  function confetti() {
    const bits = Array.from({ length: 90 }, () => ({ x: bx + bw / 2, y: by + bh / 2, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 2, c: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff'][Math.floor(Math.random() * 5)] }));
    let n = 0;
    const step = () => {
      draw(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const b of bits) { b.x += b.vx; b.y += b.vy; b.vy += 0.25; ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, 6, 9); }
      if (++n < 110 && view) requestAnimationFrame(step); else dirty = true;
    };
    step();
  }
  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  view.stop = () => { cancelAnimationFrame(raf); clearInterval(tick); window.removeEventListener('resize', onResize); };
  await new Promise((r) => requestAnimationFrame(r));
  layout(); scatter(false); updateCount(); loop();
  if (spec.already != null) D.toast(spec.daily ? 'L\'hai già fatto oggi: questo giro non conta per la classifica' : 'Rigiochi: in classifica resta il primo tempo', 3500);
}
function closeView() {
  if (!view) return;
  view.stop(); view.root.remove(); view = null; document.body.style.overflow = '';
}
