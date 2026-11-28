// ⚽ Torneo di calcio balilla: iscrizioni, coppie (scelte o casuali portiere+attaccante),
// girone all'italiana (3 vittoria · 2 vinta ai vantaggi · 1 persa ai vantaggi · 0 sconfitta),
// classifica e fase finale a eliminazione diretta (1ª contro ultima qualificata, ecc.).
let D;
export function initBalilla(deps) { D = deps; }

const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter(Boolean));
const RUOLI = { portiere: '🧤 Portiere', attaccante: '⚽ Attaccante', indifferente: '🤷 Va bene tutto' };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const short = (id) => (id ? D.person(id).username : '—');

/* ---------------- logica ---------------- */
// coppie: prima quelle scelte, poi portieri con attaccanti a caso, poi chi è indifferente
export function formaCoppie(players) {
  const byId = new Map(players.map((p) => [p.user_id, p]));
  const taken = new Set(), pairs = [];
  const add = (x, y) => {
    taken.add(x.user_id); taken.add(y.user_id);
    let por = x, att = y;
    if (x.role === 'attaccante' || y.role === 'portiere') { por = y; att = x; }
    pairs.push({ portiere: por.user_id, attaccante: att.user_id });
  };
  for (const p of players) { // reciproche
    const q = p.partner && byId.get(p.partner);
    if (q && q.partner === p.user_id && !taken.has(p.user_id) && !taken.has(q.user_id)) add(p, q);
  }
  for (const p of players) { // scelte da uno solo, se l'altro è libero e non ha scelto nessuno
    const q = p.partner && byId.get(p.partner);
    if (q && !q.partner && !taken.has(p.user_id) && !taken.has(q.user_id)) add(p, q);
  }
  const free = (r) => shuffle(players.filter((p) => !taken.has(p.user_id) && p.role === r));
  const por = free('portiere'), att = free('attaccante'), ind = free('indifferente');
  while (por.length && att.length) add(por.pop(), att.pop());
  while (por.length && ind.length) add(por.pop(), ind.pop());
  while (att.length && ind.length) add(ind.pop(), att.pop());
  const rest = [...ind, ...por, ...att];
  while (rest.length >= 2) add(rest.shift(), rest.shift());
  return { pairs: shuffle(pairs), fuori: rest.map((p) => p.user_id) };
}
// calendario all'italiana (metodo di Berger): ogni coppia incontra tutte le altre una volta
export function calendario(n) {
  const t = Array.from({ length: n % 2 ? n + 1 : n }, (_, i) => i + 1), m = t.length, out = [];
  for (let r = 0; r < m - 1; r++) {
    let pos = 0;
    for (let i = 0; i < m / 2; i++) {
      const a = t[i], b = t[m - 1 - i];
      if (a <= n && b <= n) out.push({ round: r, pos: pos++, a: r % 2 ? b : a, b: r % 2 ? a : b });
    }
    t.splice(1, 0, t.pop());
  }
  return out;
}
const ptsFor = (m, team) => (m.result == null ? null : m.a === team ? m.result : 3 - m.result);
export function classifica(teams, matches) {
  const g = matches.filter((m) => m.phase === 'girone');
  const rows = teams.map((t) => {
    let pts = 0, pg = 0, v3 = 0;
    for (const m of g) if ((m.a === t.num || m.b === t.num) && m.result != null) { const p = ptsFor(m, t.num); pts += p; pg++; if (p === 3) v3++; }
    return { ...t, pts, pg, v3 };
  });
  const h2h = (x, y) => { const m = g.find((m) => (m.a === x.num && m.b === y.num) || (m.a === y.num && m.b === x.num)); return m && m.result != null ? ptsFor(m, x.num) - ptsFor(m, y.num) : 0; };
  rows.sort((x, y) => y.pts - x.pts || h2h(y, x) || y.v3 - x.v3 || x.num - y.num);
  rows.forEach((r, i) => (r.pos = i + 1));
  return rows;
}
// ordine del tabellone: 1 e 2 si possono incontrare solo in finale
function seedOrder(size) {
  let o = [1, 2];
  while (o.length < size) { const s = o.length * 2 + 1; o = o.flatMap((x) => [x, s - x]); }
  return o;
}
const nextPow2 = (n) => { let s = 2; while (s < n) s *= 2; return s; };
const roundName = (r, R) => ['Finale', 'Semifinali', 'Quarti', 'Ottavi', 'Sedicesimi'][R - 1 - r] || `Turno ${r + 1}`;

/* ---------------- elenco e nuovo torneo ---------------- */
export async function openTornei() {
  const box = D.h('div', {}, D.h('p', { class: 'muted center' }, 'Carico…'));
  D.openSheet(D.h('div', {}, D.h('div', { class: 'row' }, D.h('h2', { style: 'margin:0;flex:1' }, '⚽ Tornei di calcio balilla'),
    D.h('button', { class: 'btn plain', onclick: D.closeSheet }, '✕')), box));
  const { data } = await D.sb.from('foos_tournaments').select('*').eq('circle_id', D.S.circleId).order('created_at', { ascending: false }).limit(20);
  const STATO = { iscrizioni: '📝 Iscrizioni aperte', girone: '🔁 Girone in corso', finale: '🔥 Fase finale', finito: '🏆 Finito' };
  fill(box,
    D.h('button', { class: 'btn block', onclick: nuovoTorneo }, '➕ Nuovo torneo'),
    (data || []).length ? D.h('div', { class: 'stack', style: 'margin-top:14px' }, data.map((t) => D.h('button', { class: 'cg-row', onclick: () => { D.closeSheet(); openTorneo(t.id); } },
      D.h('div', { style: 'flex:1;text-align:left' }, D.h('b', {}, t.name), D.h('div', { class: 'small muted' }, STATO[t.status])), '›')))
      : D.h('p', { class: 'muted small center', style: 'margin-top:14px' }, 'Ancora nessun torneo. Organizzane uno!'));
}
function nuovoTorneo() {
  const name = D.h('input', { class: 'input', maxlength: 60, value: 'Torneo di calcio balilla' });
  const err = D.h('div', { class: 'error' });
  D.openSheet(D.h('div', {}, D.h('h2', {}, '⚽ Nuovo torneo'),
    D.h('div', { class: 'field' }, D.h('label', {}, 'Nome del torneo'), name),
    D.h('p', { class: 'muted small' }, 'Si apre l\'iscrizione nella cerchia: chi vuole giocare si iscrive come portiere o attaccante e può scegliersi il compagno. Poi formi le coppie e parte il girone all\'italiana.'),
    err,
    D.h('button', { class: 'btn block', onclick: async () => {
      const n = name.value.trim(); if (!n) return (err.textContent = 'Dai un nome al torneo.');
      const { data, error } = await D.sb.from('foos_tournaments').insert({ circle_id: D.S.circleId, created_by: D.S.me.id, name: n }).select().single();
      if (error) return (err.textContent = D.errMsg(error));
      await D.sb.from('messages').insert({ circle_id: D.S.circleId, user_id: D.S.me.id, body: `⚽ ${n}: iscrizioni aperte!`, foos_id: data.id });
      D.closeSheet(); openTorneo(data.id);
    } }, '📣 Apri le iscrizioni'),
    D.h('button', { class: 'btn plain block', onclick: openTornei }, 'Indietro')));
}

/* ---------------- card in chat ---------------- */
const cards = new Map();
export function torneoChatCard(id) {
  const box = D.h('div', { class: 'chess-card' }, D.h('p', { class: 'muted small' }, '⚽ Carico il torneo…'));
  if (!cards.has(id)) cards.set(id, new Set());
  cards.get(id).add(box); fillCard(box, id);
  return box;
}
async function fillCard(box, id) {
  const T = await load(id);
  if (!T) return fill(box, D.h('p', { class: 'muted small' }, '⚽ Torneo non più disponibile'));
  const me = D.S.me.id, iscritto = T.players.some((p) => p.user_id === me);
  let info;
  if (T.t.status === 'iscrizioni') info = `📝 Iscrizioni aperte · ${T.players.length} iscritti${iscritto ? ' (anche tu ✓)' : ''}`;
  else if (T.t.status === 'finito') info = `🏆 Campioni: ${teamName(T, T.t.champion)}`;
  else {
    const cl = classifica(T.teams, T.matches);
    info = T.t.status === 'girone' ? `🔁 Girone: ${T.matches.filter((m) => m.phase === 'girone' && m.result != null).length}/${T.matches.filter((m) => m.phase === 'girone').length} partite · in testa ${teamName(T, cl[0]?.num)}` : '🔥 Fase finale in corso';
  }
  fill(box, D.h('div', { class: 'cc-head' }, D.h('b', {}, '⚽ ' + T.t.name)),
    D.h('div', { class: 'small', style: 'margin:4px 0 8px' }, info),
    D.h('button', { class: 'btn small ' + (T.t.status === 'iscrizioni' && !iscritto ? '' : 'ghost'), onclick: () => openTorneo(id) },
      T.t.status === 'iscrizioni' && !iscritto ? '✋ Partecipo' : 'Apri il torneo'));
}
export function refreshTorneo(id) {
  const set = cards.get(id);
  if (set) for (const el of [...set]) { if (!el.isConnected) set.delete(el); else fillCard(el, id); }
  if (view && view.id === id) view.reloadSoon();
}

/* ---------------- dati ---------------- */
async function load(id) {
  const [t, p, te, m] = await Promise.all([
    D.sb.from('foos_tournaments').select('*').eq('id', id).maybeSingle(),
    D.sb.from('foos_players').select('*').eq('tournament_id', id).order('joined_at'),
    D.sb.from('foos_teams').select('*').eq('tournament_id', id).order('num'),
    D.sb.from('foos_matches').select('*').eq('tournament_id', id).order('round').order('pos'),
  ]);
  if (!t.data) return null;
  return { t: t.data, players: p.data || [], teams: te.data || [], matches: m.data || [] };
}
function teamName(T, num) {
  const t = T.teams.find((x) => x.num === num);
  return t ? `${short(t.portiere)} & ${short(t.attaccante)}` : '—';
}
function teamEl(T, num, opts = {}) {
  const t = T.teams.find((x) => x.num === num);
  if (!t) return D.h('span', { class: 'muted' }, opts.bye ? 'passa il turno' : 'da decidere');
  return D.h('span', { class: 'tb-team' }, D.h('b', { class: 'tb-num' }, num), ` 🧤${short(t.portiere)} ⚽${short(t.attaccante)}`);
}

/* ---------------- schermata del torneo ---------------- */
let view = null;
export async function openTorneo(id) {
  closeView();
  const root = D.h('div', { class: 'chess-root tb-root' });
  document.body.append(root); document.body.style.overflow = 'hidden';
  const me = D.S.me.id;
  let T = null, tab = null, timer = null;
  let bozza = null;     // coppie in preparazione {pairs, fuori, sel}
  let finaleBozza = null; // {q, slots, sel}

  async function reload() { T = await load(id); if (!T) { D.toast('Torneo non trovato'); return closeView(); } render(); }
  const isOrg = () => T.t.created_by === me;

  function render() {
    const st = T.t.status;
    if (!tab) tab = st === 'iscrizioni' ? 'iscritti' : st === 'girone' ? 'girone' : 'finale';
    const tabs = st === 'iscrizioni' ? null : D.h('div', { class: 'seg three', style: 'margin:10px 0' },
      [['girone', '🔁 Girone'], ['classifica', '📊 Classifica'], ['finale', '🏆 Finale']].map(([k, l]) =>
        D.h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; render(); } }, l)));
    let body;
    if (st === 'iscrizioni') body = viewIscrizioni();
    else if (tab === 'girone') body = viewGirone();
    else if (tab === 'classifica') body = viewClassifica();
    else body = viewFinale();
    fill(root,
      D.h('div', { class: 'cg-top' }, D.h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: closeView }, '✕'),
        D.h('div', { class: 'cg-title' }, D.h('b', {}, '⚽ ' + T.t.name), D.h('span', {}, 'calcio balilla · originale Chiacchiere')),
        D.h('div', { style: 'width:44px' })),
      D.h('div', { class: 'cg-main' },
        st === 'finito' ? D.h('div', { class: 'card hero center' }, D.h('div', { style: 'font-size:2.4rem' }, '🏆'), D.h('h2', { style: 'margin:4px 0' }, 'Campioni!'), D.h('b', {}, teamName(T, T.t.champion))) : null,
        tabs,
        isOrg() && (st === 'girone' || st === 'finale') ? D.h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin-bottom:10px' },
          D.h('span', { class: 'small', style: 'font-weight:800' }, '⏱️ Tempo per presentarsi al tavolo:'),
          [[0, 'Off'], [3, '3′'], [5, '5′'], [10, '10′'], [15, '15′']].map(([v, l]) => D.h('button', { class: 'chip' + (T.t.call_minutes === v ? ' on' : ''), onclick: async () => {
            await D.sb.from('foos_tournaments').update({ call_minutes: v }).eq('id', id); reload();
          } }, l))) : null,
        body,
        isOrg() ? D.h('div', { class: 'center', style: 'margin-top:20px' }, D.h('button', { class: 'linkbtn small', onclick: async () => {
          if (!(await D.askConfirm('🗑️ Cancellare il torneo?', 'Spariscono coppie, risultati e classifica per tutti.', 'Sì, cancella'))) return;
          await D.sb.from('foos_tournaments').delete().eq('id', id); closeView(); D.toast('Torneo cancellato');
        } }, 'Cancella il torneo')) : null));
  }

  /* ---- iscrizioni e coppie ---- */
  function viewIscrizioni() {
    const mine = T.players.find((p) => p.user_id === me);
    const upd = async (patch) => { const { error } = await D.sb.from('foos_players').update(patch).eq('tournament_id', id).eq('user_id', me); if (error) D.toast(D.errMsg(error)); reload(); };
    const chip = (label, on, onclick) => D.h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick }, label);
    const others = T.players.filter((p) => p.user_id !== me);
    const partnerOf = (uid) => T.players.find((p) => p.user_id === uid)?.partner;
    const myBox = !mine
      ? D.h('div', { class: 'card center' }, D.h('p', { style: 'margin-top:0' }, 'Vuoi giocare? Iscriviti e scegli il ruolo.'),
          D.h('div', { class: 'row wrap', style: 'gap:6px;justify-content:center' }, Object.entries(RUOLI).map(([k, l]) => D.h('button', { class: 'btn small ghost', onclick: async () => {
            const { error } = await D.sb.from('foos_players').insert({ tournament_id: id, user_id: me, role: k });
            if (error) D.toast(D.errMsg(error)); else D.toast('Iscritto! ⚽'); reload();
          } }, l))))
      : D.h('div', { class: 'card' }, D.h('b', {}, '✅ Sei iscritto'),
          D.h('div', { class: 'field', style: 'margin-top:8px' }, D.h('label', {}, 'Il tuo ruolo'),
            D.h('div', { class: 'row wrap', style: 'gap:6px' }, Object.entries(RUOLI).map(([k, l]) => chip(l, mine.role === k, () => upd({ role: k }))))),
          D.h('div', { class: 'field' }, D.h('label', {}, 'Il tuo compagno'),
            D.h('div', { class: 'row wrap', style: 'gap:6px' },
              chip('🎲 Compagno casuale', !mine.partner, () => upd({ partner: null })),
              others.map((p) => chip(`${D.person(p.user_id).avatar} ${short(p.user_id)}${partnerOf(p.user_id) === me ? ' 💞' : ''}`, mine.partner === p.user_id, () => upd({ partner: p.user_id })))),
            D.h('p', { class: 'muted small', style: 'margin:6px 0 0' }, '💞 = ha scelto te. La coppia è sicura se vi scegliete a vicenda.')),
          D.h('button', { class: 'linkbtn small', onclick: async () => { await D.sb.from('foos_players').delete().eq('tournament_id', id).eq('user_id', me); reload(); } }, 'Non partecipo più'));
    const list = D.h('div', { class: 'card' }, D.h('b', {}, `👥 Iscritti (${T.players.length})`),
      T.players.length ? T.players.map((p) => D.h('div', { class: 'rank' }, D.avatarEl(D.person(p.user_id), 'sm'),
        D.h('div', { style: 'flex:1;font-weight:700' }, short(p.user_id)),
        D.h('div', { class: 'small muted' }, RUOLI[p.role] + (p.partner ? ` · con ${short(p.partner)}` : ''))))
        : D.h('p', { class: 'muted small' }, 'Ancora nessuno.'));
    return [myBox, list, isOrg() ? viewBozzaCoppie() : D.h('p', { class: 'muted small center' }, `Quando ci siete tutti, ${short(T.t.created_by)} forma le coppie e si parte.`)];
  }
  function viewBozzaCoppie() {
    if (!bozza) return D.h('div', { class: 'card' }, D.h('b', {}, '🎲 Pronti?'),
      D.h('p', { class: 'muted small' }, 'Le coppie scelte restano insieme; gli altri vengono accoppiati a caso, portiere con attaccante.'),
      D.h('button', { class: 'btn block', onclick: () => {
        if (T.players.length < 4) return D.toast('Servono almeno 4 iscritti (2 coppie)', 3000);
        bozza = { ...formaCoppie(T.players), sel: null }; render();
      } }, '🎲 Forma le coppie'));
    const tap = (i, k) => { // tocca due giocatori per scambiarli
      const cur = { i, k };
      if (!bozza.sel) { bozza.sel = cur; return render(); }
      const a = bozza.sel; bozza.sel = null;
      const get = (s) => (s.i === -1 ? bozza.fuori[s.k] : bozza.pairs[s.i][s.k]);
      const set = (s, v) => (s.i === -1 ? (bozza.fuori[s.k] = v) : (bozza.pairs[s.i][s.k] = v));
      const va = get(a), vb = get(cur); set(a, vb); set(cur, va); render();
    };
    const pl = (i, k, uid) => D.h('button', { class: 'chip on' + (bozza.sel && bozza.sel.i === i && bozza.sel.k === k ? ' pick' : ''), onclick: () => tap(i, k) },
      (k === 'portiere' ? '🧤 ' : k === 'attaccante' ? '⚽ ' : '') + short(uid));
    return D.h('div', { class: 'card' }, D.h('b', {}, `🤝 Coppie (${bozza.pairs.length})`),
      D.h('p', { class: 'muted small', style: 'margin:4px 0 8px' }, 'Tocca due giocatori per scambiarli di posto.'),
      bozza.pairs.map((p, i) => D.h('div', { class: 'row', style: 'gap:6px;margin:6px 0;align-items:center' }, D.h('b', { class: 'tb-num' }, i + 1), pl(i, 'portiere', p.portiere), pl(i, 'attaccante', p.attaccante))),
      bozza.fuori.length ? D.h('div', { class: 'small', style: 'margin-top:8px' }, '🙋 Senza compagno (resta fuori, o scambialo con qualcuno): ', bozza.fuori.map((u, k) => pl(-1, k, u))) : null,
      D.h('div', { class: 'row', style: 'gap:8px;margin-top:12px' },
        D.h('button', { class: 'btn ghost', style: 'flex:1', onclick: () => { bozza = { ...formaCoppie(T.players), sel: null }; render(); } }, '🎲 Rimescola'),
        D.h('button', { class: 'btn', style: 'flex:1', onclick: iniziaGirone }, '▶️ Inizia il girone')));
  }
  async function iniziaGirone() {
    const n = bozza.pairs.length;
    if (n < 2) return D.toast('Servono almeno 2 coppie');
    if (n > 32) return D.toast('Massimo 32 coppie');
    if (!(await D.askConfirm('▶️ Iniziare il girone?', `${n} coppie, ${n * (n - 1) / 2} partite: ognuno incontra tutti una volta. Dopo le iscrizioni si chiudono.`, 'Via!'))) return;
    await D.sb.from('foos_teams').delete().eq('tournament_id', id);
    await D.sb.from('foos_matches').delete().eq('tournament_id', id);
    const teams = bozza.pairs.map((p, i) => ({ tournament_id: id, num: i + 1, portiere: p.portiere, attaccante: p.attaccante }));
    const e1 = (await D.sb.from('foos_teams').insert(teams)).error;
    const e2 = (await D.sb.from('foos_matches').insert(calendario(n).map((m) => ({ tournament_id: id, phase: 'girone', ...m })))).error;
    if (e1 || e2) return D.toast(D.errMsg(e1 || e2));
    await D.sb.from('foos_tournaments').update({ status: 'girone', qualify: Math.min(6, n) }).eq('id', id);
    D.sb.from('messages').insert({ circle_id: T.t.circle_id, user_id: me, body: `⚽ ${T.t.name}: coppie fatte, si gioca!`, foos_id: id }).then(() => {});
    bozza = null; tab = 'girone'; reload();
  }

  /* ---- girone all'italiana ---- */
  function viewGirone() {
    const n = T.teams.length, g = T.matches.filter((m) => m.phase === 'girone');
    const cl = classifica(T.teams, T.matches), posOf = new Map(cl.map((r) => [r.num, r]));
    const find = (x, y) => g.find((m) => (m.a === x && m.b === y) || (m.a === y && m.b === x));
    const head = D.h('tr', {}, D.h('th', { class: 'tb-c' }, 'COPPIE'), D.h('th', {}, ''),
      T.teams.map((t) => D.h('th', {}, t.num)), D.h('th', {}, 'PUNTI'), D.h('th', {}, 'CLAS.'));
    const rows = T.teams.map((t) => D.h('tr', {},
      D.h('td', { class: 'tb-c' }, short(t.portiere), D.h('br'), short(t.attaccante)), D.h('th', {}, t.num),
      T.teams.map((o) => {
        if (o.num === t.num) return D.h('td', { class: 'x' });
        const m = find(t.num, o.num), p = m ? ptsFor(m, t.num) : null;
        return D.h('td', { class: 'cell' + (p == null ? '' : ' p' + p), onclick: () => m && matchSheet(m) }, p ?? (m?.proposed != null ? '⏳' : m?.called_at ? '📣' : ''));
      }),
      D.h('td', { class: 'tot' }, posOf.get(t.num).pts), D.h('td', { class: 'tot' }, posOf.get(t.num).pg ? posOf.get(t.num).pos + 'ª' : '')));
    const done = g.filter((m) => m.result != null).length;
    const turni = [...new Set(g.map((m) => m.round))];
    const nextRound = turni.find((r) => g.some((m) => m.round === r && m.result == null));
    return [
      D.h('div', { class: 'card', style: 'padding:10px' }, D.h('b', {}, 'Schema gara girone all\'italiana'),
        D.h('div', { class: 'tb-scroll' }, D.h('table', { class: 'tb-grid' }, head, rows)),
        D.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Tocca una casella per segnare il risultato. 3 vittoria · 2 vinta ai vantaggi · 1 persa ai vantaggi · 0 sconfitta.')),
      D.h('div', { class: 'card' }, D.h('b', {}, `📅 Partite (${done}/${g.length})`),
        turni.map((r) => D.h('div', { style: 'margin-top:10px' }, D.h('div', { class: 'small muted', style: 'font-weight:800' }, `${r + 1}° turno${r === nextRound ? ' · si gioca ora' : ''}`),
          g.filter((m) => m.round === r).map((m) => D.h('button', { class: 'tb-match' + (m.result == null ? '' : ' done'), onclick: () => matchSheet(m) },
            D.h('span', { class: 'tb-side' + (m.result >= 2 ? ' win' : '') }, teamEl(T, m.a)),
            D.h('b', { class: 'tb-score' }, m.result == null ? 'vs' : `${m.result}–${3 - m.result}`),
            D.h('span', { class: 'tb-side r' + (m.result != null && m.result <= 1 ? ' win' : '') }, teamEl(T, m.b)), badge(m)))))),
      T.t.status === 'girone' ? D.h('button', { class: 'btn block', onclick: () => { tab = 'finale'; render(); } }, done === g.length ? '🏆 Vai alla fase finale' : '🏆 Fase finale') : null,
    ];
  }
  // ---- scheda di una partita: chiamata al tavolo, "ci siamo", risultato proposto e confermato ----
  function mySide(m) {
    const t = (n) => T.teams.find((x) => x.num === n);
    if (t(m.a) && [t(m.a).portiere, t(m.a).attaccante].includes(me)) return 'a';
    if (t(m.b) && [t(m.b).portiere, t(m.b).attaccante].includes(me)) return 'b';
    return null;
  }
  const deadline = (m) => (m.called_at && T.t.call_minutes ? Date.parse(m.called_at) + T.t.call_minutes * 60000 : null);
  const fmtLeft = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function badge(m) {
    if (m.result != null) return m.tavolino ? D.h('div', { class: 'tb-badge' }, '⚖️ a tavolino') : null;
    if (m.proposed != null) return D.h('div', { class: 'tb-badge wait' }, '⏳ risultato da confermare');
    if (m.called_at) {
      const dl = deadline(m);
      return D.h('div', { class: 'tb-badge call' }, '📣 chiamata al tavolo', m.a_ready ? ' · ✋A' : '', m.b_ready ? ' · ✋B' : '',
        dl ? D.h('span', { 'data-deadline': dl }, ' · ' + fmtLeft(dl - Date.now())) : null);
    }
    return null;
  }
  function descr(m, v) {
    return m.phase === 'girone' ? (v >= 2 ? `vince ${m.a}${v === 2 ? ' ai vantaggi' : ''} (${v}–${3 - v})` : `vince ${m.b}${v === 1 ? ' ai vantaggi' : ''} (${v}–${3 - v})`) : `passa ${v} · ${teamName(T, v)}`;
  }
  function matchSheet(m0) {
    const m = T.matches.find((x) => x.id === m0.id) || m0;
    const phaseOpen = (m.phase === 'girone' && T.t.status === 'girone') || (m.phase === 'finale' && T.t.status === 'finale');
    if (m.a == null || m.b == null) return D.toast(m.round === 0 && m.phase === 'finale' ? 'Questa coppia passa il turno' : 'Aspetta i vincitori dei turni prima');
    const side = mySide(m), org = isOrg();
    const rpc = async (fn, args, ok) => { const { data, error } = await D.sb.rpc(fn, args); D.closeSheet(); if (error) return D.toast(D.errMsg(error), 3500); if (ok) D.toast(typeof ok === 'function' ? ok(data) : ok); reload(); };
    const A = teamName(T, m.a), B = teamName(T, m.b), parts = [];
    parts.push(D.h('h2', { class: 'center', style: 'margin-bottom:2px' }, `${m.a} contro ${m.b}`), D.h('p', { class: 'center muted', style: 'margin-top:0' }, `${A}  vs  ${B}`));
    if (m.result != null) {
      parts.push(D.h('div', { class: 'card center' }, D.h('b', {}, '✅ ' + descr(m, m.result)), m.tavolino ? D.h('div', { class: 'small muted' }, '⚖️ assegnata a tavolino') : null));
      if (org && m.phase === 'girone' && phaseOpen) parts.push(D.h('button', { class: 'btn plain block', onclick: () => rpc('foos_reset', { p_match: m.id }, 'Risultato cancellato') }, 'Cancella il risultato (arbitro)'));
    } else if (phaseOpen) {
      // chiamata al tavolo
      if (m.called_at) {
        const dl = deadline(m);
        parts.push(D.h('div', { class: 'card' }, D.h('b', {}, '📣 Chiamata al tavolo'),
          dl ? D.h('div', { class: 'small' }, '⏱️ Tempo per presentarsi: ', D.h('b', { 'data-deadline': dl }, fmtLeft(dl - Date.now()))) : D.h('div', { class: 'small muted' }, 'Senza limite di tempo'),
          D.h('div', { class: 'small', style: 'margin-top:4px' }, `${m.a_ready ? '✋' : '⌛'} ${A}`), D.h('div', { class: 'small' }, `${m.b_ready ? '✋' : '⌛'} ${B}`),
          side && !m[side + '_ready'] ? D.h('button', { class: 'btn block', style: 'margin-top:8px', onclick: () => rpc('foos_ready', { p_match: m.id }, 'Ci siete! ✋') }, '✋ Ci siamo!') : null));
      }
      if (org) parts.push(D.h('button', { class: 'btn ghost block', style: 'margin-bottom:8px', onclick: () => rpc('foos_call', { p_match: m.id }, 'Chiamati! Arriva la notifica 📣') }, m.called_at ? '📣 Richiama al tavolo' : '📣 Chiama al tavolo'));
      // risultato proposto
      if (m.proposed != null) {
        const theirs = side && mySide({ ...m }) && side !== (T.teams.some((t) => t.num === m.a && [t.portiere, t.attaccante].includes(m.proposed_by)) ? 'a' : 'b');
        parts.push(D.h('div', { class: 'card', style: 'background:#fff4d6' }, D.h('b', {}, `⏳ ${D.person(m.proposed_by).username} dice: ${descr(m, m.proposed)}`),
          theirs || org ? D.h('div', { class: 'row', style: 'gap:8px;margin-top:8px' },
            D.h('button', { class: 'btn', style: 'flex:1', onclick: () => rpc('foos_confirm', { p_match: m.id, p_accept: true }, 'Confermato ✓') }, '✅ Confermo'),
            D.h('button', { class: 'btn plain', style: 'flex:1', onclick: () => rpc('foos_confirm', { p_match: m.id, p_accept: false }, 'Rifiutato') }, '❌ Non è così'))
            : D.h('div', { class: 'small muted', style: 'margin-top:4px' }, 'In attesa che l\'altra coppia confermi.')));
      }
      if (side || org) {
        const vals = m.phase === 'girone' ? [[3, `🏆 Vince ${A} (3–0)`], [2, `Vince ${A} ai vantaggi (2–1)`], [1, `Vince ${B} ai vantaggi (1–2)`], [0, `🏆 Vince ${B} (0–3)`]]
          : [[m.a, `🏆 Vince ${m.a} · ${A}`], [m.b, `🏆 Vince ${m.b} · ${B}`]];
        parts.push(D.h('div', { class: 'small muted', style: 'margin-top:6px' }, org ? 'Segna il risultato (da arbitro vale subito):' : 'Segna il risultato (poi lo conferma l\'altra coppia):'),
          vals.map(([v, l]) => D.h('button', { class: 'btn ghost block', style: 'margin-top:6px', onclick: () => rpc('foos_propose', { p_match: m.id, p_val: v }, (d) => (d === 'fatto' ? 'Risultato segnato ✓' : 'Inviato! Ora conferma l\'altra coppia ⏳')) }, l)));
      } else parts.push(D.h('p', { class: 'muted small center' }, 'Il risultato lo segnano le due coppie (o l\'organizzatore).'));
    }
    parts.push(D.h('button', { class: 'btn plain block', style: 'margin-top:6px', onclick: D.closeSheet }, 'Chiudi'));
    D.openSheet(D.h('div', {}, parts.flat()));
  }
  function viewClassifica() {
    const cl = classifica(T.teams, T.matches), q = T.t.status === 'girone' ? T.t.qualify : null;
    return D.h('div', { class: 'card' }, D.h('b', {}, '📊 Classifica del girone'),
      cl.map((r, i) => D.h('div', { class: 'rank' + (q && i === q - 1 ? ' tb-cut' : '') },
        D.h('div', { class: 'pos' }, ['🥇', '🥈', '🥉'][i] || i + 1), D.h('div', { style: 'flex:1' }, teamEl(T, r.num)),
        D.h('div', { style: 'text-align:right' }, D.h('b', {}, `${r.pts} pt`), D.h('div', { class: 'small muted' }, `${r.pg} giocate`)))),
      q ? D.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, `Passano alla fase finale le prime ${q} (si può cambiare).`) : null);
  }

  /* ---- fase finale ---- */
  function viewFinale() {
    if (T.t.status === 'girone') return viewPreparaFinale();
    const f = T.matches.filter((m) => m.phase === 'finale');
    const R = Math.max(...f.map((m) => m.round)) + 1;
    return D.h('div', { class: 'tb-bracket' }, Array.from({ length: R }, (_, r) => D.h('div', { class: 'tb-col' },
      D.h('div', { class: 'small muted', style: 'font-weight:800;margin-bottom:6px' }, roundName(r, R)),
      f.filter((m) => m.round === r).map((m) => {
        const bye = r === 0 && (m.a == null || m.b == null);
        if (bye && m.a == null && m.b == null) return null;
        const side = (num, other) => D.h('div', { class: 'tb-bslot' + (m.result != null && m.result === num ? ' win' : m.result != null ? ' lose' : '') }, teamEl(T, num, { bye: r === 0 && num == null && other != null }));
        return D.h('button', { class: 'tb-bm', onclick: () => matchSheet(m) }, side(m.a, m.b), side(m.b, m.a), badge(m));
      }))));
  }
  function viewPreparaFinale() {
    const cl = classifica(T.teams, T.matches), n = cl.length;
    const g = T.matches.filter((m) => m.phase === 'girone'), mancano = g.filter((m) => m.result == null).length;
    if (!finaleBozza) {
      const q = Math.min(T.t.qualify || 6, n);
      finaleBozza = { q, slots: null, sel: null };
    }
    const fb = finaleBozza;
    const build = () => { const size = nextPow2(fb.q); fb.slots = seedOrder(size).map((s) => (s <= fb.q ? cl[s - 1].num : null)); fb.sel = null; };
    if (!fb.slots) build();
    const opts = []; for (let k = 2; k <= Math.min(16, n); k++) opts.push(k);
    const tap = (i) => {
      if (fb.sel == null) { fb.sel = i; return render(); }
      [fb.slots[fb.sel], fb.slots[i]] = [fb.slots[i], fb.slots[fb.sel]]; fb.sel = null; render();
    };
    const seedOf = (num) => cl.findIndex((r) => r.num === num) + 1;
    const pairs = []; for (let i = 0; i < fb.slots.length; i += 2) pairs.push([i, i + 1]);
    return [
      mancano ? D.h('div', { class: 'card', style: 'background:#fff4d6' }, `⚠️ Mancano ancora ${mancano} partite del girone: la classifica può cambiare.`) : null,
      D.h('div', { class: 'card' }, D.h('b', {}, 'Quante coppie passano?'),
        D.h('div', { class: 'row wrap', style: 'gap:6px;margin-top:8px' }, opts.map((k) => D.h('button', { class: 'chip' + (fb.q === k ? ' on' : ''), onclick: () => { fb.q = k; build(); render(); } }, k))),
        D.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'La 1ª gioca contro l\'ultima qualificata, la 2ª contro la penultima e così via. Se il numero non è 2, 4, 8 o 16, le prime passano direttamente il primo turno.')),
      D.h('div', { class: 'card' }, D.h('b', {}, `${roundName(0, Math.log2(fb.slots.length))}: primi scontri`),
        D.h('p', { class: 'muted small', style: 'margin:4px 0 8px' }, 'Tocca due caselle per scambiare le posizioni.'),
        pairs.map(([i, j]) => D.h('div', { class: 'tb-bm static' }, [i, j].map((k) => D.h('button', { class: 'tb-bslot' + (fb.sel === k ? ' pick' : ''), onclick: () => tap(k) },
          fb.slots[k] ? [D.h('small', { class: 'muted' }, `${seedOf(fb.slots[k])}ª `), teamEl(T, fb.slots[k])] : D.h('span', { class: 'muted' }, '— passa il turno —')))))),
      D.h('button', { class: 'btn block', onclick: iniziaFinale }, '🔥 Inizia la fase finale'),
    ];
  }
  async function iniziaFinale() {
    const fb = finaleBozza, slots = fb.slots, size = slots.length, R = Math.log2(size);
    if (!(await D.askConfirm('🔥 Iniziare la fase finale?', `Passano ${fb.q} coppie. Il girone si chiude.`, 'Via!'))) return;
    const rows = [];
    for (let r = 0; r < R; r++) for (let p = 0; p < size >> (r + 1); p++) rows.push({ tournament_id: id, phase: 'finale', round: r, pos: p, a: null, b: null, result: null });
    const at = (r, p) => rows.find((x) => x.round === r && x.pos === p);
    for (let p = 0; p < size / 2; p++) { const m = at(0, p); m.a = slots[2 * p]; m.b = slots[2 * p + 1]; }
    for (let p = 0; p < size / 2; p++) { // chi non ha avversario passa il turno
      const m = at(0, p);
      if ((m.a == null) !== (m.b == null)) { m.result = m.a ?? m.b; if (R > 1) at(1, p >> 1)[p & 1 ? 'b' : 'a'] = m.result; }
    }
    await D.sb.from('foos_matches').delete().eq('tournament_id', id).eq('phase', 'finale');
    const { error } = await D.sb.from('foos_matches').insert(rows);
    if (error) return D.toast(D.errMsg(error));
    await D.sb.from('foos_tournaments').update({ status: 'finale', qualify: fb.q }).eq('id', id);
    finaleBozza = null; tab = 'finale'; reload();
  }

  let lastCheck = 0;
  const ticker = setInterval(() => {
    if (!T) return;
    for (const el of root.querySelectorAll('[data-deadline]')) el.textContent = (el.tagName === 'SPAN' ? ' · ' : '') + fmtLeft(+el.dataset.deadline - Date.now());
    for (const el of document.querySelectorAll('.overlay [data-deadline]')) el.textContent = fmtLeft(+el.dataset.deadline - Date.now());
    const scaduta = T.matches.some((m) => m.result == null && deadline(m) && deadline(m) < Date.now());
    if (scaduta && Date.now() - lastCheck > 10000) {
      lastCheck = Date.now();
      D.sb.rpc('foos_timeouts', { p_t: id }).then(({ data }) => { if (data) D.toast('⚖️ Partita assegnata a tavolino'); reload(); });
    }
  }, 1000);
  view = { id, root, stop: () => clearInterval(ticker), reloadSoon: () => { clearTimeout(timer); timer = setTimeout(reload, 350); } };
  await reload();
}
function closeView() {
  if (!view) return;
  view.stop?.(); view.root.remove(); view = null; document.body.style.overflow = '';
}
