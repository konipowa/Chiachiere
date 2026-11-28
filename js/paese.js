// 🌙 Notte in paese: gioco dei ruoli segreti (stile lupus): assassini, sceriffo, prostituta, medico, cittadini.
// I ruoli li sa solo il server: ognuno vede il suo (gli assassini si conoscono tra loro).
let D;
export function initPaese(deps) { D = deps; }
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const RUOLI = {
  assassino: { e: '🔪', n: 'Assassino', d: 'Ogni notte, con gli altri assassini, scegli chi eliminare. Di giorno fingi di essere innocente. Vinci quando siete tanti quanti gli altri.', a: 'Chi vuoi eliminare stanotte?' },
  sceriffo: { e: '⭐', n: 'Sceriffo', d: 'Ogni notte indaghi su una persona e scopri se è un assassino. Usa bene quello che sai… senza farti scoprire.', a: 'Su chi vuoi indagare stanotte?' },
  prostituta: { e: '💋', n: 'Prostituta', d: 'Ogni notte vai a trovare qualcuno: per quella notte la sua azione è bloccata (se è un assassino, non uccide).', a: 'Chi vuoi andare a trovare stanotte?' },
  medico: { e: '🩺', n: 'Medico', d: 'Ogni notte proteggi una persona (anche te stesso): se gli assassini la scelgono, si salva.', a: 'Chi vuoi proteggere stanotte?' },
  cittadino: { e: '🧑', n: 'Cittadino', d: 'Di notte dormi. Di giorno discuti, osserva e vota per scoprire gli assassini.', a: null },
};
const TEMPI_NOTTE = [[0, 'A mano'], [2, '2 min'], [5, '5 min'], [30, '30 min'], [480, '8 ore']];
const TEMPI_GIORNO = [[0, 'A mano'], [5, '5 min'], [15, '15 min'], [60, '1 ora'], [1440, '1 giorno']];
const nm = (id) => D.person(id).username;
const left = (dl) => { const s = Math.max(0, Math.round((Date.parse(dl) - Date.now()) / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function phaseText(g) {
  return { iscrizioni: `📝 Iscrizioni aperte · ${g.players.length} giocatori`, notte: `🌙 Notte ${g.round}`, giorno: `☀️ Giorno ${g.round}`, finita: g.winner === 'cittadini' ? '🎉 Hanno vinto i cittadini' : '🔪 Hanno vinto gli assassini', annullata: 'Partita annullata' }[g.status];
}

/* ---------------- scheda in chat ---------------- */
const cards = new Map();
export function paeseChatCard(id) {
  const box = D.h('div', { class: 'chess-card paese-card' }, D.h('p', { class: 'muted small' }, '🌙 Carico la partita…'));
  if (!cards.has(id)) cards.set(id, new Set());
  cards.get(id).add(box); fillCard(box, id);
  return box;
}
async function fillCard(box, id) {
  const { data: g } = await D.sb.from('lupus_games').select('*').eq('id', id).maybeSingle();
  if (!g) return fill(box, D.h('p', { class: 'muted small' }, '🌙 Partita non più disponibile'));
  const me = D.S.me.id, inGame = g.players.includes(me);
  const last = g.log.length ? g.log[g.log.length - 1].t : '';
  fill(box, D.h('div', { class: 'cc-head' }, D.h('b', {}, '🌙 Notte in paese'), D.h('span', { class: 'muted small' }, phaseText(g))),
    g.status === 'iscrizioni' ? D.h('div', { class: 'small' }, g.players.map(nm).join(', ')) : D.h('div', { class: 'small' }, last),
    D.h('div', { class: 'row wrap', style: 'gap:6px;margin-top:8px' },
      g.status === 'iscrizioni' && !inGame ? D.h('button', { class: 'btn small', onclick: async () => { const { error } = await D.sb.rpc('lupus_join', { p_game: id, p_in: true }); if (error) return D.toast(D.errMsg(error)); openPaese(id); } }, '✋ Gioco anch\'io') : null,
      g.status !== 'annullata' ? D.h('button', { class: 'btn small ghost', onclick: () => openPaese(id) }, inGame || g.status === 'finita' ? 'Apri' : '👀 Guarda') : null));
}
export function refreshPaese(id) {
  const set = cards.get(id);
  if (set) for (const el of [...set]) { if (!el.isConnected) set.delete(el); else fillCard(el, id); }
  if (view && view.id === id) view.reloadSoon();
}

/* ---------------- menu e nuova partita ---------------- */
export async function openPaeseLobby() {
  const box = D.h('div', {}, D.h('p', { class: 'muted center' }, 'Carico…'));
  const st = { assassini: 0, sceriffo: true, prostituta: true, medico: false, notte_min: 5, giorno_min: 15, rivela: true };
  const form = D.h('div');
  const chip = (l, on, f) => D.h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: f }, l);
  function draw() {
    fill(form,
      D.h('div', { class: 'field' }, D.h('label', {}, 'Assassini'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, [[0, '🎲 In base ai giocatori'], [1, '1'], [2, '2'], [3, '3']].map(([v, l]) => chip(l, st.assassini === v, () => { st.assassini = v; draw(); })))),
      D.h('div', { class: 'field' }, D.h('label', {}, 'Ruoli speciali'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, ['sceriffo', 'prostituta', 'medico'].map((k) => chip(`${RUOLI[k].e} ${RUOLI[k].n}`, st[k], () => { st[k] = !st[k]; draw(); })))),
      D.h('div', { class: 'field' }, D.h('label', {}, '🌙 Durata della notte'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, TEMPI_NOTTE.map(([v, l]) => chip(l, st.notte_min === v, () => { st.notte_min = v; draw(); })))),
      D.h('div', { class: 'field' }, D.h('label', {}, '☀️ Durata del giorno'),
        D.h('div', { class: 'row wrap', style: 'gap:6px' }, TEMPI_GIORNO.map(([v, l]) => chip(l, st.giorno_min === v, () => { st.giorno_min = v; draw(); })))),
      D.h('p', { class: 'muted small', style: 'margin:0 0 8px' }, 'Se tutti hanno già agito o votato si va avanti subito, senza aspettare il tempo. "A mano" = decide chi organizza.'),
      chip(st.rivela ? '✅ Si scopre il ruolo di chi muore' : '❌ Il ruolo di chi muore resta segreto', st.rivela, () => { st.rivela = !st.rivela; draw(); }),
      D.h('button', { class: 'btn block', style: 'margin-top:12px', onclick: async () => {
        const { data, error } = await D.sb.rpc('lupus_create', { p_circle: D.S.circleId, p_settings: st });
        if (error) return D.toast(D.errMsg(error));
        D.closeSheet(); D.toast('Partita creata: l\'invito è in chat 🌙'); openPaese(data);
      } }, '🌙 Crea la partita'));
  }
  draw();
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '🌙 Notte in paese'), D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')),
    D.h('details', { class: 'card', style: 'margin-top:10px' }, D.h('summary', { style: 'font-weight:800' }, '📖 Come si gioca'),
      D.h('p', { class: 'small' }, 'Ognuno riceve un ruolo segreto. Di notte gli assassini scelgono una vittima e i ruoli speciali agiscono. Di giorno tutti discutono in chat e votano chi eliminare. Vincono i cittadini se scoprono tutti gli assassini, vincono gli assassini se diventano tanti quanti gli altri.'),
      Object.values(RUOLI).map((r) => D.h('div', { class: 'small', style: 'margin:4px 0' }, D.h('b', {}, `${r.e} ${r.n}: `), r.d))),
    box, D.h('h3', { style: 'margin-top:16px' }, '➕ Nuova partita'), form));
  const { data } = await D.sb.from('lupus_games').select('*').eq('circle_id', D.S.circleId).neq('status', 'annullata').order('created_at', { ascending: false }).limit(10);
  const games = data || [];
  fill(box, games.length ? [D.h('h3', { style: 'margin-top:14px' }, 'Partite'), D.h('div', { class: 'stack' }, games.map((g) => D.h('button', { class: 'cg-row', onclick: () => { D.closeSheet(); openPaese(g.id); } },
    D.h('div', { style: 'flex:1;text-align:left' }, D.h('b', {}, phaseText(g)), D.h('div', { class: 'small muted' }, g.players.map(nm).join(', '))), '›')))] : null);
}

/* ---------------- la partita ---------------- */
let view = null;
export async function openPaese(id) {
  closeView();
  const me = D.S.me.id;
  const root = D.h('div', { class: 'chess-root paese-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  let g = null, roles = [], acts = [], myInd = [], timer = 0, ticker = 0;
  const main = D.h('div', { class: 'paese-main' });
  fill(root, D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'),
    D.h('div', { class: 'cg-title' }, D.h('b', {}, '🌙 Notte in paese'), D.h('span', {}, 'originale Chiacchiere')), D.h('div', { style: 'width:44px' })), main);

  async function reload() {
    const [{ data }, { data: rs }] = await Promise.all([D.sb.from('lupus_games').select('*').eq('id', id).maybeSingle(), D.sb.from('lupus_roles').select('user_id,role').eq('game_id', id)]);
    if (!data) { D.toast('Partita non trovata'); return closeView(); }
    g = data; roles = rs || [];
    const [{ data: ac }, { data: ind }] = await Promise.all([
      D.sb.from('lupus_actions').select('*').eq('game_id', id).eq('round', g.round),
      D.sb.from('lupus_actions').select('round,target,result').eq('game_id', id).eq('user_id', me).eq('kind', 'indaga').order('round')]);
    acts = ac || []; myInd = ind || [];
    render();
  }
  const myRole = () => roles.find((r) => r.user_id === me)?.role;
  const alive = (u) => g.alive.includes(u);
  async function act(target) {
    const { data, error } = await D.sb.rpc('lupus_act', { p_game: id, p_target: target });
    if (error) return D.toast(D.errMsg(error), 3500);
    navigator.vibrate?.(15);
    if (data === 'avanti') D.toast(g.status === 'notte' ? '🌅 Tutti hanno agito: sorge il sole' : '⚖️ Hanno votato tutti!');
    reload();
  }

  function roleCard() {
    const r = myRole(); if (!r) return null;
    const R = RUOLI[r], mates = r === 'assassino' ? roles.filter((x) => x.role === 'assassino' && x.user_id !== me).map((x) => nm(x.user_id)) : [];
    const hidden = D.h('div', { class: 'role-hidden' }, '🃏 Tieni premuto per vedere il tuo ruolo');
    const shown = D.h('div', { class: 'role-shown' }, D.h('div', { class: 'role-emoji' }, R.e), D.h('h2', { style: 'margin:2px 0' }, R.n),
      D.h('p', { class: 'small', style: 'margin:4px 0' }, R.d), mates.length ? D.h('p', { class: 'small', style: 'margin:4px 0' }, D.h('b', {}, '🤝 Compagni: '), mates.join(', ')) : null,
      !alive(me) && g.status !== 'finita' ? D.h('p', { class: 'small', style: 'margin:4px 0' }, '👻 Sei morto: guarda pure, ma non rivelare niente!') : null);
    const card = D.h('div', { class: 'role-card' + (g.status === 'finita' ? ' open' : '') }, hidden, shown);
    const on = (e) => { e.preventDefault(); card.classList.add('open'); }, off = () => { if (g.status !== 'finita') card.classList.remove('open'); };
    card.addEventListener('pointerdown', on); card.addEventListener('pointerup', off); card.addEventListener('pointerleave', off); card.addEventListener('pointercancel', off);
    card.addEventListener('contextmenu', (e) => e.preventDefault());
    return card;
  }
  function personBtn(u, selected, onclick, extra) {
    return D.h('button', { class: 'pp-btn' + (selected ? ' on' : ''), onclick }, D.avatarEl(D.person(u), 'sm'), D.h('span', { style: 'flex:1;text-align:left' }, nm(u), u === me ? ' (tu)' : ''), extra);
  }
  function actionPanel() {
    const r = myRole();
    if (!r || !['notte', 'giorno'].includes(g.status)) return null;
    if (!alive(me)) return D.h('div', { class: 'card center muted' }, '👻 Sei fuori dal gioco: puoi guardare, ma acqua in bocca!');
    if (g.status === 'notte') {
      if (r === 'cittadino') return D.h('div', { class: 'card center' }, D.h('div', { style: 'font-size:2rem' }, '😴'), D.h('p', { class: 'muted', style: 'margin:4px 0' }, 'Dormi… aspetta che arrivi l\'alba.'));
      const kind = { assassino: 'uccidi', sceriffo: 'indaga', prostituta: 'visita', medico: 'proteggi' }[r];
      const mine = acts.find((a) => a.user_id === me && a.kind === kind);
      const mates = r === 'assassino' ? acts.filter((a) => a.kind === 'uccidi' && a.user_id !== me) : [];
      const options = g.alive.filter((u) => r === 'medico' || u !== me);
      return D.h('div', { class: 'card night' }, D.h('b', {}, `${RUOLI[r].e} ${RUOLI[r].a}`),
        mine ? D.h('div', { class: 'small', style: 'margin:4px 0' }, `✓ Hai scelto ${nm(mine.target)}. Puoi cambiare finché la notte non finisce.`) : null,
        D.h('div', { class: 'stack', style: 'margin-top:8px' }, options.map((u) => personBtn(u, mine?.target === u, () => act(u),
          mates.filter((a) => a.target === u).length ? D.h('span', { class: 'small' }, `🔪 ${mates.filter((a) => a.target === u).map((a) => nm(a.user_id)).join(', ')}`) : null))));
    }
    // giorno: votazione
    const votes = acts.filter((a) => a.kind === 'voto'), mine = votes.find((a) => a.user_id === me);
    return D.h('div', { class: 'card' }, D.h('b', {}, '⚖️ Chi eliminate oggi?'),
      D.h('div', { class: 'small muted', style: 'margin:2px 0 8px' }, `Hanno votato ${votes.length} su ${g.alive.length}. I voti sono pubblici, puoi cambiarlo fino alla fine del giorno.`),
      D.h('div', { class: 'stack' }, g.alive.map((u) => {
        const vs = votes.filter((a) => a.target === u);
        return personBtn(u, mine?.target === u, () => act(u), vs.length ? D.h('span', { class: 'vote-count' }, `${vs.length} · ${vs.map((a) => nm(a.user_id)).join(', ')}`) : null);
      })));
  }
  function render() {
    const r = myRole(), isOrg = g.created_by === me;
    const dl = g.deadline && ['notte', 'giorno'].includes(g.status);
    fill(main,
      D.h('div', { class: 'phase-banner ' + g.status }, D.h('div', { class: 'phase-t' }, phaseText(g)), dl ? D.h('div', { class: 'phase-c', 'data-dl': g.deadline }, `⏳ ${left(g.deadline)}`) : null),
      g.status === 'iscrizioni' ? D.h('div', { class: 'card' },
        D.h('b', {}, `👥 Giocatori (${g.players.length})`), D.h('div', { class: 'stack', style: 'margin-top:8px' }, g.players.map((u) => D.h('div', { class: 'rank' }, D.avatarEl(D.person(u), 'sm'), D.h('div', { style: 'flex:1;font-weight:700' }, nm(u)), u === g.created_by ? D.h('span', { class: 'small muted' }, 'organizza') : null))),
        D.h('div', { class: 'small muted', style: 'margin-top:8px' }, `Ruoli: ${g.settings.assassini ? g.settings.assassini : 'auto'} 🔪${g.settings.sceriffo !== false ? ' · ⭐' : ''}${g.settings.prostituta !== false ? ' · 💋' : ''}${g.settings.medico ? ' · 🩺' : ''} · notte ${TEMPI_NOTTE.find((t) => t[0] === g.settings.notte_min)?.[1] || 'a mano'} · giorno ${TEMPI_GIORNO.find((t) => t[0] === g.settings.giorno_min)?.[1] || 'a mano'}`),
        !g.players.includes(me) ? D.h('button', { class: 'btn block', style: 'margin-top:10px', onclick: async () => { const { error } = await D.sb.rpc('lupus_join', { p_game: id, p_in: true }); if (error) D.toast(D.errMsg(error)); reload(); } }, '✋ Gioco anch\'io')
          : !isOrg ? D.h('button', { class: 'btn plain block', style: 'margin-top:10px', onclick: async () => { await D.sb.rpc('lupus_join', { p_game: id, p_in: false }); reload(); } }, 'Non gioco più') : null,
        isOrg ? D.h('button', { class: 'btn block', style: 'margin-top:10px', disabled: g.players.length < 4, onclick: async () => {
          const { error } = await D.sb.rpc('lupus_start', { p_game: id }); if (error) return D.toast(D.errMsg(error), 3500); reload();
        } }, g.players.length < 4 ? `Servono almeno 4 giocatori (${g.players.length}/4)` : '🌙 Distribuisci i ruoli e inizia') : null) : null,
      r ? roleCard() : null,
      actionPanel(),
      r === 'sceriffo' && myInd.some((x) => x.result) ? D.h('div', { class: 'card' }, D.h('b', {}, '⭐ Le tue indagini'),
        myInd.filter((x) => x.result).map((x) => D.h('div', { class: 'small', style: 'margin-top:4px' }, `Notte ${x.round}: ${nm(x.target)} → `,
          D.h('b', {}, x.result === 'assassino' ? '🔪 È un assassino!' : x.result === 'bloccato' ? '💋 eri bloccato, niente indagine' : '😇 innocente')))) : null,
      g.status !== 'iscrizioni' ? D.h('div', { class: 'card' }, D.h('b', {}, '👥 In paese'),
        D.h('div', { class: 'row wrap', style: 'gap:6px;margin-top:8px' }, g.players.map((u) => {
          const rr = g.status === 'finita' ? roles.find((x) => x.user_id === u)?.role : null;
          return D.h('span', { class: 'pp-chip' + (alive(u) ? '' : ' dead') }, alive(u) ? '' : '💀 ', nm(u), rr ? ` ${RUOLI[rr].e}` : '');
        }))) : null,
      g.log.length ? D.h('div', { class: 'card' }, D.h('b', {}, '📜 Il racconto'),
        [...g.log].reverse().map((x) => D.h('div', { class: 'log-row' }, x.t))) : null,
      isOrg && ['notte', 'giorno'].includes(g.status) ? D.h('button', { class: 'btn ghost block', onclick: async () => {
        if (!(await D.askConfirm('⏭ Andare avanti?', g.status === 'notte' ? 'Si chiude la notte con le scelte fatte finora.' : 'Si chiude il giorno e si contano i voti.', 'Sì, avanti'))) return;
        const { error } = await D.sb.rpc('lupus_next', { p_game: id }); if (error) D.toast(D.errMsg(error)); reload();
      } }, g.status === 'notte' ? '⏭ Fai sorgere il sole' : '⏭ Chiudi il giorno e conta i voti') : null,
      isOrg && !['finita', 'annullata'].includes(g.status) ? D.h('button', { class: 'linkbtn small', style: 'display:block;margin:12px auto', onclick: async () => {
        if (!(await D.askConfirm('Annullare la partita?', 'Finisce per tutti.', 'Sì, annulla'))) return;
        await D.sb.rpc('lupus_cancel', { p_game: id }); closeView();
      } }, 'Annulla la partita') : null);
  }
  ticker = setInterval(() => { for (const el of root.querySelectorAll('[data-dl]')) el.textContent = `⏳ ${left(el.dataset.dl)}`; }, 1000);
  view = { id, root, reloadSoon: () => { clearTimeout(timer); timer = setTimeout(reload, 300); }, stop: () => { clearInterval(ticker); clearTimeout(timer); } };
  await reload();
}
function closeView() {
  if (!view) return;
  view.stop(); view.root.remove(); view = null; document.body.style.overflow = '';
}
