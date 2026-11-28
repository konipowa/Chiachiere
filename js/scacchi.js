// ♟️ Scacchi di Chiacchiere: sfide 1 contro 1 o a squadre (una mossa a testa), tifosi, tempi.
// Le regole le controlla chess.js; il server controlla turni, orologi e risultato.
import { Chess } from './vendor/chess.js';

let D; // dipendenze passate dall'app (sb, S, h, person, avatarEl, toast, errMsg, openSheet, closeSheet, askConfirm, circle)
export function initScacchi(deps) { D = deps; }

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const VS15 = '︎'; // forza il simbolo "testo" (niente emoji colorata su iPhone)
const NOMI_FINE = {
  scaccomatto: 'scacco matto', abbandono: 'abbandono', tempo: 'tempo scaduto', stallo: 'stallo',
  ripetizione: 'triplice ripetizione', materiale: 'materiale insufficiente', cinquanta: 'regola delle 50 mosse',
  accordo: 'patta d\'accordo', rifiutata: 'sfida rifiutata', annullata: 'sfida annullata',
};
export const TEMPI = [
  { id: '3+2', label: '⚡ 3+2', base: 180, inc: 2 },
  { id: '5+3', label: '🐇 5+3', base: 300, inc: 3 },
  { id: '10+0', label: '🕐 10 min', base: 600, inc: 0 },
  { id: '30+0', label: '🐢 30 min', base: 1800, inc: 0 },
  { id: 'libero', label: '✉️ Senza tempo', base: 0, inc: 0 },
];
const tempoLabel = (g) => (g.base_secs ? `${Math.round(g.base_secs / 60)}+${g.inc_secs}` : 'senza tempo');

/* ---------------- utilità ---------------- */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter(Boolean));
const names = (ids) => ids.map((id) => D.person(id).username).join(' + ');
const sideOf = (g, uid) => (g.white.includes(uid) ? 'w' : g.black.includes(uid) ? 'b' : null);
const plyOf = (g) => g.moves.length;
const toMove = (g) => (plyOf(g) % 2 === 0 ? 'w' : 'b');
function nextPlayer(g) {
  const ply = plyOf(g), team = ply % 2 === 0 ? g.white : g.black;
  return team[Math.floor(ply / 2) % team.length];
}
function rebuild(g) {
  const c = new Chess();
  for (const m of g.moves) { try { c.move(m.san); } catch { return new Chess(g.fen); } }
  return c;
}
function clockMs(g, side, now = Date.now()) {
  if (!g.base_secs) return null;
  let ms = side === 'w' ? g.white_ms : g.black_ms;
  if (g.status === 'in_corso' && toMove(g) === side && g.last_move_at) ms -= now - Date.parse(g.last_move_at);
  return Math.max(0, ms ?? g.base_secs * 1000);
}
const fmtClock = (ms) => {
  if (ms == null) return '';
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
};
function statusText(g, me) {
  if (g.status === 'invito') {
    const missing = [...g.white, ...g.black].filter((u) => !g.accepted.includes(u));
    return `In attesa di ${names(missing)}`;
  }
  if (g.status === 'rifiutata') return g.reason === 'annullata' ? 'Sfida annullata' : 'Sfida rifiutata';
  if (g.status === 'finita') {
    const why = NOMI_FINE[g.reason] || g.reason || '';
    if (g.result === '1/2-1/2') return `½–½ Patta · ${why}`;
    const win = g.result === '1-0' ? g.white : g.black;
    return `🏆 Vince ${names(win)} (${g.result === '1-0' ? 'Bianco' : 'Nero'}) · ${why}`;
  }
  const np = nextPlayer(g);
  return np === me ? '👉 Tocca a te!' : `Tocca a ${D.person(np).username} (${toMove(g) === 'w' ? 'Bianco' : 'Nero'})`;
}

/* ---------------- scacchiera ---------------- */
function boardEl(chess, { flip = false, mini = false, interactive = false, lastMove = null, onMove } = {}) {
  const el = D.h('div', { class: 'cb' + (mini ? ' mini' : '') });
  let sel = null, targets = [];
  const files = 'abcdefgh';
  function draw() {
    const cells = [];
    const inCheck = chess.inCheck() ? chess.turn() : null;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const rank = flip ? r + 1 : 8 - r, file = flip ? 7 - f : f;
      const sq = files[file] + rank, p = chess.get(sq);
      const dark = (file + rank) % 2 === 1;
      const cls = ['sq', dark ? 'l' : 'd'];
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) cls.push('last');
      if (sel === sq) cls.push('sel');
      if (targets.includes(sq)) cls.push(p ? 'cap' : 'dot');
      if (p && p.type === 'k' && p.color === inCheck) cls.push('check');
      const cell = D.h('div', { class: cls.join(' '), 'data-sq': sq },
        p ? D.h('span', { class: 'pc ' + p.color }, GLYPH[p.type] + VS15) : null,
        !mini && f === 0 ? D.h('i', { class: 'rk' }, rank) : null,
        !mini && r === 7 ? D.h('i', { class: 'fl' }, files[file]) : null);
      if (interactive) cell.onclick = () => tap(sq);
      cells.push(cell);
    }
    el.replaceChildren(...cells);
  }
  async function tap(sq) {
    const p = chess.get(sq);
    if (sel && targets.includes(sq)) {
      const opts = chess.moves({ square: sel, verbose: true }).filter((m) => m.to === sq);
      let promo;
      if (opts.some((m) => m.promotion)) promo = await askPromotion(chess.turn());
      if (opts.some((m) => m.promotion) && !promo) return;
      const from = sel; sel = null; targets = [];
      onMove?.({ from, to: sq, promotion: promo });
      return;
    }
    if (p && p.color === chess.turn()) {
      sel = sq; targets = chess.moves({ square: sq, verbose: true }).map((m) => m.to);
    } else { sel = null; targets = []; }
    draw();
  }
  el.redraw = (lm) => { if (lm !== undefined) lastMove = lm; sel = null; targets = []; draw(); };
  draw();
  return el;
}
function askPromotion(color) {
  return new Promise((res) => {
    let done = false;
    D.openSheet(D.h('div', { class: 'center' }, D.h('h2', {}, 'Promozione: scegli il pezzo'),
      D.h('div', { class: 'promo' }, ['q', 'r', 'b', 'n'].map((t) => D.h('button', { class: 'pc ' + color, onclick: () => { done = true; D.closeSheet(); res(t); } }, GLYPH[t] + VS15)))),
    () => { if (!done) res(null); });
  });
}

/* ---------------- card in chat ---------------- */
const liveCards = new Map(); // gameId -> Set(elementi)
export function chessChatCard(gameId) {
  const box = D.h('div', { class: 'chess-card', 'data-chess': gameId }, D.h('p', { class: 'muted small' }, '♟️ Carico la partita…'));
  if (!liveCards.has(gameId)) liveCards.set(gameId, new Set());
  liveCards.get(gameId).add(box);
  fillCard(box, gameId);
  return box;
}
async function fillCard(box, gameId) {
  const [{ data: g }, { data: ch }] = await Promise.all([
    D.sb.from('chess_games').select('*').eq('id', gameId).maybeSingle(),
    D.sb.from('chess_cheers').select('user_id,target').eq('game_id', gameId),
  ]);
  if (!g) return box.replaceChildren(D.h('p', { class: 'muted small' }, '♟️ Partita non più disponibile'));
  const me = D.S.me.id, side = sideOf(g, me), chess = rebuild(g);
  const last = chess.history({ verbose: true }).at(-1);
  const tifoW = (ch || []).filter((c) => c.target === 'w').length, tifoB = (ch || []).filter((c) => c.target === 'b').length;
  const iMustAnswer = g.status === 'invito' && side && !g.accepted.includes(me);
  box.replaceChildren(
    D.h('div', { class: 'cc-head' }, D.h('b', {}, '♟️ Scacchi'), D.h('span', { class: 'muted small' }, `${g.white.length > 1 || g.black.length > 1 ? 'a squadre · ' : ''}${tempoLabel(g)}`)),
    D.h('div', { class: 'cc-body' },
      boardEl(chess, { flip: side === 'b', mini: true, lastMove: last }),
      D.h('div', { class: 'cc-side' },
        D.h('div', { class: 'cc-team' }, '⚪ ', names(g.white)),
        D.h('div', { class: 'cc-team' }, '⚫ ', names(g.black)),
        D.h('div', { class: 'cc-status' + (g.status === 'in_corso' && nextPlayer(g) === me ? ' me' : '') }, statusText(g, me)),
        g.moves.length ? D.h('div', { class: 'muted small' }, `${Math.ceil(g.moves.length / 2)}ª mossa${last ? ' · ' + last.san : ''}`) : null,
        tifoW + tifoB ? D.h('div', { class: 'small' }, `📣 ⚪${tifoW} · ⚫${tifoB}`) : null)),
    D.h('div', { class: 'row wrap', style: 'margin-top:8px;gap:6px' },
      iMustAnswer ? D.h('button', { class: 'btn small', onclick: async () => {
        const { error } = await D.sb.rpc('chess_respond', { p_game: g.id, p_accept: true });
        if (error) return D.toast(D.errMsg(error));
        D.toast('Sfida accettata! ♟️'); openChessGame(g.id);
      } }, '✅ Accetto') : null,
      iMustAnswer ? D.h('button', { class: 'btn small plain', onclick: async () => {
        await D.sb.rpc('chess_respond', { p_game: g.id, p_accept: false }); refreshChess(g.id);
      } }, 'Rifiuto') : null,
      g.status !== 'rifiutata' ? D.h('button', { class: 'btn small ghost', onclick: () => openChessGame(g.id) },
        g.status === 'in_corso' && nextPlayer(g) === me ? '👉 Muovi' : g.status === 'finita' ? 'Rivedi' : side ? 'Apri' : '👀 Guarda e fai il tifo') : null));
}
export function refreshChess(gameId) {
  const set = liveCards.get(gameId);
  if (set) for (const el of [...set]) { if (!el.isConnected) set.delete(el); else fillCard(el, gameId); }
  if (view && view.id === gameId) view.reload();
}

/* ---------------- schermata della partita ---------------- */
let view = null;
export async function openChessGame(gameId) {
  closeView();
  const root = D.h('div', { class: 'chess-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  let g = null, chess = null, board = null, cheers = [], ticker = null, claimed = false, busy = false;
  const me = D.S.me.id;

  async function reload() {
    const [{ data }, { data: ch }] = await Promise.all([
      D.sb.from('chess_games').select('*').eq('id', gameId).maybeSingle(),
      D.sb.from('chess_cheers').select('user_id,target').eq('game_id', gameId),
    ]);
    if (!data) { D.toast('Partita non trovata'); return closeView(); }
    g = data; cheers = ch || []; chess = rebuild(g); claimed = false;
    render();
  }
  const myCheer = (t) => cheers.some((c) => c.user_id === me && c.target === t);
  const cheerCount = (t) => cheers.filter((c) => c.target === t).length;
  async function toggleCheer(t) {
    const q = myCheer(t)
      ? D.sb.from('chess_cheers').delete().eq('game_id', gameId).eq('user_id', me).eq('target', t)
      : D.sb.from('chess_cheers').insert({ game_id: gameId, user_id: me, target: t });
    const { error } = await q;
    if (error) return D.toast(D.errMsg(error));
    reload();
  }

  async function doMove(mv) {
    if (busy) return;
    const ply = g.moves.length;
    let res;
    try { res = chess.move(mv); } catch { return board.redraw(); }
    const end = chess.isCheckmate() ? 'scaccomatto' : chess.isStalemate() ? 'stallo' : chess.isThreefoldRepetition() ? 'ripetizione'
      : chess.isInsufficientMaterial() ? 'materiale' : chess.isDrawByFiftyMoves() ? 'cinquanta' : null;
    board.redraw({ from: res.from, to: res.to });
    busy = true;
    const { data, error } = await D.sb.rpc('chess_move', { p_game: gameId, p_ply: ply, p_san: res.san, p_fen: chess.fen(), p_end: end });
    busy = false;
    if (error) { D.toast(D.errMsg(error), 3000); return reload(); }
    if (data === 'tempo') D.toast('⏰ Tempo scaduto!');
    navigator.vibrate?.(10);
    reload();
  }

  function playerRow(side, flipTop) {
    const team = side === 'w' ? g.white : g.black;
    const active = g.status === 'in_corso' && toMove(g) === side;
    const np = g.status === 'in_corso' ? nextPlayer(g) : null;
    return D.h('div', { class: 'cg-player' + (active ? ' active' : '') },
      D.h('div', { class: 'cg-names' }, D.h('span', { class: 'cg-col' }, side === 'w' ? '⚪' : '⚫'),
        team.map((u) => D.h('span', { class: 'cg-who' + (u === np ? ' turn' : '') }, D.avatarEl(D.person(u), 'sm'), D.person(u).username))),
      D.h('div', { class: 'cg-tifo' },
        D.h('button', { class: 'chip' + (myCheer(side) ? ' on' : ''), onclick: () => toggleCheer(side) }, `📣 ${cheerCount(side)}`)),
      g.base_secs ? D.h('div', { class: 'cg-clock' + (active ? ' run' : ''), 'data-clock': side }, fmtClock(clockMs(g, side))) : null);
  }

  function render() {
    const side = sideOf(g, me);
    const flip = side === 'b';
    const myTurn = g.status === 'in_corso' && nextPlayer(g) === me;
    const last = chess.history({ verbose: true }).at(-1);
    board = boardEl(chess, { flip, interactive: myTurn, lastMove: last ? { from: last.from, to: last.to } : null, onMove: doMove });
    const moves = g.moves.map((m, i) => D.h('button', { class: 'mv' + (myCheer('m' + i) ? ' on' : ''), title: D.person(m.by).username, onclick: () => toggleCheer('m' + i) },
      i % 2 === 0 ? D.h('b', {}, `${i / 2 + 1}.`) : null, m.san, cheerCount('m' + i) ? D.h('small', {}, ` 👏${cheerCount('m' + i)}`) : null));
    const iMustAnswer = g.status === 'invito' && side && !g.accepted.includes(me);
    const drawOfferForMe = g.status === 'in_corso' && g.draw_offer && side && g.draw_offer !== side;
    fill(root,
      D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'),
        D.h('div', { class: 'cg-title' }, D.h('b', {}, '♟️ Scacchi'), D.h('span', {}, `${g.white.length > 1 || g.black.length > 1 ? 'a squadre · ' : ''}${tempoLabel(g)}`)),
        D.h('div', { style: 'width:44px' })),
      D.h('div', { class: 'cg-main' },
        playerRow(flip ? 'w' : 'b'),
        board,
        playerRow(flip ? 'b' : 'w'),
        D.h('div', { class: 'cg-status' + (myTurn ? ' me' : '') }, statusText(g, me)),
        drawOfferForMe ? D.h('div', { class: 'card center', style: 'margin:8px 0' }, D.h('b', {}, '🤝 Ti propongono la patta'),
          D.h('div', { class: 'row', style: 'justify-content:center;margin-top:8px' },
            D.h('button', { class: 'btn small', onclick: async () => { await D.sb.rpc('chess_draw', { p_game: gameId, p_action: 'accetto' }); reload(); } }, 'Accetto'),
            D.h('button', { class: 'btn small plain', onclick: async () => { await D.sb.rpc('chess_draw', { p_game: gameId, p_action: 'rifiuto' }); reload(); } }, 'No, continuiamo'))) : null,
        iMustAnswer ? D.h('div', { class: 'row', style: 'justify-content:center;margin:8px 0' },
          D.h('button', { class: 'btn', onclick: async () => { const { error } = await D.sb.rpc('chess_respond', { p_game: gameId, p_accept: true }); if (error) D.toast(D.errMsg(error)); reload(); } }, '✅ Accetto la sfida'),
          D.h('button', { class: 'btn plain', onclick: async () => { await D.sb.rpc('chess_respond', { p_game: gameId, p_accept: false }); closeView(); } }, 'Rifiuto')) : null,
        g.status === 'invito' && g.created_by === me ? D.h('button', { class: 'linkbtn small', onclick: async () => { await D.sb.rpc('chess_cancel', { p_game: gameId }); closeView(); } }, 'Annulla la sfida') : null,
        g.status === 'in_corso' && side ? D.h('div', { class: 'row', style: 'justify-content:center;gap:8px;margin:8px 0' },
          g.draw_offer === side ? D.h('span', { class: 'muted small' }, '🤝 Patta proposta, in attesa…')
            : D.h('button', { class: 'btn small ghost', onclick: async () => { await D.sb.rpc('chess_draw', { p_game: gameId, p_action: 'offro' }); D.toast('Patta proposta 🤝'); reload(); } }, '🤝 Proponi patta'),
          D.h('button', { class: 'btn small ghost', onclick: async () => {
            if (!(await D.askConfirm('🏳️ Abbandoni la partita?', 'Vince la squadra avversaria.', 'Sì, abbandono'))) return;
            const { error } = await D.sb.rpc('chess_resign', { p_game: gameId }); if (error) D.toast(D.errMsg(error)); reload();
          } }, '🏳️ Abbandona')) : null,
        moves.length ? D.h('div', { class: 'card', style: 'margin-top:10px' },
          D.h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Mosse · tocca una mossa per applaudirla 👏'),
          D.h('div', { class: 'mvlist' }, moves)) : null,
        !side ? D.h('p', { class: 'muted small center' }, '👀 Stai guardando da tifoso: tocca 📣 per tifare una squadra') : null));
  }

  function tick() {
    if (!g || g.status !== 'in_corso' || !g.base_secs) return;
    for (const el of root.querySelectorAll('[data-clock]')) {
      const ms = clockMs(g, el.dataset.clock);
      el.textContent = fmtClock(ms);
      el.classList.toggle('low', ms < 20000);
      if (ms <= 0 && !claimed) { claimed = true; D.sb.rpc('chess_claim_time', { p_game: gameId }).then(reload); }
    }
  }
  view = { id: gameId, reload, root };
  ticker = setInterval(tick, 250);
  view.stop = () => clearInterval(ticker);
  await reload();
}
function closeView() {
  if (!view) return;
  view.stop?.(); view.root.remove(); view = null;
  document.body.style.overflow = '';
}

/* ---------------- elenco partite e nuova sfida ---------------- */
export async function openChessLobby() {
  const box = D.h('div', {}, D.h('p', { class: 'muted center' }, 'Carico…'));
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '♟️ Scacchi'),
    D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')), box));
  const { data } = await D.sb.from('chess_games').select('*').eq('circle_id', D.S.circleId).neq('status', 'rifiutata').order('created_at', { ascending: false }).limit(30);
  const me = D.S.me.id;
  const games = data || [];
  const live = games.filter((g) => g.status !== 'finita'), done = games.filter((g) => g.status === 'finita').slice(0, 8);
  const row = (g) => D.h('button', { class: 'cg-row', onclick: () => { D.closeSheet(); openChessGame(g.id); } },
    D.h('div', { style: 'flex:1;text-align:left' }, D.h('b', {}, `⚪ ${names(g.white)}  vs  ⚫ ${names(g.black)}`),
      D.h('div', { class: 'small ' + (g.status === 'in_corso' && nextPlayer(g) === me ? 'turn' : 'muted') }, statusText(g, me))), '›');
  fill(box,
    D.h('button', { class: 'btn block', onclick: () => newChallenge() }, '⚔️ Nuova sfida'),
    D.h('h3', { style: 'margin-top:18px' }, 'In corso e inviti'),
    live.length ? D.h('div', { class: 'stack' }, live.map(row)) : D.h('p', { class: 'muted small' }, 'Nessuna partita aperta. Sfida qualcuno!'),
    done.length ? D.h('h3', { style: 'margin-top:18px' }, 'Finite di recente') : null,
    done.length ? D.h('div', { class: 'stack' }, done.map(row)) : null);
}

export function newChallenge() {
  const me = D.S.me.id;
  const others = [...D.S.members.values()].filter((p) => p.id !== me);
  if (!others.length) return D.toast('Nella cerchia non c\'è ancora nessuno da sfidare: invita qualcuno! 📤', 3500);
  let mode = '1v1', opp = null, color = 'random', tempo = TEMPI[2];
  const teams = { w: [me], b: [] };
  const err = D.h('div', { class: 'error' });
  const body = D.h('div');
  const chip = (label, on, onclick) => D.h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick }, label);
  function draw() {
    fill(body,
      D.h('div', { class: 'seg', style: 'margin-bottom:12px' },
        D.h('button', { class: mode === '1v1' ? 'on' : '', onclick: () => { mode = '1v1'; draw(); } }, '👤 1 contro 1'),
        D.h('button', { class: mode === 'team' ? 'on' : '', onclick: () => { mode = 'team'; draw(); } }, '👥 A squadre')),
      mode === '1v1' ? D.h('div', { class: 'field' }, D.h('label', {}, 'Chi sfidi?'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, others.map((p) => chip(`${p.avatar} ${p.username}`, opp === p.id, () => { opp = p.id; draw(); }))))
      : D.h('div', { class: 'field' }, D.h('label', {}, 'Forma le squadre'),
          D.h('p', { class: 'muted small', style: 'margin:0 0 6px' }, 'Tocca un nome per spostarlo: Bianco → Nero → fuori. Ogni squadra gioca una mossa a testa, a turno.'),
          D.h('div', { class: 'teams' },
            ['w', 'b'].map((s) => D.h('div', { class: 'team-box' }, D.h('b', {}, s === 'w' ? '⚪ Bianco' : '⚫ Nero'),
              teams[s].map((u) => D.h('div', { class: 'small' }, `${D.person(u).avatar} ${D.person(u).username}${u === me ? ' (tu)' : ''}`))))),
          D.h('div', { class: 'row wrap', style: 'gap:6px;margin-top:8px' }, [D.S.me, ...others].map((p) => {
            const where = teams.w.includes(p.id) ? 'w' : teams.b.includes(p.id) ? 'b' : null;
            return chip(`${where === 'w' ? '⚪' : where === 'b' ? '⚫' : '➕'} ${p.username}`, !!where, () => {
              teams.w = teams.w.filter((x) => x !== p.id); teams.b = teams.b.filter((x) => x !== p.id);
              if (!where) teams.w.push(p.id); else if (where === 'w') teams.b.push(p.id);
              draw();
            });
          }))),
      mode === '1v1' ? D.h('div', { class: 'field' }, D.h('label', {}, 'Con che colore giochi?'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, [['w', '⚪ Bianco'], ['b', '⚫ Nero'], ['random', '🎲 A caso']].map(([k, l]) => chip(l, color === k, () => { color = k; draw(); })))) : null,
      D.h('div', { class: 'field' }, D.h('label', {}, 'Tempo'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, TEMPI.map((t) => chip(t.label, tempo.id === t.id, () => { tempo = t; draw(); }))),
        D.h('p', { class: 'muted small', style: 'margin:6px 0 0' }, tempo.base ? `${tempo.base / 60} minuti a testa${tempo.inc ? ` + ${tempo.inc} secondi a mossa` : ''}.` : 'Nessun orologio: ognuno muove quando può, anche il giorno dopo.')),
      err,
      D.h('button', { class: 'btn block', onclick: send }, '⚔️ Lancia la sfida'));
  }
  async function send() {
    err.textContent = '';
    let white, black;
    if (mode === '1v1') {
      if (!opp) return (err.textContent = 'Scegli chi sfidare.');
      const meWhite = color === 'w' || (color === 'random' && Math.random() < 0.5);
      white = meWhite ? [me] : [opp]; black = meWhite ? [opp] : [me];
    } else {
      if (!teams.w.length || !teams.b.length) return (err.textContent = 'Servono giocatori in entrambe le squadre.');
      if (![...teams.w, ...teams.b].includes(me)) return (err.textContent = 'Devi giocare anche tu.');
      if (teams.w.length > 4 || teams.b.length > 4) return (err.textContent = 'Massimo 4 per squadra.');
      white = teams.w; black = teams.b;
    }
    const { data, error } = await D.sb.rpc('chess_create', { p_circle: D.S.circleId, p_white: white, p_black: black, p_base: tempo.base, p_inc: tempo.inc });
    if (error) return (err.textContent = D.errMsg(error));
    D.closeSheet(); D.toast('Sfida lanciata! È anche in chat ♟️'); openChessGame(data);
  }
  draw();
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '⚔️ Nuova sfida'),
    D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')), body));
}

// quante partite aspettano una mia mossa (per la card dei giochi)
export async function myTurns() {
  const { data } = await D.sb.from('chess_games').select('*').eq('circle_id', D.S.circleId).in('status', ['in_corso', 'invito']);
  const me = D.S.me.id;
  return (data || []).filter((g) => (g.status === 'in_corso' && nextPlayer(g) === me) || (g.status === 'invito' && sideOf(g, me) && !g.accepted.includes(me))).length;
}
