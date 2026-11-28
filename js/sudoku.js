// 🔢 Sudoku di Chiacchiere: schemi generati (sempre nuovi, con una sola soluzione), 4 livelli,
// sudoku del giorno uguale per tutti e sfide in chat con la classifica dei tempi.
let D;
export function initSudoku(deps) { D = deps; }
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function rng(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const LIVELLI = { facile: { l: '🙂 Facile', clues: 40 }, medio: { l: '😎 Medio', clues: 32 }, difficile: { l: '🤓 Difficile', clues: 27 }, esperto: { l: '🧠 Esperto', clues: 23 } };
const AIUTO_SEC = 30;

/* =============== GENERATORE =============== */
const ROW = (i) => Math.floor(i / 9), COL = (i) => i % 9, BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
// conta le soluzioni (si ferma a "limit")
function countSolutions(g, limit = 2) {
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
  let count = 0;
  const grid = g.slice();
  const solve = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const used = rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)];
      let n = 0; for (let d = 1; d <= 9; d++) if (!(used & (1 << d))) n++;
      if (n === 0) return;
      if (n < bestN) { bestN = n; best = i; bestMask = used; if (n === 1) break; }
    }
    if (best < 0) { count++; return; }
    for (let d = 1; d <= 9 && count < limit; d++) {
      if (bestMask & (1 << d)) continue;
      const b = 1 << d, r = ROW(best), c = COL(best), x = BOX(best);
      grid[best] = d; rows[r] |= b; cols[c] |= b; boxes[x] |= b;
      solve();
      grid[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[x] &= ~b;
    }
  };
  solve();
  return count;
}
function fullGrid(rand) {
  const g = new Array(81).fill(0);
  const ok = (i, d) => { for (let k = 0; k < 81; k++) if (g[k] === d && (ROW(k) === ROW(i) || COL(k) === COL(i) || BOX(k) === BOX(i))) return false; return true; };
  const go = (i) => {
    if (i === 81) return true;
    const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let k = 8; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [ds[k], ds[j]] = [ds[j], ds[k]]; }
    for (const d of ds) if (ok(i, d)) { g[i] = d; if (go(i + 1)) return true; g[i] = 0; }
    return false;
  };
  go(0);
  return g;
}
export function generate(seed, level = 'medio') {
  const rand = rng(seed), sol = fullGrid(rand), puz = sol.slice();
  const target = LIVELLI[level]?.clues || 32;
  const order = [...Array(81).keys()];
  for (let k = 80; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  let clues = 81;
  for (const i of order) {
    if (clues <= target) break;
    const v = puz[i]; puz[i] = 0;
    if (countSolutions(puz) !== 1) puz[i] = v; else clues--;
  }
  return { puz, sol };
}
const dayHash = (day) => { let h = 7; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };

/* =============== MENU =============== */
export function openSudokuMenu() {
  let level = 'medio';
  const lv = D.h('div', { class: 'row wrap', style: 'gap:6px;margin:8px 0' });
  const drawLv = () => fill(lv, Object.entries(LIVELLI).map(([k, v]) => D.h('button', { class: 'chip' + (level === k ? ' on' : ''), onclick: () => { level = k; drawLv(); } }, v.l)));
  drawLv();
  const saved = loadSave('libero');
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '🔢 Sudoku'), D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')),
    D.h('button', { class: 'card game-card', style: 'width:100%;text-align:left;margin-top:12px', onclick: () => { D.closeSheet(); openSudokuDaily(); } },
      D.h('div', { class: 'gico' }, '📅'), D.h('div', { style: 'flex:1' }, D.h('b', {}, 'Sudoku del giorno'), D.h('div', { class: 'small muted' }, 'Livello medio, uguale per tutti: classifica nelle Sfide di oggi'))),
    saved ? D.h('button', { class: 'btn ghost block', onclick: () => { D.closeSheet(); play(saved.spec, saved); } }, `▶️ Riprendi la partita (${LIVELLI[saved.spec.level]?.l || ''})`) : null,
    D.h('div', { class: 'card' }, D.h('b', {}, 'Nuovo schema'), lv,
      D.h('div', { class: 'row', style: 'gap:8px' },
        D.h('button', { class: 'btn ghost', style: 'flex:1', onclick: () => { D.closeSheet(); play({ seed: Math.floor(Math.random() * 2e9), level, key: 'libero' }); } }, '▶️ Gioca'),
        D.h('button', { class: 'btn', style: 'flex:1', onclick: () => challenge(level) }, '⚔️ Sfida la cerchia'))),
    D.h('p', { class: 'muted small center' }, 'Ogni schema è generato al momento e ha una sola soluzione.')));
}
async function challenge(level) {
  const sudoku = { seed: Math.floor(Math.random() * 2e9), level };
  const { data, error } = await D.sb.from('messages').insert({ circle_id: D.S.circleId, user_id: D.S.me.id, body: `🔢 Sudoku ${LIVELLI[level].l.split(' ')[1].toLowerCase()}: chi lo risolve prima?`, sudoku }).select().single();
  if (error) return D.toast(D.errMsg(error));
  D.closeSheet(); D.toast('Sfida in chat! Ora tocca a te 🔢');
  play({ ...sudoku, msgId: data.id, key: 'sfida-' + data.id });
}
export async function openSudokuDaily() {
  const day = D.todayRome();
  const { data: done } = await D.sb.from('game_scores').select('score').eq('user_id', D.S.me.id).eq('game', 'sudoku').eq('day', day).maybeSingle();
  const key = 'giorno-' + day;
  play({ seed: dayHash(day), level: 'medio', daily: day, already: done?.score, key }, loadSave(key));
}

/* =============== SCHEDA IN CHAT =============== */
const cards = new Map();
export function sudokuChatCard(m) {
  const box = D.h('div', { class: 'chess-card' });
  if (!cards.has(m.id)) cards.set(m.id, new Set());
  cards.get(m.id).add(box); fillCard(box, m);
  return box;
}
async function fillCard(box, m) {
  const sz = m.sudoku;
  const { data } = await D.sb.from('puzzle_results').select('user_id,secs').eq('msg_id', m.id).order('secs').limit(20);
  const res = data || [], mine = res.find((x) => x.user_id === D.S.me.id);
  const { puz } = generate(sz.seed, sz.level);
  const mini = D.h('div', { class: 'sd-mini' }, puz.map((v, i) => D.h('span', { class: (Math.floor(COL(i) / 3) + Math.floor(ROW(i) / 3)) % 2 ? 'alt' : '' }, v || '')));
  fill(box, D.h('div', { class: 'cc-head' }, D.h('b', {}, '🔢 Sudoku'), D.h('span', { class: 'muted small' }, LIVELLI[sz.level]?.l)),
    D.h('div', { class: 'pool-card-body' }, mini,
      D.h('div', { class: 'cc-side' }, res.length ? res.slice(0, 3).map((x, i) => D.h('div', { class: 'small' }, `${['🥇', '🥈', '🥉'][i]} ${D.person(x.user_id).username} · ${fmt(x.secs)}`))
        : D.h('div', { class: 'small muted' }, 'Nessuno l\'ha ancora risolto: sii il primo!'),
        res.length > 3 ? D.h('div', { class: 'small muted' }, `e altri ${res.length - 3}`) : null)),
    D.h('button', { class: 'btn small ' + (mine ? 'ghost' : ''), style: 'margin-top:8px', onclick: () => { const key = 'sfida-' + m.id; play({ ...sz, msgId: m.id, already: mine?.secs, key }, loadSave(key)); } },
      mine ? `🔁 Rigioca (il tuo: ${fmt(mine.secs)})` : '🔢 Gioca'));
}
export function refreshSudoku(msgId) {
  const set = cards.get(msgId); if (!set) return;
  for (const el of [...set]) { if (!el.isConnected) { set.delete(el); continue; } D.sb.from('messages').select('*').eq('id', msgId).maybeSingle().then(({ data }) => data && fillCard(el, data)); }
}

/* =============== SALVATAGGI =============== */
function loadSave(key) { try { const s = JSON.parse(localStorage.getItem('sudoku-' + key)); return s && !s.done ? s : null; } catch { return null; } }
function writeSave(key, data) { try { localStorage.setItem('sudoku-' + key, JSON.stringify(data)); } catch {} }

/* =============== IL GIOCO =============== */
let view = null;
function play(spec, saved = null) {
  closeView();
  const root = D.h('div', { class: 'chess-root sd-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  const { puz, sol } = generate(spec.seed, spec.level);
  let val = saved?.val || puz.slice();                    // numeri inseriti
  let notes = (saved?.notes || new Array(81).fill(0)).slice(); // note a bit
  let sel = val.findIndex((v) => !v), noteMode = false, showErr = spec.level === 'facile' || spec.level === 'medio';
  let elapsed = saved?.elapsed || 0, penalty = saved?.penalty || 0, hints = saved?.hints || 0, done = false;
  const undo = [];
  const timerEl = D.h('b', { class: 'pz-timer' }, fmt(elapsed));
  const grid = D.h('div', { class: 'sd-grid' }), pad = D.h('div', { class: 'sd-pad' }), tools = D.h('div', { class: 'sd-tools' }), info = D.h('div', { class: 'sd-info' });
  fill(root, D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'),
    D.h('div', { class: 'cg-title' }, D.h('b', {}, spec.daily ? '🔢 Sudoku del giorno' : '🔢 Sudoku'), D.h('span', {}, LIVELLI[spec.level]?.l)),
    D.h('div', { class: 'pz-score' }, timerEl)),
    D.h('div', { class: 'sd-main' }, info, grid, tools, pad));
  const cells = puz.map((v, i) => {
    const c = D.h('button', { class: 'sd-cell', onclick: () => { sel = i; draw(); } });
    if (COL(i) % 3 === 2 && COL(i) < 8) c.classList.add('br');
    if (ROW(i) % 3 === 2 && ROW(i) < 8) c.classList.add('bb');
    return c;
  });
  fill(grid, cells);
  const save = () => writeSave(spec.key, { spec, val, notes, elapsed, penalty, hints, done });

  function put(d) {
    if (done || sel < 0 || puz[sel]) return;
    undo.push([sel, val[sel], notes[sel]]);
    if (noteMode && d) { if (!val[sel]) notes[sel] ^= 1 << d; }
    else {
      val[sel] = val[sel] === d ? 0 : d; notes[sel] = 0;
      if (d && val[sel] === d) { // togli la nota dai vicini
        for (let k = 0; k < 81; k++) if (ROW(k) === ROW(sel) || COL(k) === COL(sel) || BOX(k) === BOX(sel)) notes[k] &= ~(1 << d);
        if (showErr && d !== sol[sel]) navigator.vibrate?.([30, 40, 30]);
      }
    }
    save(); draw(); check();
  }
  function hint() {
    if (done) return;
    let i = sel >= 0 && !puz[sel] && val[sel] !== sol[sel] ? sel : val.findIndex((v, k) => !puz[k] && v !== sol[k]);
    if (i < 0) return;
    undo.push([i, val[i], notes[i]]);
    val[i] = sol[i]; notes[i] = 0; hints++; penalty += AIUTO_SEC; sel = i;
    D.toast(`💡 Aiuto: +${AIUTO_SEC} secondi`); save(); draw(); check();
  }
  function check() {
    if (val.some((v, i) => v !== sol[i])) return;
    done = true; clearInterval(tick); save();
    finish();
  }
  function draw() {
    const sv = sel >= 0 ? val[sel] : 0;
    cells.forEach((c, i) => {
      const v = val[i], given = !!puz[i];
      const same = sel >= 0 && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel));
      c.className = 'sd-cell' + (COL(i) % 3 === 2 && COL(i) < 8 ? ' br' : '') + (ROW(i) % 3 === 2 && ROW(i) < 8 ? ' bb' : '') +
        (given ? ' given' : '') + (i === sel ? ' sel' : same ? ' peer' : '') + (sv && v === sv ? ' same' : '') +
        (showErr && v && !given && v !== sol[i] ? ' err' : '');
      if (v) c.textContent = v;
      else if (notes[i]) fill(c, D.h('div', { class: 'sd-notes' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => D.h('i', {}, notes[i] & (1 << d) ? d : ''))));
      else c.textContent = '';
    });
    const left = (d) => 9 - val.filter((v, i) => v === d && (!showErr || v === sol[i] || puz[i])).length;
    fill(pad, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => D.h('button', { class: 'sd-num' + (left(d) <= 0 ? ' gone' : ''), onclick: () => put(d) }, d, D.h('small', {}, left(d) > 0 ? left(d) : '✓'))));
    fill(tools,
      D.h('button', { class: 'sd-tool', onclick: () => { const u = undo.pop(); if (!u) return; [sel, val[u[0]], notes[u[0]]] = [u[0], u[1], u[2]]; save(); draw(); } }, '↶', D.h('span', {}, 'Annulla')),
      D.h('button', { class: 'sd-tool', onclick: () => { if (sel >= 0 && !puz[sel]) { undo.push([sel, val[sel], notes[sel]]); val[sel] = 0; notes[sel] = 0; save(); draw(); } } }, '⌫', D.h('span', {}, 'Cancella')),
      D.h('button', { class: 'sd-tool' + (noteMode ? ' on' : ''), onclick: () => { noteMode = !noteMode; draw(); } }, '✏️', D.h('span', {}, noteMode ? 'Note ON' : 'Note')),
      D.h('button', { class: 'sd-tool', onclick: hint }, '💡', D.h('span', {}, 'Aiuto')),
      D.h('button', { class: 'sd-tool' + (showErr ? ' on' : ''), onclick: () => { showErr = !showErr; draw(); } }, '🚨', D.h('span', {}, showErr ? 'Errori sì' : 'Errori no')));
    const errs = val.filter((v, i) => v && !puz[i] && v !== sol[i]).length;
    info.textContent = done ? '🎉 Risolto!' : `${val.filter(Boolean).length}/81${hints ? ` · 💡 ${hints}` : ''}${showErr && errs ? ` · ❌ ${errs}` : ''}${penalty ? ` · +${penalty}s` : ''}`;
  }
  // tastiera fisica (tablet/computer)
  const onKey = (e) => {
    if (e.key >= '1' && e.key <= '9') put(+e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { if (sel >= 0 && !puz[sel]) { val[sel] = 0; notes[sel] = 0; save(); draw(); } }
    else if (e.key.startsWith('Arrow')) { const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key]; sel = Math.max(0, Math.min(80, (sel < 0 ? 0 : sel) + d)); draw(); }
    else if (e.key === 'n') { noteMode = !noteMode; draw(); }
  };
  document.addEventListener('keydown', onKey);
  let last = Date.now();
  const tick = setInterval(() => {
    if (done || document.visibilityState !== 'visible') { last = Date.now(); return; }
    elapsed += (Date.now() - last) / 1000; last = Date.now();
    timerEl.textContent = fmt(Math.floor(elapsed + penalty));
    if (Math.floor(elapsed) % 5 === 0) save();
  }, 500);
  async function finish() {
    const secs = Math.max(1, Math.round(elapsed + penalty));
    timerEl.textContent = fmt(secs); draw();
    root.querySelector('.sd-grid').classList.add('win');
    let note = '';
    if (spec.daily) {
      if (spec.already == null) { await D.saveScore('sudoku', secs, { aiuti: hints }); note = 'Tempo salvato nelle Sfide di oggi! 🏆'; }
      else note = `Per la classifica vale il primo tentativo (${fmt(spec.already)})`;
    } else if (spec.msgId) {
      if (spec.already == null) { const { error } = await D.sb.from('puzzle_results').insert({ msg_id: spec.msgId, user_id: D.S.me.id, secs }); note = error ? D.errMsg(error) : 'Tempo salvato nella sfida in chat! 🏆'; }
      else note = `In classifica resta il tuo primo tempo (${fmt(spec.already)})`;
    }
    setTimeout(() => D.openSheet(D.h('div', { class: 'center' }, D.h('div', { style: 'font-size:3rem' }, '🎉'), D.h('h2', { style: 'margin:4px 0' }, 'Sudoku risolto!'),
      D.h('p', {}, `${LIVELLI[spec.level]?.l} in `, D.h('b', {}, fmt(secs)), hints ? ` (con ${hints} aiuti)` : ''), note ? D.h('p', { class: 'muted small' }, note) : null,
      D.h('button', { class: 'btn block', onclick: () => { D.closeSheet(); closeView(); openSudokuMenu(); } }, '🔢 Un altro sudoku'),
      D.h('button', { class: 'btn plain block', style: 'margin-top:6px', onclick: D.closeSheet }, 'Chiudi'))), 700);
  }
  view = { root, stop: () => { clearInterval(tick); document.removeEventListener('keydown', onKey); if (!done) save(); } };
  draw();
  if (spec.already != null && !saved) D.toast(spec.daily ? 'L\'hai già fatto oggi: questo giro non conta per la classifica' : 'Rigiochi: in classifica resta il primo tempo', 3500);
  if (done) check();
}
function closeView() {
  if (!view) return;
  view.stop(); view.root.remove(); view = null; document.body.style.overflow = '';
}
