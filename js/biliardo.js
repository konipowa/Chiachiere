// 🎱 Biliardo palla 8 di Chiacchiere: allenamento, contro il computer, sfide nella cerchia (anche a squadre).
import * as P from './biliardo-fisica.js?v=33';

let D;
export function initBiliardo(deps) { D = deps; }
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(Boolean));
const names = (ids) => ids.map((id) => D.person(id).username).join(' + ');
export const TEMPI_TIRO = [{ s: 30, l: '⚡ 30 s' }, { s: 60, l: '🕐 1 min' }, { s: 90, l: '🐢 90 s' }, { s: 0, l: '✉️ Senza tempo' }];
const GRP = { piene: '🟡 piene', rigate: '🎗️ rigate' };
const FINE = { nera: 'nera in buca', abbandono: 'abbandono', rifiutata: 'sfida rifiutata', annullata: 'sfida annullata' };

function currentPlayer(g) {
  const t = g.state.turn, team = t === 1 ? g.team1 : g.team2;
  return team[(g.state.v?.[t - 1] || 0) % team.length];
}
const teamOf = (g, uid) => (g.team1.includes(uid) ? 1 : g.team2.includes(uid) ? 2 : null);
function statusText(g, me) {
  if (g.status === 'invito') return `In attesa di ${names([...g.team1, ...g.team2].filter((u) => !g.accepted.includes(u)))}`;
  if (g.status === 'rifiutata') return g.reason === 'annullata' ? 'Sfida annullata' : 'Sfida rifiutata';
  if (g.status === 'finita') return `🏆 Vince ${names(g.result === 1 ? g.team1 : g.team2)} · ${FINE[g.reason] || g.reason}`;
  const cp = currentPlayer(g);
  return cp === me ? '👉 Tocca a te!' : `Tocca a ${D.person(cp).username}`;
}

/* ---------------- disegno ---------------- */
function drawBall(ctx, id, x, y, r) {
  const col = P.colorOf(id);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = P.isStripe(id) ? '#fbfbf4' : col; ctx.fill();
  if (P.isStripe(id)) { ctx.save(); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 1.1); ctx.restore(); }
  if (id !== 0) {
    ctx.beginPath(); ctx.arc(x, y, r * 0.48, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = `800 ${Math.max(6, r * 0.68)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(id), x, y + r * 0.04);
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
// tavolino piccolo orizzontale per la scheda in chat
function miniTable(state, w = 150) {
  const c = document.createElement('canvas'), h = w / 2 + 12, k = (w - 12) / P.W, dpr = window.devicePixelRatio || 1;
  c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px'; c.className = 'pool-mini';
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#6b3d1f'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 6); ctx.fill();
  ctx.fillStyle = '#1d7f4c'; ctx.fillRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#111'; for (const [px, py] of P.POCKETS) { ctx.beginPath(); ctx.arc(6 + Math.max(0, Math.min(P.W, px)) * k, 6 + Math.max(0, Math.min(P.H, py)) * k, 3.2, 0, 7); ctx.fill(); }
  for (const [id, x, y] of state.balls) drawBall(ctx, id, 6 + x * k, 6 + y * k, Math.max(2.4, P.R * k));
  return c;
}

/* ---------------- scheda in chat ---------------- */
const cards = new Map();
export function poolChatCard(id) {
  const box = D.h('div', { class: 'chess-card' }, D.h('p', { class: 'muted small' }, '🎱 Carico la partita…'));
  if (!cards.has(id)) cards.set(id, new Set());
  cards.get(id).add(box); fillCard(box, id);
  return box;
}
async function fillCard(box, id) {
  const [{ data: g }, { data: ch }] = await Promise.all([D.sb.from('pool_games').select('*').eq('id', id).maybeSingle(), D.sb.from('pool_cheers').select('target').eq('game_id', id)]);
  if (!g) return fill(box, D.h('p', { class: 'muted small' }, '🎱 Partita non più disponibile'));
  const me = D.S.me.id, mine = teamOf(g, me), must = g.status === 'invito' && mine && !g.accepted.includes(me);
  const t1 = (ch || []).filter((c) => c.target === '1').length, t2 = (ch || []).filter((c) => c.target === '2').length;
  fill(box,
    D.h('div', { class: 'cc-head' }, D.h('b', {}, '🎱 Biliardo · palla 8'), D.h('span', { class: 'muted small' }, g.turn_secs ? `${g.turn_secs}s a tiro` : 'senza tempo')),
    D.h('div', { class: 'pool-card-body' }, miniTable(g.state),
      D.h('div', { class: 'cc-side' },
        D.h('div', { class: 'cc-team' }, '① ', names(g.team1), g.state.groups?.[1] ? ` · ${GRP[g.state.groups[1]]}` : ''),
        D.h('div', { class: 'cc-team' }, '② ', names(g.team2), g.state.groups?.[2] ? ` · ${GRP[g.state.groups[2]]}` : ''),
        D.h('div', { class: 'cc-status' + (g.status === 'in_corso' && currentPlayer(g) === me ? ' me' : '') }, statusText(g, me)),
        t1 + t2 ? D.h('div', { class: 'small' }, `📣 ①${t1} · ②${t2}`) : null)),
    D.h('div', { class: 'row wrap', style: 'margin-top:8px;gap:6px' },
      must ? D.h('button', { class: 'btn small', onclick: async () => { const { error } = await D.sb.rpc('pool_respond', { p_game: id, p_accept: true }); if (error) return D.toast(D.errMsg(error)); openPoolGame({ mode: 'online', id }); } }, '✅ Accetto') : null,
      must ? D.h('button', { class: 'btn small plain', onclick: async () => { await D.sb.rpc('pool_respond', { p_game: id, p_accept: false }); refreshPool(id); } }, 'Rifiuto') : null,
      g.status !== 'rifiutata' ? D.h('button', { class: 'btn small ghost', onclick: () => openPoolGame({ mode: 'online', id }) },
        g.status === 'in_corso' && currentPlayer(g) === me ? '👉 Tira' : g.status === 'finita' ? 'Rivedi' : mine ? 'Apri' : '👀 Guarda e fai il tifo') : null));
}
export function refreshPool(id) {
  const set = cards.get(id);
  if (set) for (const el of [...set]) { if (!el.isConnected) set.delete(el); else fillCard(el, id); }
  if (view && view.id === id) view.remote();
}

/* ---------------- menu e nuova sfida ---------------- */
export async function openPoolLobby() {
  const box = D.h('div', {}, D.h('p', { class: 'muted center' }, 'Carico…'));
  let level = 'medio';
  const lv = D.h('div', { class: 'row wrap', style: 'gap:6px;margin:8px 0' });
  const drawLv = () => fill(lv, [['facile', '🙂 Facile'], ['medio', '😎 Medio'], ['difficile', '🤓 Difficile']].map(([k, l]) => D.h('button', { class: 'chip' + (level === k ? ' on' : ''), onclick: () => { level = k; drawLv(); } }, l)));
  drawLv();
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '🎱 Biliardo'), D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')),
    D.h('div', { class: 'card', style: 'margin-top:12px' }, D.h('b', {}, '🤖 Contro il computer'), lv,
      D.h('button', { class: 'btn block', onclick: () => { D.closeSheet(); openPoolGame({ mode: 'cpu', level }); } }, 'Gioca')),
    D.h('div', { class: 'row', style: 'gap:8px' },
      D.h('button', { class: 'btn ghost', style: 'flex:1', onclick: () => { D.closeSheet(); openPoolGame({ mode: 'pratica' }); } }, '🎯 Allenamento'),
      D.h('button', { class: 'btn', style: 'flex:1', onclick: newPoolChallenge }, '⚔️ Sfida')),
    box));
  const { data } = await D.sb.from('pool_games').select('*').eq('circle_id', D.S.circleId).neq('status', 'rifiutata').order('created_at', { ascending: false }).limit(20);
  const me = D.S.me.id, games = data || [];
  const row = (g) => D.h('button', { class: 'cg-row', onclick: () => { D.closeSheet(); openPoolGame({ mode: 'online', id: g.id }); } },
    D.h('div', { style: 'flex:1;text-align:left' }, D.h('b', {}, `${names(g.team1)}  vs  ${names(g.team2)}`),
      D.h('div', { class: 'small ' + (g.status === 'in_corso' && currentPlayer(g) === me ? 'turn' : 'muted') }, statusText(g, me))), '›');
  const live = games.filter((g) => g.status !== 'finita'), done = games.filter((g) => g.status === 'finita').slice(0, 6);
  fill(box, live.length ? [D.h('h3', { style: 'margin-top:16px' }, 'Partite aperte'), D.h('div', { class: 'stack' }, live.map(row))] : null,
    done.length ? [D.h('h3', { style: 'margin-top:16px' }, 'Finite di recente'), D.h('div', { class: 'stack' }, done.map(row))] : null);
}
export function newPoolChallenge() {
  const me = D.S.me.id, others = [...D.S.members.values()].filter((p) => p.id !== me);
  if (!others.length) return D.toast('Nella cerchia non c\'è ancora nessuno da sfidare: invita qualcuno! 📤', 3500);
  let mode = '1v1', opp = null, secs = 60;
  const teams = { 1: [me], 2: [] };
  const body = D.h('div'), err = D.h('div', { class: 'error' });
  const chip = (l, on, f) => D.h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: f }, l);
  function draw() {
    fill(body,
      D.h('div', { class: 'seg', style: 'margin-bottom:12px' },
        D.h('button', { class: mode === '1v1' ? 'on' : '', onclick: () => { mode = '1v1'; draw(); } }, '👤 1 contro 1'),
        D.h('button', { class: mode === 'team' ? 'on' : '', onclick: () => { mode = 'team'; draw(); } }, '👥 A squadre')),
      mode === '1v1' ? D.h('div', { class: 'field' }, D.h('label', {}, 'Chi sfidi?'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, others.map((p) => chip(`${p.avatar} ${p.username}`, opp === p.id, () => { opp = p.id; draw(); }))))
        : D.h('div', { class: 'field' }, D.h('label', {}, 'Forma le squadre'),
          D.h('p', { class: 'muted small', style: 'margin:0 0 6px' }, 'Tocca un nome: squadra ① → squadra ② → fuori. Ogni volta che la squadra torna al tavolo tira il compagno successivo.'),
          D.h('div', { class: 'teams' }, [1, 2].map((t) => D.h('div', { class: 'team-box' }, D.h('b', {}, t === 1 ? '① Squadra 1' : '② Squadra 2'),
            teams[t].map((u) => D.h('div', { class: 'small' }, `${D.person(u).avatar} ${D.person(u).username}${u === me ? ' (tu)' : ''}`))))),
          D.h('div', { class: 'row wrap', style: 'gap:6px;margin-top:8px' }, [D.S.me, ...others].map((p) => {
            const w = teams[1].includes(p.id) ? 1 : teams[2].includes(p.id) ? 2 : 0;
            return chip(`${w === 1 ? '①' : w === 2 ? '②' : '➕'} ${p.username}`, !!w, () => {
              teams[1] = teams[1].filter((x) => x !== p.id); teams[2] = teams[2].filter((x) => x !== p.id);
              if (!w) teams[1].push(p.id); else if (w === 1) teams[2].push(p.id); draw();
            });
          }))),
      D.h('div', { class: 'field' }, D.h('label', {}, 'Tempo per ogni tiro'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, TEMPI_TIRO.map((t) => chip(t.l, secs === t.s, () => { secs = t.s; draw(); }))),
        D.h('p', { class: 'muted small', style: 'margin:6px 0 0' }, secs ? 'Se il tempo finisce è fallo: palla in mano agli avversari.' : 'Si tira quando si può, anche il giorno dopo.')),
      err, D.h('button', { class: 'btn block', onclick: send }, '🎱 Lancia la sfida'));
  }
  async function send() {
    err.textContent = '';
    let t1, t2;
    if (mode === '1v1') { if (!opp) return (err.textContent = 'Scegli chi sfidare.'); [t1, t2] = Math.random() < 0.5 ? [[me], [opp]] : [[opp], [me]]; }
    else {
      if (!teams[1].length || !teams[2].length) return (err.textContent = 'Servono giocatori in tutte e due le squadre.');
      if (teams[1].length > 4 || teams[2].length > 4) return (err.textContent = 'Massimo 4 per squadra.');
      t1 = teams[1]; t2 = teams[2];
    }
    const { data, error } = await D.sb.rpc('pool_create', { p_circle: D.S.circleId, p_team1: t1, p_team2: t2, p_secs: secs, p_state: P.newState() });
    if (error) return (err.textContent = D.errMsg(error));
    D.closeSheet(); D.toast('Sfida lanciata! È anche in chat 🎱'); openPoolGame({ mode: 'online', id: data });
  }
  draw();
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '⚔️ Sfida a biliardo'), D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')), body));
}

/* ---------------- la partita ---------------- */
let view = null;
export async function openPoolGame({ mode, id = null, level = 'medio' }) {
  closeView();
  const me = D.S.me.id;
  const root = D.h('div', { class: 'chess-root pool-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  let g = null;                       // partita online
  let st = P.newState();              // stato del tavolo
  let anim = null, busy = false, dirty = false, claimed = false;
  let aim = { dx: 1, dy: 0 }, power = 0.55, dragCue = false, cheers = [];
  let pottedTotal = 0, ended = null; // allenamento / computer
  const cpuName = { facile: 'Computer 🙂', medio: 'Computer 😎', difficile: 'Computer 🤓' }[level];

  const canvas = D.h('canvas', { class: 'pool-canvas' });
  const ctx = canvas.getContext('2d');
  const header = D.h('div'), players = D.h('div'), msg = D.h('div', { class: 'pool-msg' }), controls = D.h('div', { class: 'pool-controls' }), extra = D.h('div');
  fill(root, D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'), header, D.h('div', { style: 'width:44px' })),
    D.h('div', { class: 'pool-main' }, players, D.h('div', { class: 'pool-wrap' }, canvas), msg, controls, extra));

  // geometria: tavolo verticale (la zona di partenza in basso)
  let sc = 1, bd = 16, cw = 0, ch = 0;
  function layout() {
    const wrap = canvas.parentNode, availW = Math.min(wrap.clientWidth || 360, 520);
    const availH = Math.max(320, window.innerHeight - (root.querySelector('.pool-controls')?.offsetHeight || 150) - (players.offsetHeight || 0) - 120);
    sc = Math.min((availW - 2 * bd) / P.H, (availH - 2 * bd) / P.W);
    cw = P.H * sc + 2 * bd; ch = P.W * sc + 2 * bd;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  const toS = (x, y) => [bd + y * sc, bd + (P.W - x) * sc];
  const toT = (sx, sy) => [P.W - (sy - bd) / sc, (sx - bd) / sc];

  const myTurn = () => {
    if (ended || busy) return false;
    if (mode === 'pratica') return true;
    if (mode === 'cpu') return st.turn === 1;
    return g && g.status === 'in_corso' && currentPlayer(g) === me;
  };
  const cueBall = () => st.balls.find((b) => b[0] === 0);

  function draw(frameBalls) {
    const balls = frameBalls || st.balls;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#6b3d1f'; ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, 14); ctx.fill();
    ctx.fillStyle = '#87502a'; ctx.beginPath(); ctx.roundRect(3, 3, cw - 6, ch - 6, 12); ctx.fill();
    const felt = ctx.createRadialGradient(cw / 2, ch / 2, 20, cw / 2, ch / 2, ch * 0.7);
    felt.addColorStop(0, '#24945a'); felt.addColorStop(1, '#176c40');
    ctx.fillStyle = felt; ctx.fillRect(bd, bd, cw - 2 * bd, ch - 2 * bd);
    // diamanti
    ctx.fillStyle = '#f3e3c3';
    for (let i = 1; i < 8; i++) { if (i === 4) continue; const y = bd + (ch - 2 * bd) * i / 8; ctx.fillRect(bd / 2 - 1.5, y - 1.5, 3, 3); ctx.fillRect(cw - bd / 2 - 1.5, y - 1.5, 3, 3); }
    for (let i = 1; i < 4; i++) { const x = bd + (cw - 2 * bd) * i / 4; ctx.fillRect(x - 1.5, bd / 2 - 1.5, 3, 3); ctx.fillRect(x - 1.5, ch - bd / 2 - 1.5, 3, 3); }
    // linea di partenza
    const [, hy] = toS(P.HEAD_X, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(bd, hy); ctx.lineTo(cw - bd, hy); ctx.stroke(); ctx.setLineDash([]);
    if (st.inHand && st.kitchen && myTurn()) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(bd, hy, cw - 2 * bd, ch - bd - hy); }
    // buche
    for (const [px, py, pr] of P.POCKETS) {
      const [sx, sy] = toS(Math.max(-2, Math.min(P.W + 2, px)), Math.max(-2, Math.min(P.H + 2, py)));
      ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(sx, sy, pr * sc * 0.82, 0, 7); ctx.fill();
    }
    // mira
    const cue = balls.find((b) => b[0] === 0);
    if (!frameBalls && cue && myTurn()) {
      const r = P.aimRay(balls, cue[1], cue[2], aim.dx, aim.dy);
      const [cx, cy] = toS(cue[1], cue[2]);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
      if (r.ghost) {
        const [gx, gy] = toS(r.ghost[0], r.ghost[1]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(gx, gy); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, P.R * sc, 0, 7); ctx.stroke();
        const [bx, by] = toS(r.ball.x, r.ball.y), [ex, ey] = toS(r.ball.x + r.dir[0] * 110, r.ball.y + r.dir[1] * 110);
        ctx.strokeStyle = 'rgba(255,240,150,.85)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      } else {
        const [wx, wy] = toS(r.wall[0], r.wall[1]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(wx, wy); ctx.stroke();
      }
      // stecca
      const len = Math.sqrt(aim.dx * aim.dx + aim.dy * aim.dy), ux = aim.dx / len, uy = aim.dy / len;
      const back = P.R * 1.6 + power * 70;
      const [s1x, s1y] = toS(cue[1] - ux * back, cue[2] - uy * back), [s2x, s2y] = toS(cue[1] - ux * (back + 260), cue[2] - uy * (back + 260));
      ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#d9b27c'; ctx.beginPath(); ctx.moveTo(s1x, s1y); ctx.lineTo(s2x, s2y); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#2b6cb0'; const [t1x, t1y] = toS(cue[1] - ux * back, cue[2] - uy * back), [t2x, t2y] = toS(cue[1] - ux * (back + 8), cue[2] - uy * (back + 8));
      ctx.beginPath(); ctx.moveTo(t1x, t1y); ctx.lineTo(t2x, t2y); ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
    }
    for (const [id, x, y] of balls) { const [sx, sy] = toS(x, y); drawBall(ctx, id, sx, sy, P.R * sc); }
    if (!frameBalls && cue && st.inHand && myTurn()) {
      const [cx, cy] = toS(cue[1], cue[2]);
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx, cy, P.R * sc + 5, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
  }

  // tocchi sul tavolo: trascina la bianca (palla in mano) o mira
  let lastTap = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!myTurn()) return;
    canvas.setPointerCapture(e.pointerId);
    const rc = canvas.getBoundingClientRect(), [x, y] = toT(e.clientX - rc.left, e.clientY - rc.top), cue = cueBall();
    dragCue = st.inHand && cue && (x - cue[1]) ** 2 + (y - cue[2]) ** 2 < (P.R * 3.2) ** 2;
    if (!dragCue) setAim(x, y);
    lastTap = Date.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!myTurn() || !(e.buttons || e.pressure)) return;
    const rc = canvas.getBoundingClientRect(), [x, y] = toT(e.clientX - rc.left, e.clientY - rc.top);
    if (dragCue) {
      const cx = Math.max(P.R, Math.min((st.kitchen ? P.HEAD_X : P.W) - P.R, x)), cy = Math.max(P.R, Math.min(P.H - P.R, y));
      if (P.validCueSpot(st.balls, cx, cy, st.kitchen)) { const c = cueBall(); c[1] = cx; c[2] = cy; draw(); }
    } else setAim(x, y);
  });
  canvas.addEventListener('pointerup', () => { dragCue = false; });
  function setAim(x, y) { const c = cueBall(); if (!c) return; const dx = x - c[1], dy = y - c[2]; if (dx * dx + dy * dy < 4) return; aim = { dx, dy }; draw(); }
  function nudge(deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); aim = { dx: aim.dx * c - aim.dy * s, dy: aim.dx * s + aim.dy * c }; draw(); }
  function aimAtBest() {
    const c = cueBall(); if (!c) return;
    const tg = P.legalTargets(st), cand = st.balls.filter((b) => tg.includes(b[0]));
    if (!st.broken) { aim = { dx: P.FOOT[0] - c[1], dy: P.FOOT[1] - c[2] }; power = 0.95; return; }
    cand.sort((a, b) => ((a[1] - c[1]) ** 2 + (a[2] - c[2]) ** 2) - ((b[1] - c[1]) ** 2 + (b[2] - c[2]) ** 2));
    if (cand[0]) aim = { dx: cand[0][1] - c[1], dy: cand[0][2] - c[2] };
    if (power > 0.9) power = 0.55;
  }

  /* ---- animazione ---- */
  function play(frames, done) {
    busy = true; renderUI();
    const t0 = performance.now(); let lastN = 0;
    const loop = (now) => {
      const i = Math.max(0, Math.min(frames.length - 1, Math.floor((now - t0) / 1000 * 120)));
      if (frames[i].length < frames[lastN].length) navigator.vibrate?.(12);
      lastN = i; draw(frames[i]);
      if (i < frames.length - 1 && view && view.root === root) anim = requestAnimationFrame(loop);
      else { anim = null; busy = false; done(); }
    };
    anim = requestAnimationFrame(loop);
  }
  function ballsWith(place) { return place ? [[0, place[0], place[1]], ...st.balls.filter((b) => b[0] !== 0)] : st.balls; }

  /* ---- tiro ---- */
  async function shoot() {
    if (!myTurn()) return;
    const c = cueBall(); if (!c) return;
    const place = st.inHand ? [c[1], c[2]] : null;
    const shot = { dx: +aim.dx.toFixed(5), dy: +aim.dy.toFixed(5), power: +power.toFixed(3), place };
    const balls = ballsWith(place);
    const res = P.simulate(balls, shot);
    const out = P.applyRules({ ...st, balls }, res);
    if (mode === 'online') {
      const n = g.shot_n;
      busy = true;
      const rpc = D.sb.rpc('pool_shot', { p_game: g.id, p_n: n, p_shot: shot, p_state: out.state, p_end: out.end, p_winner: out.winner });
      play(res.frames, async () => {
        const { error } = await rpc;
        if (error) { D.toast(D.errMsg(error), 3500); }
        await reload();
      });
      return;
    }
    play(res.frames, () => afterLocal(out, res));
  }
  function afterLocal(out, res) {
    if (mode === 'pratica') {
      const potted = res.events.pocketed.filter((id) => id !== 0);
      pottedTotal += potted.length;
      st = { ...out.state, turn: 1, inHand: res.events.pocketed.includes(0), groups: { 1: null, 2: null }, broken: true,
        msg: res.events.pocketed.includes(0) ? 'Bianca in buca: rimettila dove vuoi' : potted.length ? `Dentro! Totale: ${pottedTotal}` : `Bilie in buca: ${pottedTotal}` };
      if (st.balls.length <= 1) { st = P.newState(); st.msg = '🎉 Tavolo pulito! Nuovo triangolo'; }
    } else {
      st = out.state;
      if (out.end) ended = { winner: out.winner };
    }
    if (mode === 'cpu' && !ended && st.turn === 1) aimAtBest();
    renderUI(); draw();
    if (mode === 'cpu' && !ended && st.turn === 2) setTimeout(cpuTurn, 900);
  }
  function cpuTurn() {
    if (!view || view.root !== root) return;
    const sh = P.cpuShot(st, level);
    if (sh.place) { const c = cueBall(); if (c) { c[1] = sh.place[0]; c[2] = sh.place[1]; } else st.balls.unshift([0, sh.place[0], sh.place[1]]); }
    aim = { dx: sh.dx, dy: sh.dy }; power = sh.power;
    st.msg = '🤖 Il computer mira…'; renderMsg();
    draw(); drawAimFor(sh); // fa vedere la mira un attimo
    setTimeout(() => {
      const balls = ballsWith(sh.place);
      const res = P.simulate(balls, sh);
      const out = P.applyRules({ ...st, balls }, res);
      play(res.frames, () => afterLocal(out, res));
    }, 900);
  }
  function drawAimFor(sh) {
    const c = cueBall(); if (!c) return;
    const r = P.aimRay(st.balls, c[1], c[2], sh.dx, sh.dy), [cx, cy] = toS(c[1], c[2]);
    const end = r.ghost || r.wall, [ex, ey] = toS(end[0], end[1]);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ---- online ---- */
  async function reload() {
    const [{ data }, { data: chs }] = await Promise.all([D.sb.from('pool_games').select('*').eq('id', id).maybeSingle(), D.sb.from('pool_cheers').select('user_id,target').eq('game_id', id)]);
    if (!data) { D.toast('Partita non trovata'); return closeView(); }
    g = data; st = JSON.parse(JSON.stringify(g.state)); cheers = chs || []; claimed = false;
    if (myTurn()) aimAtBest();
    renderUI(); draw();
  }
  async function remote() {
    if (busy) { dirty = true; return; }
    const { data } = await D.sb.from('pool_games').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const ls = data.last_shot;
    if (g && data.shot_n === g.shot_n + 1 && ls && ls.dx != null && ls.by !== me) {
      // rivedo il tiro dell'altro
      const balls = ballsWith(ls.place);
      const res = P.simulate(balls, ls);
      play(res.frames, async () => { await reload(); if (dirty) { dirty = false; remote(); } });
      return;
    }
    await reload();
  }
  const myCheer = (t) => cheers.some((c) => c.user_id === me && c.target === t);
  async function toggleCheer(t) {
    const q = myCheer(t) ? D.sb.from('pool_cheers').delete().eq('game_id', id).eq('user_id', me).eq('target', t) : D.sb.from('pool_cheers').insert({ game_id: id, user_id: me, target: t });
    const { error } = await q; if (error) return D.toast(D.errMsg(error));
    const { data } = await D.sb.from('pool_cheers').select('user_id,target').eq('game_id', id); cheers = data || []; renderUI();
  }

  /* ---- interfaccia ---- */
  function renderMsg() { msg.textContent = st.msg || ''; }
  function tray(group) {
    if (!group) return null;
    const on = new Set(st.balls.map((b) => b[0])), ids = group === 'piene' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
    return D.h('div', { class: 'pool-tray' }, ids.map((i) => D.h('span', { class: 'pb' + (on.has(i) ? '' : ' gone') + (i > 8 ? ' st' : ''), style: `--c:${P.colorOf(i)}` }, i)));
  }
  function teamRow(t) {
    const label = mode === 'online' ? names(t === 1 ? g.team1 : g.team2) : t === 1 ? D.S.me.username : cpuName;
    const active = !ended && (mode !== 'online' || g.status === 'in_corso') && st.turn === t && mode !== 'pratica';
    const timer = mode === 'online' && g.turn_secs && g.status === 'in_corso' && st.turn === t ? D.h('span', { class: 'cg-clock run', 'data-ptimer': '1' }, '') : null;
    const cp = mode === 'online' && g.status === 'in_corso' && st.turn === t ? currentPlayer(g) : null;
    return D.h('div', { class: 'cg-player' + (active ? ' active' : '') },
      D.h('div', { style: 'flex:1;min-width:0' },
        D.h('div', { style: 'font-weight:800' }, t === 1 ? '① ' : '② ', label, st.groups?.[t] ? D.h('span', { class: 'small muted' }, ` · ${GRP[st.groups[t]]}`) : ''),
        cp && (t === 1 ? g.team1 : g.team2).length > 1 ? D.h('div', { class: 'small turn' }, `tira ${D.person(cp).username}`) : null,
        tray(st.groups?.[t])),
      mode === 'online' ? D.h('button', { class: 'chip' + (myCheer(String(t)) ? ' on' : ''), onclick: () => toggleCheer(String(t)) }, `📣 ${cheers.filter((c) => c.target === String(t)).length}`) : null,
      timer);
  }
  function renderUI() {
    fill(header, D.h('div', { class: 'cg-title' }, D.h('b', {}, '🎱 Biliardo'),
      D.h('span', {}, mode === 'pratica' ? 'allenamento' : mode === 'cpu' ? `contro il computer · ${level}` : g?.turn_secs ? `palla 8 · ${g.turn_secs}s a tiro` : 'palla 8 · senza tempo')));
    fill(players, mode === 'pratica' ? null : D.h('div', { class: 'pool-teams' }, teamRow(1), teamRow(2)));
    renderMsg();
    const mine = myTurn();
    let banner = null;
    if (ended || (mode === 'online' && g.status === 'finita')) {
      const w = mode === 'online' ? g.result : ended.winner;
      const win = mode === 'online' ? teamOf(g, me) === w : w === 1;
      banner = D.h('div', { class: 'card center hero' }, D.h('div', { style: 'font-size:2.2rem' }, win ? '🏆' : mode === 'online' && !teamOf(g, me) ? '🎱' : '😅'),
        D.h('h2', { style: 'margin:4px 0' }, mode === 'online' ? `Vince ${names(w === 1 ? g.team1 : g.team2)}` : win ? 'Hai vinto!' : 'Ha vinto il computer'),
        mode === 'online' && g.reason ? D.h('div', { class: 'small muted' }, FINE[g.reason] || g.reason) : null,
        mode === 'cpu' ? D.h('button', { class: 'btn', style: 'margin-top:8px', onclick: () => { st = P.newState(); ended = null; aimAtBest(); renderUI(); draw(); } }, '🔁 Rivincita') : null);
    }
    const iMustAnswer = mode === 'online' && g.status === 'invito' && teamOf(g, me) && !g.accepted.includes(me);
    fill(controls,
      banner,
      mine ? [
        D.h('div', { class: 'pool-power' }, D.h('span', { class: 'small', style: 'font-weight:800' }, '💪 Forza'),
          D.h('input', { type: 'range', min: 3, max: 100, value: Math.round(power * 100), oninput: (e) => { power = e.target.value / 100; draw(); } })),
        D.h('div', { class: 'row', style: 'gap:8px;justify-content:center' },
          D.h('button', { class: 'btn round ghost', 'aria-label': 'Ruota a sinistra', onclick: () => nudge(-0.6) }, '↺'),
          D.h('button', { class: 'btn', style: 'flex:1;max-width:220px', onclick: shoot }, '🎱 Tira!'),
          D.h('button', { class: 'btn round ghost', 'aria-label': 'Ruota a destra', onclick: () => nudge(0.6) }, '↻')),
        D.h('p', { class: 'muted small center', style: 'margin:6px 0 0' }, st.inHand ? 'Palla in mano: trascina la bianca dove vuoi, poi tocca il tavolo per mirare.' : 'Tocca o trascina sul tavolo per mirare. ↺ ↻ per i ritocchi fini.'),
      ] : null,
      iMustAnswer ? D.h('div', { class: 'row', style: 'justify-content:center;gap:8px' },
        D.h('button', { class: 'btn', onclick: async () => { const { error } = await D.sb.rpc('pool_respond', { p_game: id, p_accept: true }); if (error) D.toast(D.errMsg(error)); reload(); } }, '✅ Accetto la sfida'),
        D.h('button', { class: 'btn plain', onclick: async () => { await D.sb.rpc('pool_respond', { p_game: id, p_accept: false }); closeView(); } }, 'Rifiuto')) : null,
      mode === 'online' && g.status === 'invito' && !iMustAnswer ? D.h('p', { class: 'muted center' }, statusText(g, me)) : null,
      mode === 'online' && g.status === 'in_corso' && !mine && !busy ? D.h('p', { class: 'center', style: 'font-weight:800' }, statusText(g, me)) : null,
      mode === 'online' && g.status === 'in_corso' && g.last_shot?.n && !teamOf(g, me) ? D.h('button', { class: 'chip' + (myCheer('s' + g.last_shot.n) ? ' on' : ''), style: 'display:block;margin:8px auto', onclick: () => toggleCheer('s' + g.last_shot.n) }, `👏 Bel tiro! ${cheers.filter((c) => c.target === 's' + g.last_shot.n).length || ''}`) : null);
    fill(extra,
      mode === 'online' && g.status === 'invito' && g.created_by === me ? D.h('button', { class: 'linkbtn small', onclick: async () => { await D.sb.rpc('pool_cancel', { p_game: id }); closeView(); } }, 'Annulla la sfida') : null,
      mode === 'online' && g.status === 'in_corso' && teamOf(g, me) ? D.h('button', { class: 'linkbtn small', onclick: async () => {
        if (!(await D.askConfirm('🏳️ Abbandoni la partita?', 'Vince la squadra avversaria.', 'Sì, abbandono'))) return;
        const { error } = await D.sb.rpc('pool_resign', { p_game: id }); if (error) D.toast(D.errMsg(error)); reload();
      } }, '🏳️ Abbandona') : null,
      mode === 'online' && !teamOf(g, me) ? D.h('p', { class: 'muted small center' }, '👀 Stai guardando da tifoso: 📣 per tifare una squadra, 👏 per applaudire un tiro') : null,
      mode !== 'online' ? D.h('p', { class: 'muted small center' }, 'Regole: palla 8. Prima le tue bilie (piene o rigate), poi la nera. Fallo = palla in mano agli altri.') : null,
      D.h('p', { class: 'center credit' }, 'originale Chiacchiere'));
  }
  const ticker = setInterval(() => {
    if (mode !== 'online' || !g || g.status !== 'in_corso' || !g.turn_secs) return;
    const left = Date.parse(g.turn_started_at) + g.turn_secs * 1000 - Date.now();
    for (const el of root.querySelectorAll('[data-ptimer]')) { el.textContent = `${Math.max(0, Math.ceil(left / 1000))}s`; el.classList.toggle('low', left < 10000); }
    if (left < -1500 && !claimed && !busy) { claimed = true; D.sb.rpc('pool_claim_time', { p_game: g.id }).then(() => remote()); }
  }, 500);
  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  view = { id, root, remote, stop: () => { clearInterval(ticker); cancelAnimationFrame(anim); window.removeEventListener('resize', onResize); } };

  if (mode === 'online') await reload();
  else { aimAtBest(); renderUI(); }
  requestAnimationFrame(layout);
}
function closeView() {
  if (!view) return;
  view.stop(); view.root.remove(); view = null; document.body.style.overflow = '';
}

// partite in cui tocca a me (per il numerino sulla scheda)
export async function poolTurns() {
  const { data } = await D.sb.from('pool_games').select('*').eq('circle_id', D.S.circleId).in('status', ['in_corso', 'invito']);
  const me = D.S.me.id;
  return (data || []).filter((g) => (g.status === 'in_corso' && currentPlayer(g) === me) || (g.status === 'invito' && teamOf(g, me) && !g.accepted.includes(me))).length;
}
