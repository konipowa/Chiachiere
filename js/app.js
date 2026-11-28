import { PAROLE } from './parole.js';
import { initScacchi, chessChatCard, refreshChess, openChessGame, openChessLobby, myTurns } from './scacchi.js?v=36';
import { initBalilla, openTornei, openTorneo, torneoChatCard, refreshTorneo } from './balilla.js?v=36';
import { initBiliardo, openPoolLobby, openPoolGame, poolChatCard, refreshPool, poolTurns } from './biliardo.js?v=36';
import { initPuzzle, openPuzzleMenu, openPuzzleDaily, puzzleChatCard, refreshPuzzle } from './puzzle.js?v=36';

/* ============ CONFIG ============ */
const VERSIONE = '36';
const SUPABASE_URL = 'https://nznwxjxeralilqzohazd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_daqp16bCptd0phA4K3guiQ_iuq2AzuV';
const EMAIL_DOMAIN = 'utenti.chiacchiere.app'; // indirizzi interni: nessuna email viene mai inviata
const AVATARS = ['😀','😎','🥰','🤪','😺','🐶','🦊','🐼','🐸','🦄','🐙','🌸','🌻','🍕','⚡','🎮','🎧','⚽'];
const COLORS = ['#ff7a59','#ffb347','#7bc67e','#4fb3d9','#8e7cc3','#e86fa0','#5d6d7e','#c9a26b'];
const REACTIONS = ['❤️','😂','😮','😢','🔥','👏'];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/* ============ STATO ============ */
const S = {
  user: null, me: null, circles: [], circleId: null, members: new Map(),
  tab: 'oggi', channel: null, unread: 0, unreadBy: {}, pending: 0, installEvt: null, feedTimer: null, sub: null,
};

/* ============ UTILITÀ ============ */
const $app = document.getElementById('app');
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
const todayRome = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
function dayLabel(d) {
  const t = todayRome();
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(Date.now() - 864e5));
  if (d === t) return 'Oggi';
  if (d === y) return 'Ieri';
  return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}
const timeOf = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function slug(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
const emailFor = (name) => `${slug(name)}@${EMAIL_DOMAIN}`;
function avatarEl(p, size = '') {
  return h('div', { class: `avatar ${size}`, style: `background:${p?.color || '#ddd'}` }, p?.avatar || '🙂');
}
const person = (id) => S.members.get(id) || { username: 'Qualcuno', avatar: '🙂', color: '#ccc' };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const inviteLink = (code) => `${location.origin}${location.pathname}?invito=${code}${S.me ? '&da=' + S.me.id : ''}`;
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Nome o password sbagliati.';
  if (/already registered|already exists/i.test(m)) return 'Questo nome è già usato. Scegline un altro, oppure accedi.';
  if (/Password should be/i.test(m)) return 'La password deve avere almeno 6 caratteri.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Niente connessione. Riprova tra poco.';
  if (/Email not confirmed/i.test(m)) return 'Account in attesa di conferma: avvisa chi ti ha invitato.';
  return m;
}

/* ============ AVVIO ============ */
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then((reg) => reg.update()).catch(() => {});
  // quando arriva una versione nuova: ricarica da solo se non stai facendo niente, altrimenti avvisa
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    const busy = document.getElementById('overlay') || document.querySelector('.topo-root') || document.querySelector('.chess-root') || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    if (!busy) location.reload(); else toast('✨ Novità disponibili: riapri l\'app per vederle', 4000);
  });
}

(function readInvite() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('apri')) localStorage.setItem('apri', qs.get('apri'));
  if (qs.get('sondaggio')) localStorage.setItem('sondaggio', qs.get('sondaggio'));
  if (qs.get('argomento')) localStorage.setItem('argomento', qs.get('argomento'));
  if (qs.get('cerchia')) localStorage.setItem('cerchia', qs.get('cerchia'));
  if (qs.get('apri') || qs.get('cerchia')) history.replaceState(null, '', location.pathname + (qs.get('invito') ? '?invito=' + qs.get('invito') : ''));
  if (qs.get('da')) localStorage.setItem('invitoDa', qs.get('da'));
  const code = qs.get('invito');
  if (code) {
    localStorage.setItem('invito', code.toUpperCase());
    history.replaceState(null, '', location.pathname);
  }
})();

sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') { cleanup(); renderAuth(); } });

initScacchi({ sb, S, h, person, avatarEl, toast, errMsg, openSheet, closeSheet, askConfirm });
initBalilla({ sb, S, h, person, avatarEl, toast, errMsg, openSheet, closeSheet, askConfirm });
initBiliardo({ sb, S, h, person, avatarEl, toast, errMsg, openSheet, closeSheet, askConfirm });
initPuzzle({ sb, S, h, person, avatarEl, toast, errMsg, openSheet, closeSheet, askConfirm, todayRome, saveScore });
boot();
async function boot() {
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) return renderAuth();
    S.user = data.session.user;
    await afterLogin();
  } catch (e) {
    $app.replaceChildren(h('div', { class: 'page no-nav center' }, h('p', { class: 'error' }, errMsg(e)),
      h('button', { class: 'btn', onclick: () => location.reload() }, 'Riprova')));
  }
}

/* ============ ACCESSO ============ */
// link d'invito di una cerchia che non c'è più: lo diciamo prima della registrazione
function renderDeletedCircle() {
  const choose = (crea) => {
    localStorage.removeItem('invito'); localStorage.removeItem('invitoDa');
    if (crea) localStorage.setItem('creaCerchia', '1'); else localStorage.removeItem('creaCerchia');
    renderAuth('new');
  };
  $app.replaceChildren(h('div', { class: 'page no-nav' },
    h('div', { class: 'center', style: 'margin:24px 0 18px' }, h('div', { class: 'logo-big' }, '💬'), h('h1', {}, 'Chiacchiere')),
    h('div', { class: 'card center' }, h('div', { style: 'font-size:2.6rem' }, '😕'),
      h('h2', { style: 'margin:6px 0' }, 'Questa cerchia è stata eliminata'),
      h('p', { class: 'muted' }, 'Chi l\'aveva creata l\'ha cancellata (o il link non è più valido). Vuoi crearne una tu e invitare i tuoi amici?'),
      h('button', { class: 'btn block', onclick: () => choose(true) }, '✨ Sì, creo una cerchia'),
      h('button', { class: 'btn plain block', style: 'margin-top:8px', onclick: () => choose(false) }, 'Più tardi')),
    h('p', { class: 'center' }, 'Hai già un account? ', h('button', { class: 'linkbtn', onclick: () => { localStorage.removeItem('invito'); renderAuth('login'); } }, 'Accedi'))));
}
// aspetta che non ci siano altri fogli aperti (es. la guida all'installazione) prima di aprirne uno
function whenNoSheet(fn) { const t = setInterval(() => { if (!document.getElementById('overlay')) { clearInterval(t); fn(); } }, 1200); }
function askCreateCircle(title) {
  openSheet(h('div', { class: 'center' }, h('div', { style: 'font-size:2.4rem' }, '😕'), h('h2', { style: 'margin:6px 0' }, title),
    h('p', { class: 'muted' }, 'Vuoi crearne una tu?'),
    h('button', { class: 'btn block', onclick: () => openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, 'Nuova cerchia'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), circleForms())) }, '✨ Crea una cerchia'),
    h('button', { class: 'btn plain block', style: 'margin-top:8px', onclick: closeSheet }, 'Più tardi')));
}
async function renderAuth(mode) {
  const invite = localStorage.getItem('invito');
  mode = mode || (invite ? 'new' : 'login');
  let circleName = null;
  if (invite) {
    const { data } = await sb.rpc('circle_name_by_code', { p_code: invite });
    circleName = data;
    if (!circleName) return renderDeletedCircle();
  }
  let avatar = AVATARS[Math.floor(Math.random() * 8)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const err = h('div', { class: 'error' });
  const pollBox = invite && localStorage.getItem('argomento') ? await topicPreviewCard(localStorage.getItem('argomento'), invite, mode)
    : invite && localStorage.getItem('sondaggio') ? await pollPreviewCard(localStorage.getItem('sondaggio'), invite, mode) : null;
  const name = h('input', { class: 'input', id: 'nome', autocomplete: 'username', autocapitalize: 'none', maxlength: 24, placeholder: 'es. Giulia' });
  const pass = h('input', { class: 'input', id: 'pass', type: 'password', autocomplete: mode === 'new' ? 'new-password' : 'current-password', placeholder: 'almeno 6 caratteri' });
  const show = h('button', { class: 'linkbtn small', type: 'button', onclick: () => { pass.type = pass.type === 'password' ? 'text' : 'password'; show.textContent = pass.type === 'password' ? 'Mostra password' : 'Nascondi password'; } }, 'Mostra password');
  const go = h('button', { class: 'btn block', type: 'submit' }, mode === 'new' ? 'Entra in Chiacchiere' : 'Accedi');

  const avatarRow = mode === 'new' ? h('div', { class: 'field' }, h('label', {}, 'Scegli la tua faccina'),
    h('div', { class: 'emoji-grid' }, AVATARS.slice(0, 12).map((a) => {
      const b = h('button', { type: 'button', class: a === avatar ? 'on' : '', onclick: () => {
        avatar = a; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on');
      } }, a);
      return b;
    }))) : null;

  const form = h('form', { class: 'card', onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const n = name.value.trim(), p = pass.value;
    if (slug(n).length < 2) return (err.textContent = 'Scrivi un nome di almeno 2 lettere.');
    if (p.length < 6) return (err.textContent = 'La password deve avere almeno 6 caratteri.');
    go.disabled = true; go.textContent = 'Un attimo…';
    try {
      if (mode === 'new') {
        const { data, error } = await sb.auth.signUp({ email: emailFor(n), password: p, options: { data: { username: n, avatar, color } } });
        if (error) throw error;
        if (!data.session) {
          const r = await sb.auth.signInWithPassword({ email: emailFor(n), password: p });
          if (r.error) throw r.error;
          S.user = r.data.user;
        } else S.user = data.user;
        localStorage.setItem('ultimoNome', n);
        localStorage.setItem('mostraInstall', '1');
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email: emailFor(n), password: p });
        if (error) throw error;
        S.user = data.user;
        localStorage.setItem('ultimoNome', n);
      }
      await afterLogin();
    } catch (e) {
      err.textContent = errMsg(e);
      go.disabled = false; go.textContent = mode === 'new' ? 'Entra in Chiacchiere' : 'Accedi';
    }
  } },
    h('div', { class: 'field' }, h('label', { for: 'nome' }, 'Il tuo nome'), name),
    h('div', { class: 'field' }, h('label', { for: 'pass' }, mode === 'new' ? 'Inventa una password' : 'Password'), pass, show),
    avatarRow, err, go,
  );
  if (mode === 'login') name.value = localStorage.getItem('ultimoNome') || '';

  $app.replaceChildren(h('div', { class: 'page no-nav' },
    h('div', { class: 'center', style: 'margin:24px 0 18px' },
      h('div', { class: 'logo-big' }, '💬'),
      h('h1', {}, 'Chiacchiere'),
      circleName
        ? h('p', {}, 'Ti hanno invitato nella cerchia ', h('b', {}, `«${circleName}»`), ' 🎉')
        : h('p', { class: 'muted' }, 'Il social per i tuoi amici, con i giochi dentro.')),
    pollBox,
    isStandalone() ? null : h('button', { class: 'btn ghost block', style: 'margin-bottom:14px', onclick: () => showInstall(true) }, '📲 Installa l\'app sul telefono'),
    form,
    h('p', { class: 'center' }, mode === 'new' ? 'Hai già un account? ' : 'Prima volta qui? ',
      h('button', { class: 'linkbtn', onclick: () => renderAuth(mode === 'new' ? 'login' : 'new') }, mode === 'new' ? 'Accedi' : 'Crea il tuo profilo')),
  ));
  if (!isStandalone() && !localStorage.getItem('primaVisita')) {
    localStorage.setItem('primaVisita', '1');
    setTimeout(() => showInstall(true), 900);
  } else setTimeout(() => (mode === 'login' && name.value ? pass : name).focus(), 50);
}

async function afterLogin() {
  const { data: me, error } = await sb.from('profiles').select('*').eq('id', S.user.id).single();
  if (error) throw error;
  S.me = me;
  const invite = localStorage.getItem('invito');
  if (invite) {
    const { data: cid, error: je } = await sb.rpc('join_circle', { p_code: invite, p_from: localStorage.getItem('invitoDa') || null });
    localStorage.removeItem('invito'); localStorage.removeItem('invitoDa');
    if (je) S.cerchiaSparita = true; else { localStorage.setItem('cerchia', cid); toast('Sei entrato nella cerchia! 🎉'); }
  }
  await loadCircles();
  const crea = localStorage.getItem('creaCerchia'); localStorage.removeItem('creaCerchia');
  if (!S.circles.length) { renderNoCircle(); if (S.cerchiaSparita) toast('Quella cerchia è stata eliminata: creane una tu! ✨', 4000); S.cerchiaSparita = false; return; }
  await openCircle(localStorage.getItem('cerchia'));
  if (S.cerchiaSparita) { S.cerchiaSparita = false; askCreateCircle('Quella cerchia è stata eliminata'); return; }
  if (crea) { whenNoSheet(() => openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '✨ Crea la tua cerchia'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), circleForms()))); return; }
  if (localStorage.getItem('argomento')) {
    localStorage.removeItem('argomento');
    const pend = JSON.parse(localStorage.getItem('votoPendente') || 'null');
    localStorage.removeItem('votoPendente'); localStorage.removeItem('sondaggio');
    if (pend) { const { error } = await sb.from('poll_votes').upsert({ poll_id: pend.poll, user_id: S.me.id, option: pend.option }); if (!error) toast('Voto registrato! 🗳️', 3000); }
    S.tab = 'oggi'; render();
    return maybeShowInstall();
  }
  const pollId = localStorage.getItem('sondaggio');
  if (pollId) {
    localStorage.removeItem('sondaggio');
    const pend = JSON.parse(localStorage.getItem('votoPendente') || 'null');
    localStorage.removeItem('votoPendente');
    if (pend && pend.poll === pollId) {
      const { error } = await sb.from('poll_votes').upsert({ poll_id: pollId, user_id: S.me.id, option: pend.option });
      toast(error ? errMsg(error) : 'Voto registrato! 🗳️', 3000);
    }
    S.tab = 'giochi'; S.extraView = 'utilita'; render();
    return maybeShowInstall();
  }
  syncPush();
  const apri = localStorage.getItem('apri');
  if (['chat', 'amici', 'oggi'].includes(apri)) {
    localStorage.removeItem('apri'); S.tab = apri; if (apri === 'chat') markRead(); render(); return;
  }
  if ((apri || '').startsWith('scacchi:')) {
    localStorage.removeItem('apri'); S.tab = 'chat'; render(); openChessGame(apri.slice(8)); return;
  }
  if ((apri || '').startsWith('biliardo:')) {
    localStorage.removeItem('apri'); S.tab = 'chat'; render(); openPoolGame({ mode: 'online', id: apri.slice(9) }); return;
  }
  if ((apri || '').startsWith('torneo:')) {
    localStorage.removeItem('apri'); S.tab = 'chat'; render(); openTorneo(apri.slice(7)); return;
  }
  if (localStorage.getItem('apri') === 'santa') {
    localStorage.removeItem('apri'); S.tab = 'giochi'; S.extraView = 'utilita'; render(); openSanta();
  } else maybeShowInstall();
}

/* ---- cerchie e messaggi non letti ---- */
function othersUnread() { return Object.entries(S.unreadBy || {}).filter(([id]) => id !== S.circleId).reduce((t, [, n]) => t + n, 0); }
function pickerEl() {
  const c = circle(), n = othersUnread();
  return h('button', { class: 'circle-pick', onclick: openCirclePicker }, c.name, S.circles.length > 1 ? ' ▾' : '',
    n ? h('span', { class: 'cdot' }, n > 99 ? '99+' : n) : null);
}
function updatePicker() { const el = document.querySelector('.circle-pick'); if (el) el.replaceWith(pickerEl()); }
function openCirclePicker() {
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '👥 Le tue cerchie'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
    h('div', { class: 'stack', style: 'margin-top:12px' }, S.circles.map((x) => {
      const n = x.id === S.circleId ? 0 : S.unreadBy?.[x.id] || 0;
      return h('button', { class: 'cg-row' + (x.id === S.circleId ? ' cur' : ''), onclick: () => { closeSheet(); if (x.id !== S.circleId) { S.tab = n ? 'chat' : S.tab; openCircle(x.id); } } },
        h('b', { style: 'flex:1;text-align:left' }, x.name), x.id === S.circleId ? h('span', { class: 'muted small' }, 'sei qui ✓') : null,
        n ? h('span', { class: 'cdot big' }, n > 99 ? '99+' : n) : null, '›');
    })),
    h('button', { class: 'btn ghost block', style: 'margin-top:12px', onclick: () => openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, 'Altre cerchie'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), circleForms())) }, '➕ Crea o entra in un\'altra cerchia')));
}
async function loadUnread() {
  const { data } = await sb.rpc('unread_counts');
  S.unreadBy = Object.fromEntries((data || []).map((r) => [r.circle_id, r.n]));
  if (S.tab === 'chat' && document.visibilityState === 'visible') markRead();
  else S.unread = S.unreadBy[S.circleId] || 0;
  updateBadge(); updatePicker();
}
function markRead() {
  S.unread = 0; if (S.unreadBy) S.unreadBy[S.circleId] = 0;
  if (S.circleId) sb.rpc('mark_read', { p_circle: S.circleId }).then(() => {});
}
function markReadSoon() { clearTimeout(S.readTimer); S.readTimer = setTimeout(markRead, 1500); }
function watchAllCircles() {
  if (S.allChannel) sb.removeChannel(S.allChannel);
  S.allChannel = sb.channel('tutte-' + S.me.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
      const m = p.new;
      if (m.circle_id === S.circleId || m.user_id === S.me.id) return;
      S.unreadBy[m.circle_id] = (S.unreadBy[m.circle_id] || 0) + 1; updatePicker();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'circles' }, (p) => {
      const gone = S.circles.find((c) => c.id === p.old?.id);
      if (!gone) return;
      toast(`😕 La cerchia «${gone.name}» è stata eliminata da chi l'aveva creata`, 4500);
      if (gone.id === S.circleId) afterCircleGone(); else loadCircles().then(updatePicker);
    }).subscribe();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me && S.circleId) loadUnread(); });

async function loadCircles() {
  const { data, error } = await sb.from('circle_members').select('circle_id, circles(id,name,invite_code,owner)').eq('user_id', S.user.id);
  if (error) throw error;
  S.circles = data.map((r) => r.circles).filter(Boolean);
}

async function openCircle(id) {
  if (!S.circles.find((c) => c.id === id)) id = S.circles[0].id;
  S.circleId = id; localStorage.setItem('cerchia', id);
  const { data } = await sb.from('circle_members').select('user_id, profiles(id,username,avatar,color)').eq('circle_id', id);
  S.members = new Map((data || []).filter((r) => r.profiles).map((r) => [r.user_id, r.profiles]));
  S.members.set(S.me.id, S.me);
  subscribe();
  render();
  loadUnread();
  if (!S.allChannel) watchAllCircles();
}
const circle = () => S.circles.find((c) => c.id === S.circleId);

function cleanup() {
  if (S.channel) sb.removeChannel(S.channel);
  if (S.allChannel) sb.removeChannel(S.allChannel);
  Object.assign(S, { user: null, me: null, circles: [], circleId: null, channel: null, allChannel: null, unread: 0, unreadBy: {} });
}

/* ============ NESSUNA CERCHIA ============ */
function renderNoCircle() {
  $app.replaceChildren(h('div', { class: 'page no-nav' },
    h('div', { class: 'center', style: 'margin:20px 0' }, avatarEl(S.me, 'big'), h('h1', { style: 'margin-top:12px' }, `Ciao ${S.me.username}!`),
      h('p', { class: 'muted' }, 'Una cerchia è il tuo gruppo di amici. Creane una o entra con un codice.')),
    circleForms(),
    h('p', { class: 'center' }, h('button', { class: 'linkbtn', onclick: () => sb.auth.signOut() }, 'Esci')),
  ));
}
function circleForms() {
  const nm = h('input', { class: 'input', placeholder: 'es. Gli amici del bar', maxlength: 40 });
  const cd = h('input', { class: 'input', placeholder: 'es. A1B2C3', maxlength: 6, autocapitalize: 'characters', style: 'text-transform:uppercase;letter-spacing:.15em' });
  return h('div', {},
    h('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); if (!nm.value.trim()) return;
      const { data, error } = await sb.rpc('create_circle', { p_name: nm.value.trim() });
      if (error) return toast(errMsg(error));
      await loadCircles(); closeSheet(); await openCircle(data); S.tab = 'profilo'; render();
      toast('Cerchia creata! Ora invita i tuoi amici 👇');
    } }, h('h2', {}, '✨ Crea una cerchia'), h('div', { class: 'field' }, nm), h('button', { class: 'btn block' }, 'Crea')),
    h('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); if (cd.value.trim().length < 4) return;
      const { data, error } = await sb.rpc('join_circle', { p_code: cd.value.trim() });
      if (error) return toast(errMsg(error));
      await loadCircles(); closeSheet(); await openCircle(data); toast('Sei dentro! 🎉');
    } }, h('h2', {}, '🔑 Ho un codice'), h('div', { class: 'field' }, cd), h('button', { class: 'btn ghost block' }, 'Entra')),
  );
}

/* ============ GUSCIO ============ */
const TABS = [['oggi', '☀️', 'Oggi'], ['chat', '💬', 'Chat'], ['giochi', '🧩', 'Extra'], ['amici', '👥', 'Amici'], ['profilo', '👤', 'Profilo']];
const badgeCount = (id) => (id === 'chat' ? S.unread : id === 'amici' ? S.pending : 0);
function render() {
  const c = circle();
  const picker = pickerEl();
  const content = h('div', { id: 'content' });
  const banner = !isStandalone() && !sessionStorage.getItem('noBanner')
    ? h('div', { class: 'install-bar' }, h('span', { style: 'flex:1' }, '📲 Usala come un\'app vera'),
        h('button', { class: 'btn small white', onclick: () => showInstall(true) }, 'Installa'),
        h('button', { class: 'btn plain small', 'aria-label': 'Chiudi', onclick: (e) => { sessionStorage.setItem('noBanner', '1'); e.target.closest('.install-bar').remove(); } }, '✕'))
    : null;
  const page = h('div', { class: 'page' + (S.tab === 'chat' ? ' chat-page' : '') }, banner,
    h('div', { class: 'topbar' }, h('div', { class: 'title' }, '💬 Chiacchiere'), picker), content);
  const nav = h('nav', { class: 'nav' }, h('div', { class: 'nav-inner' }, TABS.map(([id, ico, lbl]) =>
    h('button', { class: S.tab === id ? 'on' : '', onclick: () => { S.tab = id; if (id === 'chat') markRead(); render(); window.scrollTo(0, 0); } },
      h('span', { class: 'ico' }, ico), lbl,
      badgeCount(id) ? h('span', { class: 'badge' }, badgeCount(id) > 9 ? '9+' : badgeCount(id)) : null))));
  $app.replaceChildren(page, nav);
  ({ oggi: tabOggi, chat: tabChat, giochi: tabGiochi, amici: tabAmici, profilo: tabProfilo })[S.tab](content);
}

/* ============ TEMPO REALE ============ */
function subscribe() {
  if (S.channel) sb.removeChannel(S.channel);
  const cid = S.circleId;
  S.channel = sb.channel('cerchia-' + cid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `circle_id=eq.${cid}` }, (p) => {
      if (S.tab === 'chat' && document.visibilityState === 'visible') { appendMsg(p.new, true); if (p.new.user_id !== S.me.id) markReadSoon(); }
      else { if (S.tab === 'chat') appendMsg(p.new, true); if (p.new.user_id !== S.me.id) { S.unread++; S.unreadBy[cid] = S.unread; updateBadge(); } }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
      document.querySelector(`#chat [data-id="${p.old?.id}"]`)?.remove();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `circle_id=eq.${cid}` }, refreshFeedSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, refreshFeedSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshFeedSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `circle_id=eq.${cid}` }, refreshPollsSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, refreshPollsSoon)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chess_games', filter: `circle_id=eq.${cid}` }, (p) => refreshChess(p.new.id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chess_cheers' }, (p) => refreshChess(p.new?.game_id || p.old?.game_id))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pool_games', filter: `circle_id=eq.${cid}` }, (p) => refreshPool(p.new.id))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'puzzle_results' }, (p) => refreshPuzzle(p.new.msg_id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_cheers' }, (p) => refreshPool(p.new?.game_id || p.old?.game_id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'foos_tournaments', filter: `circle_id=eq.${cid}` }, (p) => refreshTorneo(p.new?.id || p.old?.id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'foos_players' }, (p) => refreshTorneo(p.new?.tournament_id || p.old?.tournament_id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'foos_teams' }, (p) => refreshTorneo(p.new?.tournament_id || p.old?.tournament_id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'foos_matches' }, (p) => refreshTorneo(p.new?.tournament_id || p.old?.tournament_id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onSocialChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_invites', filter: `invitee=eq.${S.me.id}` }, onSocialChange)
    .subscribe();
  loadPending();
}
function refreshPollsSoon() {
  clearTimeout(S.pollTimer);
  S.pollTimer = setTimeout(afterPollChange, 400);
}
function afterPollChange() {
  loadPolls(document.getElementById('polls'));
  const f = document.getElementById('feed'); if (f) loadFeed(f);
}
function onSocialChange() {
  loadPending();
  if (S.tab === 'amici') { const c = document.getElementById('content'); if (c && !c.contains(document.activeElement)) render(); }
}
function updateBadge() {
  TABS.forEach(([id], i) => {
    const b = document.querySelector(`.nav button:nth-child(${i + 1})`);
    if (!b) return;
    b.querySelector('.badge')?.remove();
    const n = badgeCount(id);
    if (n) b.append(h('span', { class: 'badge' }, n > 9 ? '9+' : n));
  });
}
async function loadPending() {
  const [f, i] = await Promise.all([
    sb.from('friendships').select('requester', { count: 'exact', head: true }).eq('addressee', S.me.id).eq('status', 'pending'),
    sb.from('circle_invites').select('id', { count: 'exact', head: true }).eq('invitee', S.me.id),
  ]);
  S.pending = (f.count || 0) + (i.count || 0);
  updateBadge();
}
function refreshFeedSoon() {
  if (S.tab !== 'oggi') return;
  clearTimeout(S.feedTimer);
  S.feedTimer = setTimeout(() => { const f = document.getElementById('feed'); if (f) loadFeed(f); }, 400);
}

/* ============ OGGI: ARGOMENTO DEL GIORNO ============ */
async function tabOggi(root) {
  root.append(h('div', { id: 'feed' }, h('p', { class: 'muted center' }, 'Carico…')));
  loadFeed(document.getElementById('feed'));
}

async function loadFeed(feed) {
  if (!feed) return;
  // non ridisegnare mentre qualcuno sta scrivendo: riprova tra poco
  const ae = document.activeElement;
  if (ae && feed.contains(ae) && /INPUT|TEXTAREA/.test(ae.tagName) && ae.value) {
    clearTimeout(S.feedTimer); S.feedTimer = setTimeout(() => loadFeed(feed), 2500); return;
  }
  const { data, error } = await sb.from('posts')
    .select('id,user_id,body,image_path,day,created_at,poll_id,reactions(user_id,emoji),comments(count),polls(*,poll_votes(user_id,option))')
    .eq('circle_id', S.circleId).order('day', { ascending: false }).limit(30);
  if (error) { feed.replaceChildren(h('p', { class: 'error center' }, errMsg(error))); return; }
  const today = todayRome();
  const top = data.find((p) => p.day === today);
  const past = data.filter((p) => p.day !== today);
  const open = new Set([...feed.querySelectorAll('.comments[data-open]')].map((x) => x.dataset.post));
  feed.replaceChildren(...[
    top ? topicCard(top) : composerCard(),
    past.length ? h('div', { class: 'day-sep', style: 'text-transform:none' }, '🗓️ Gli argomenti dei giorni scorsi') : null,
    ...past.map((p) => pastCard(p, open.has(p.id)))].filter(Boolean));
}

function composerCard() {
  let photo = null;
  const ta = h('textarea', { class: 'input', placeholder: 'es. Stasera calcetto? Chi c\'è? ⚽', maxlength: 1000 });
  const preview = h('div');
  const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: async () => {
    const f = file.files[0]; if (!f) return;
    try { photo = await compressImage(f); } catch { return toast('Non riesco a leggere la foto.'); }
    preview.replaceChildren(h('div', { class: 'composer-photo' }, h('img', { src: URL.createObjectURL(photo), class: 'post-img' }),
      h('button', { class: 'btn small white', type: 'button', onclick: () => { photo = null; preview.replaceChildren(); file.value = ''; } }, '✕ Togli')));
  } });
  const opts = h('div', { class: 'stack', style: 'display:none;margin-top:10px' });
  const addOpt = () => { if (opts.querySelectorAll('input').length < 6) opts.insertBefore(h('input', { class: 'input', maxlength: 60, placeholder: `Risposta ${opts.querySelectorAll('input').length + 1}` }), opts.lastChild); };
  opts.append(h('button', { class: 'linkbtn', type: 'button', onclick: addOpt }, '➕ Aggiungi risposta'));
  const pollBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => {
    const show = opts.style.display === 'none';
    opts.style.display = show ? '' : 'none';
    pollBtn.textContent = show ? '📊 Togli sondaggio' : '📊 Sondaggio';
    if (show && !opts.querySelector('input')) { addOpt(); addOpt(); opts.querySelector('input').value = 'Ci sono! 🙋'; opts.querySelectorAll('input')[1].value = 'Stavolta no 😴'; }
  } }, '📊 Sondaggio');
  const send = h('button', { class: 'btn', onclick: async () => {
    const body = ta.value.trim();
    if (!body && !photo) return toast('Scrivi l\'argomento di oggi 🙂');
    const options = opts.style.display === 'none' ? [] : [...opts.querySelectorAll('input')].map((x) => x.value.trim()).filter(Boolean);
    if (opts.style.display !== 'none' && options.length < 2) return toast('Il sondaggio ha bisogno di almeno 2 risposte');
    send.disabled = true; send.textContent = 'Pubblico…';
    let pollId = null, image_path = null;
    try {
      if (photo) {
        image_path = `${S.me.id}/${Date.now()}.jpg`;
        const up = await sb.storage.from('foto').upload(image_path, photo, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
      }
      if (options.length) {
        const { data: pl, error: pe } = await sb.from('polls').insert({ circle_id: S.circleId, user_id: S.me.id, question: (body || 'Sondaggio di oggi').slice(0, 200), options }).select('id').single();
        if (pe) throw pe; pollId = pl.id;
      }
      const { error } = await sb.from('posts').insert({ circle_id: S.circleId, user_id: S.me.id, body: body || null, image_path, poll_id: pollId });
      if (error) {
        if (pollId) await sb.from('polls').delete().eq('id', pollId);
        if (image_path) sb.storage.from('foto').remove([image_path]);
        if (error.code === '23505') { toast('Qualcuno ti ha preceduto! Rispondi al suo argomento 👇', 3500); return loadFeed(document.getElementById('feed')); }
        throw error;
      }
      toast('Argomento lanciato! 🔥');
      sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🔥 Argomento di oggi: «${(body || 'foto').slice(0, 120)}» — dite la vostra in Oggi!` }).then(() => {});
      ta.value = ''; loadFeed(document.getElementById('feed'));
    } catch (e) { toast(errMsg(e)); send.disabled = false; send.textContent = 'Lancia'; }
  } }, '🔥 Lancia');
  return h('div', { class: 'card topic-new' },
    h('h2', {}, '🔥 L\'argomento di oggi'),
    h('p', { class: 'muted small' }, 'Oggi nessuno ha ancora scritto. Il primo decide di cosa si parla nella cerchia, e tutti gli altri rispondono sotto.'),
    ta, preview, opts,
    h('div', { class: 'row wrap', style: 'margin-top:10px' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => file.click() }, '📷'), file, pollBtn,
      h('div', { class: 'spacer' }), send));
}

function postBody(p) {
  const imgUrl = p.image_path ? sb.storage.from('foto').getPublicUrl(p.image_path).data.publicUrl : null;
  return [
    p.body ? h('div', { class: 'post-body' }, p.body) : null,
    imgUrl ? h('img', { class: 'post-img', src: imgUrl, loading: 'lazy', alt: '' }) : null,
    p.polls ? h('div', { class: 'topic-poll' }, pollCard(p.polls)) : null,
  ];
}
function reactBar(p, extra) {
  const myReact = p.reactions.find((r) => r.user_id === S.me.id)?.emoji;
  const counts = {}; p.reactions.forEach((r) => (counts[r.emoji] = (counts[r.emoji] || 0) + 1));
  return h('div', { class: 'reacts' },
    REACTIONS.map((e) => h('button', { class: 'react' + (myReact === e ? ' on' : ''), onclick: () => react(p.id, e, myReact) },
      e, counts[e] ? h('span', { class: 'n' }, counts[e]) : null)), extra);
}
function deleteBtn(p) {
  return p.user_id === S.me.id ? h('button', { class: 'btn plain small', 'aria-label': 'Elimina', onclick: async () => {
    if (!(await askConfirm('🗑️ Sei sicuro di volerlo cancellare?', 'Spariranno anche il sondaggio e tutte le risposte del dibattito.', 'Sì, cancella'))) return;
    const { error } = await sb.from('posts').delete().eq('id', p.id);
    if (error) return toast(errMsg(error));
    if (p.poll_id) sb.from('polls').delete().eq('id', p.poll_id).then(() => {});
    if (p.image_path) sb.storage.from('foto').remove([p.image_path]);
    toast('Argomento eliminato'); loadFeed(document.getElementById('feed'));
  } }, '🗑️') : null;
}

function topicCard(p) {
  const who = person(p.user_id);
  const n = p.comments?.[0]?.count || 0;
  const replies = h('div', { class: 'comments', 'data-post': p.id, 'data-open': '1' });
  loadComments(p.id, replies, 'Dì la tua…');
  return h('div', { class: 'card topic' },
    h('div', { class: 'topic-head' }, h('span', {}, '🔥 Argomento di oggi'), h('div', { class: 'spacer' }),
      h('button', { class: 'btn plain small', 'aria-label': 'Condividi', onclick: () => shareTopic(p) }, '📤'), deleteBtn(p)),
    h('div', { class: 'post-head' }, avatarEl(who),
      h('div', {}, h('div', { class: 'name' }, who.username), h('div', { class: 'muted small' }, `l'ha lanciato alle ${timeOf(p.created_at)}`))),
    ...postBody(p),
    reactBar(p),
    h('h3', { style: 'margin:16px 0 0' }, `💬 Il dibattito${n ? ` (${n})` : ''}`),
    replies);
}

function pastCard(p, commentsOpen) {
  const who = person(p.user_id);
  const n = p.comments?.[0]?.count || 0;
  const cbox = h('div', { class: 'comments', 'data-post': p.id, style: commentsOpen ? '' : 'display:none' });
  if (commentsOpen) { cbox.dataset.open = '1'; loadComments(p.id, cbox, 'Rispondi…'); }
  return h('div', { class: 'card' },
    h('div', { class: 'post-head' }, avatarEl(who),
      h('div', {}, h('div', { class: 'name' }, who.username), h('div', { class: 'muted small', style: 'text-transform:capitalize' }, dayLabel(p.day))),
      h('div', { class: 'spacer' }), h('button', { class: 'btn plain small', 'aria-label': 'Condividi', onclick: () => shareTopic(p) }, '📤'), deleteBtn(p)),
    ...postBody(p),
    reactBar(p, h('button', { class: 'react', onclick: () => {
      const show = cbox.style.display === 'none';
      cbox.style.display = show ? '' : 'none';
      if (show) { cbox.dataset.open = '1'; loadComments(p.id, cbox, 'Rispondi…'); } else delete cbox.dataset.open;
    } }, '💬', h('span', { class: 'n' }, n ? `${n} risposte` : 'Rispondi'))),
    cbox);
}

function compressImage(f) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? res(b) : rej()), 'image/jpeg', 0.8);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(f);
  });
}

async function react(postId, emoji, current) {
  const q = current === emoji
    ? sb.from('reactions').delete().eq('post_id', postId).eq('user_id', S.me.id)
    : sb.from('reactions').upsert({ post_id: postId, user_id: S.me.id, emoji });
  const { error } = await q;
  if (error) return toast(errMsg(error));
  loadFeed(document.getElementById('feed'));
}

async function loadComments(postId, box, placeholder = 'Scrivi…') {
  const { data } = await sb.from('comments').select('*').eq('post_id', postId).order('created_at');
  const inp = h('input', { class: 'input', placeholder, maxlength: 500, style: 'padding:10px 12px' });
  box.replaceChildren(...[
    ...(data || []).map((c) => {
      const w = person(c.user_id);
      const bubble = h('div', { class: 'bubble' }, h('b', {}, w.username, h('span', { class: 'muted', style: 'font-weight:400;margin-left:6px' }, timeOf(c.created_at))), c.body);
      onLongPress(bubble, () => messageMenu({ text: c.body, preview: c.body, mine: c.user_id === S.me.id, onDelete: async () => {
        const { error } = await sb.from('comments').delete().eq('id', c.id);
        if (error) return toast(errMsg(error));
        toast('Risposta eliminata'); loadComments(postId, box, placeholder);
      } }));
      return h('div', { class: 'comment' }, avatarEl(w, 'sm'), bubble);
    }),
    (data || []).length ? null : h('p', { class: 'muted small', style: 'margin:4px 0 10px' }, 'Ancora nessuna risposta. Inizia tu!'),
    h('form', { class: 'row', onsubmit: async (e) => {
      e.preventDefault(); const body = inp.value.trim(); if (!body) return;
      inp.value = ''; inp.blur();
      const { error } = await sb.from('comments').insert({ post_id: postId, user_id: S.me.id, body });
      if (error) { toast(errMsg(error)); inp.value = body; } else loadComments(postId, box, placeholder);
    } }, inp, h('button', { class: 'btn small' }, 'Invia'))].filter(Boolean));
}

/* ============ CHAT ============ */
const AUDIO_MAX = 120; // secondi
const AUDIO_DAYS = 30; // i vocali si cancellano da soli dopo 30 giorni
function pickAudioType() {
  if (!window.MediaRecorder) return null;
  return ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function tabChat(root) {
  const list = h('div', { class: 'chat', id: 'chat' }, h('p', { class: 'muted center' }, 'Carico i messaggi…'));
  const ta = h('textarea', { class: 'input', rows: 1, placeholder: 'Messaggio…', maxlength: 1000,
    oninput: () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; toggleBtns(); },
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !isIOS()) { e.preventDefault(); sendMsg(); } } });
  const sendBtn = h('button', { class: 'btn round', onclick: sendMsg, 'aria-label': 'Invia' }, '➤');
  const micBtn = h('button', { class: 'btn round', onclick: startRec, 'aria-label': 'Messaggio vocale' }, '🎤');
  const toggleBtns = () => { const t = !!ta.value.trim(); sendBtn.style.display = t || pickAudioType() === null ? '' : 'none'; micBtn.style.display = t || pickAudioType() === null ? 'none' : ''; };
  async function sendMsg() {
    const body = ta.value.trim(); if (!body) return;
    ta.value = ''; ta.style.height = 'auto'; toggleBtns();
    const { data, error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body }).select().single();
    if (error) { toast(errMsg(error)); ta.value = body; toggleBtns(); return; }
    appendMsg(data, true);
  }

  // --- registrazione vocale ---
  // --- foto ---
  const photoInput = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: () => { const f = photoInput.files[0]; photoInput.value = ''; if (f) pickPhoto(f); } });
  const photoBtn = h('button', { class: 'btn round ghost', 'aria-label': 'Manda una foto', onclick: () => photoInput.click() }, '📷');
  async function pickPhoto(f) {
    let blob;
    try { blob = await compressImage(f); } catch { return toast('Non riesco a leggere la foto.'); }
    const url = URL.createObjectURL(blob);
    const cap = h('input', { class: 'input', maxlength: 1000, placeholder: 'Aggiungi una didascalia (se vuoi)' });
    const go = h('button', { class: 'btn block', style: 'margin-top:10px', onclick: async () => {
      go.disabled = true; go.textContent = 'Invio…';
      const path = `${S.me.id}/chat-${Date.now()}.jpg`;
      const up = await sb.storage.from('foto').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) { go.disabled = false; go.textContent = '➤ Invia'; return toast(errMsg(up.error)); }
      const { data, error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: cap.value.trim() || null, image_path: path }).select().single();
      if (error) { sb.storage.from('foto').remove([path]); go.disabled = false; go.textContent = '➤ Invia'; return toast(errMsg(error)); }
      closeSheet(); URL.revokeObjectURL(url); appendMsg(data, true);
    } }, '➤ Invia');
    openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📷 Manda una foto'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
      h('img', { src: url, class: 'chat-photo-preview' }), cap, go));
    setTimeout(() => cap.focus(), 300);
  }
  // --- file ---
  const fileInput = h('input', { type: 'file', style: 'display:none', onchange: () => { const f = fileInput.files[0]; fileInput.value = ''; if (f) pickFile(f); } });
  const fileBtn = h('button', { class: 'btn round ghost', 'aria-label': 'Manda un file', onclick: () => fileInput.click() }, '📎');
  async function pickFile(f) {
    if (f.size > FILE_MAX) return toast(`File troppo grande: massimo ${fmtSize(FILE_MAX)}`, 3500);
    if (f.type.startsWith('image/')) return pickPhoto(f);
    const cap = h('input', { class: 'input', maxlength: 1000, placeholder: 'Aggiungi un commento (se vuoi)' });
    const go = h('button', { class: 'btn block', style: 'margin-top:10px', onclick: async () => {
      go.disabled = true; go.textContent = 'Invio… 0%';
      const safe = f.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80) || 'file';
      const path = `${S.circleId}/${S.me.id}/${Date.now()}-${safe}`;
      const up = await sb.storage.from('file').upload(path, f, { contentType: f.type || 'application/octet-stream' });
      if (up.error) { go.disabled = false; go.textContent = '➤ Invia'; return toast(errMsg(up.error)); }
      const { data, error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: cap.value.trim() || null,
        file_path: path, file_name: f.name.slice(0, 200), file_size: f.size, file_mime: f.type || null }).select().single();
      if (error) { sb.storage.from('file').remove([path]); go.disabled = false; go.textContent = '➤ Invia'; return toast(errMsg(error)); }
      closeSheet(); appendMsg(data, true);
    } }, '➤ Invia');
    openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📎 Manda un file'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
      h('div', { class: 'file-row', style: 'margin:12px 0' }, h('div', { class: 'file-ico' }, fileIcon(f.name, f.type)), h('div', { style: 'flex:1;min-width:0' }, h('b', { class: 'file-name' }, f.name), h('div', { class: 'small muted' }, fmtSize(f.size)))),
      cap, go));
  }
  const normalBar = h('div', { class: 'inner' }, photoInput, fileInput, photoBtn, fileBtn, ta, sendBtn, micBtn);
  const recTime = h('span', { class: 'rec-time' }, '0:00');
  const recBar = h('div', { class: 'inner rec', style: 'display:none' },
    h('button', { class: 'btn round ghost', 'aria-label': 'Annulla', onclick: () => stopRec(false) }, '✕'),
    h('div', { class: 'rec-info' }, h('span', { class: 'rec-dot' }), recTime, h('span', { class: 'muted small' }, ' sto registrando…')),
    h('button', { class: 'btn round', 'aria-label': 'Invia vocale', onclick: () => stopRec(true) }, '➤'));
  let rec = null, chunks = [], stream = null, t0 = 0, tick = null, keep = false;
  async function startRec() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { return toast('Serve il permesso del microfono 🎤', 3000); }
    const type = pickAudioType();
    rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    chunks = []; keep = false;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(tick); recBar.style.display = 'none'; normalBar.style.display = '';
      const secs = Math.round((Date.now() - t0) / 1000);
      if (!keep) return;
      if (secs < 1) return toast('Troppo corto: tieni premuto un po\' di più');
      const blob = new Blob(chunks, { type: (rec.mimeType || 'audio/mp4').split(';')[0] });
      await sendAudio(blob, secs);
    };
    rec.start(); t0 = Date.now();
    normalBar.style.display = 'none'; recBar.style.display = ''; recTime.textContent = '0:00';
    tick = setInterval(() => {
      const s = (Date.now() - t0) / 1000; recTime.textContent = fmtSecs(s);
      if (s >= AUDIO_MAX) stopRec(true);
    }, 250);
  }
  function stopRec(send) { keep = send; if (rec && rec.state !== 'inactive') rec.stop(); }
  async function sendAudio(blob, secs) {
    if (blob.size > 1048576) return toast('Vocale troppo lungo');
    const ext = blob.type.includes('webm') ? 'webm' : 'm4a';
    const path = `${S.circleId}/${S.me.id}/${Date.now()}.${ext}`;
    toast('Invio il vocale…');
    const up = await sb.storage.from('audio').upload(path, blob, { contentType: blob.type });
    if (up.error) return toast(errMsg(up.error));
    const { data, error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, audio_path: path, audio_secs: secs }).select().single();
    if (error) { sb.storage.from('audio').remove([path]); return toast(errMsg(error)); }
    await voiceToPhone(path, blob);
    appendMsg(data, true);
  }

  root.append(list, h('div', { class: 'chat-input' }, normalBar, recBar));
  toggleBtns();
  const { data, error } = await sb.from('messages').select('*').eq('circle_id', S.circleId).order('created_at', { ascending: false }).limit(100);
  if (error) return list.replaceChildren(h('p', { class: 'error' }, errMsg(error)));
  list.replaceChildren();
  if (!data.length) list.append(h('div', { class: 'empty', id: 'chat-empty' }, h('div', { class: 'big' }, '👋'), h('p', {}, 'Nessun messaggio. Rompi il ghiaccio!')));
  data.reverse().forEach((m) => appendMsg(m, false));
  window.scrollTo(0, document.body.scrollHeight);
  cleanOldAudio();
}

/* --- vocali salvati sul telefono (Cache Storage) --- */
const VOICE_CACHE = 'vocali-chiacchiere';
const voiceKey = (path) => new Request(`${location.origin}/__vocali__/${path}`);
async function voiceFromPhone(path) {
  try { const c = await caches.open(VOICE_CACHE); const r = await c.match(voiceKey(path)); return r ? await r.blob() : null; } catch { return null; }
}
async function voiceToPhone(path, blob) {
  try { const c = await caches.open(VOICE_CACHE); await c.put(voiceKey(path), new Response(blob, { headers: { 'Content-Type': blob.type || 'audio/mp4' } })); } catch {}
}
async function getVoice(path) {
  const local = await voiceFromPhone(path);
  if (local) return local;
  const { data, error } = await sb.storage.from('audio').download(path);
  if (error) return null;
  voiceToPhone(path, data);
  return data;
}
// scarica in sottofondo i vocali che non sono ancora sul telefono
const voiceQueue = [];
let voiceBusy = false;
function queueVoice(m) {
  if (Date.now() - Date.parse(m.created_at) > AUDIO_DAYS * 864e5) return;
  voiceQueue.push(m.audio_path);
  if (!voiceBusy) drainVoices();
}
async function drainVoices() {
  voiceBusy = true;
  while (voiceQueue.length) {
    const p = voiceQueue.shift();
    if (!(await voiceFromPhone(p))) await getVoice(p);
  }
  voiceBusy = false;
}
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

function audioBubble(m) {
  const old = Date.now() - Date.parse(m.created_at) > AUDIO_DAYS * 864e5;
  const btn = h('button', { class: 'play', 'aria-label': 'Ascolta' }, '▶');
  const fill = h('span', { class: 'fill' });
  const dur = h('span', { class: 'dur' }, fmtSecs(m.audio_secs || 0));
  const wrap = h('div', { class: 'bubble voice' }, btn, h('span', { class: 'track' }, fill), dur);
  if (old) {
    btn.disabled = true; dur.textContent = '…';
    voiceFromPhone(m.audio_path).then((b) => { if (b) { btn.disabled = false; dur.textContent = fmtSecs(m.audio_secs || 0); } else dur.textContent = 'scaduto'; });
  } else queueVoice(m);
  let audio = null;
  btn.onclick = async () => {
    if (audio && !audio.paused) { audio.pause(); return; }
    if (!audio) {
      btn.textContent = '…';
      const blob = await getVoice(m.audio_path);
      if (!blob) { btn.textContent = '▶'; return toast('Vocale non disponibile'); }
      audio = new Audio(URL.createObjectURL(blob));
      audio.ontimeupdate = () => { const d = audio.duration && isFinite(audio.duration) ? audio.duration : (m.audio_secs || 1); fill.style.width = Math.min(100, (audio.currentTime / d) * 100) + '%'; dur.textContent = fmtSecs(audio.currentTime); };
      audio.onpause = () => (btn.textContent = '▶');
      audio.onplay = () => (btn.textContent = '❚❚');
      audio.onended = () => { fill.style.width = '0%'; dur.textContent = fmtSecs(m.audio_secs || 0); };
    }
    S.playing?.pause(); S.playing = audio;
    audio.play().catch(() => toast('Non riesco a riprodurlo su questo telefono'));
  };
  return wrap;
}

async function cleanOldAudio() {
  // ognuno cancella i propri vocali più vecchi di 30 giorni (tiene leggero lo spazio gratuito)
  const last = +localStorage.getItem('pulizia-audio') || 0;
  if (Date.now() - last < 864e5) return;
  localStorage.setItem('pulizia-audio', Date.now());
  const folder = `${S.circleId}/${S.me.id}`;
  const { data } = await sb.storage.from('audio').list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } });
  const old = (data || []).filter((f) => Date.now() - Date.parse(f.created_at) > AUDIO_DAYS * 864e5).map((f) => `${folder}/${f.name}`);
  if (old.length) sb.storage.from('audio').remove(old);
}

function appendMsg(m, scroll) {
  const list = document.getElementById('chat'); if (!list) return;
  if (list.querySelector(`[data-id="${m.id}"]`)) return;
  document.getElementById('chat-empty')?.remove();
  const me = m.user_id === S.me.id, w = person(m.user_id);
  const imgUrl = m.image_path ? sb.storage.from('foto').getPublicUrl(m.image_path).data.publicUrl : null;
  const bubble = m.file_path ? fileBubble(m) : m.puzzle ? puzzleChatCard(m) : m.game_id ? chessChatCard(m.game_id) : m.pool_id ? poolChatCard(m.pool_id) : m.foos_id ? torneoChatCard(m.foos_id) : m.audio_path ? audioBubble(m)
    : imgUrl ? h('div', { class: 'bubble photo' }, h('img', { src: imgUrl, loading: 'lazy', alt: 'foto', onclick: () => openPhoto(imgUrl),
        onload: () => { if (scroll) window.scrollTo({ top: document.body.scrollHeight }); } }), m.body ? h('div', { class: 'cap' }, m.body) : null)
    : h('div', { class: 'bubble' }, m.body);
  const row = h('div', { class: 'msg' + (me ? ' me' : ''), 'data-id': m.id },
    me ? null : avatarEl(w, 'sm'),
    h('div', {}, me ? null : h('div', { class: 'who' }, w.username), bubble, h('div', { class: 'time' }, timeOf(m.created_at))));
  onLongPress(bubble, () => messageMenu({
    text: m.body, mine: me, audioPath: m.audio_path, imageUrl: imgUrl, preview: m.audio_path ? `🎤 Vocale (${fmtSecs(m.audio_secs || 0)})` : imgUrl ? `📷 Foto${m.body ? ': ' + m.body : ''}` : m.file_path ? `📎 ${m.file_name}` : m.body,
    onDelete: async () => {
      const { error } = await sb.from('messages').delete().eq('id', m.id);
      if (error) return toast(errMsg(error));
      if (m.audio_path) sb.storage.from('audio').remove([m.audio_path]);
      if (m.image_path) sb.storage.from('foto').remove([m.image_path]);
      if (m.puzzle?.path) sb.storage.from('foto').remove([m.puzzle.path]);
      if (m.file_path) sb.storage.from('file').remove([m.file_path]);
      row.remove(); toast('Messaggio eliminato');
    },
  }));
  list.append(row);
  if (scroll) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

/* ============ GIOCHI ============ */
// crediti: senza autore = originale Chiacchiere; con autore = "creato da …" (giochi e app mandati dagli amici)
function credit(author, light) {
  return h('div', { class: 'credit' + (light ? ' light' : '') + (author ? ' by' : '') }, author ? `✨ creato da ${author}` : 'originale Chiacchiere');
}
const GAMES = {
  parola: { name: 'Parola del giorno', ico: '🔤', desc: 'Indovina la parola di 5 lettere in 6 tentativi.', unit: (s) => (s > 6 ? 'non trovata' : `${s}/6`) },
  riflessi: { name: 'Riflessi', ico: '⚡', desc: 'Tocca appena diventa verde. Chi è più veloce?', unit: (s) => `${s} ms` },
  puzzle: { name: 'Puzzle del giorno', ico: '🧩', desc: '24 pezzi, la stessa immagine per tutti. Chi lo finisce prima?', unit: (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` },
};
async function tabGiochi(root) {
  const view = S.extraView || 'giochi';
  const seg = h('div', { class: 'seg three' }, [['giochi', '🎮 Giochi'], ['storie', '📚 Storie'], ['utilita', '🧰 Utilità']].map(([k, l]) =>
    h('button', { class: view === k ? 'on' : '', onclick: () => { S.extraView = k; render(); } }, l)));
  root.append(seg);
  if (view === 'utilita') return tabUtilita(root);
  if (view === 'storie') return tabStorie(root);
  const today = todayRome();
  const ids = [...S.members.keys()];
  const { data } = await sb.from('game_scores').select('user_id,game,score').eq('day', today).in('user_id', ids);
  const scores = data || [];
  root.append(h('div', { class: 'card hero' }, h('h2', {}, '🎮 Sfide di oggi'),
    h('p', { style: 'margin:0' }, 'Ogni giorno una sfida nuova, uguale per tutti. Il primo tentativo conta per la classifica!')));
  for (const [key, g] of Object.entries(GAMES)) {
    const mine = scores.find((s) => s.user_id === S.me.id && s.game === key);
    const board = scores.filter((s) => s.game === key).sort((a, b) => a.score - b.score);
    root.append(h('div', { class: 'card' },
      h('div', { class: 'game-card', onclick: () => (key === 'parola' ? gameParola() : key === 'puzzle' ? openPuzzleDaily() : gameRiflessi()) },
        h('div', { class: 'gico' }, g.ico),
        h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, g.name), h('div', { class: 'muted small' }, g.desc), credit(g.author)),
        mine ? h('span', { class: 'done-tag' }, '✓ ' + g.unit(mine.score)) : h('span', { class: 'btn small' }, 'Gioca')),
      board.length ? h('div', { style: 'margin-top:12px' }, board.map((s, i) => {
        const w = person(s.user_id);
        return h('div', { class: 'rank' }, h('div', { class: 'pos' }, ['🥇', '🥈', '🥉'][i] || i + 1), avatarEl(w, 'sm'),
          h('div', { style: 'flex:1;font-weight:700' }, w.username), h('div', { class: 'muted' }, g.unit(s.score)));
      })) : h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nessuno ha ancora giocato oggi.')));
  }
  // 🧩 Puzzle
  root.append(h('div', { class: 'card topo-list' },
    h('div', { class: 'game-card', onclick: openPuzzleMenu },
      h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#ffe0b2,#ff8a65)' }, '🧩'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Puzzle'),
        h('div', { class: 'muted small' }, 'Pezzi veri da incastrare, disegni sempre nuovi o le tue foto. Sfida la cerchia a chi fa prima!'), credit()),
      h('span', { class: 'btn small' }, 'Gioca'))));
  // 🎱 Biliardo
  const tiri = await poolTurns().catch(() => 0);
  root.append(h('div', { class: 'card topo-list' },
    h('div', { class: 'game-card', onclick: openPoolLobby },
      h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#bfe8cf,#2f9e63)' }, '🎱'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Biliardo'),
        h('div', { class: 'muted small' }, 'Palla 8: contro il computer, in allenamento o sfidando la cerchia, anche a squadre.'), credit()),
      h('span', { class: 'btn small' }, tiri ? `👉 ${tiri}` : 'Gioca'))));
  // ♟️ Scacchi: sfide nella cerchia
  const turni = await myTurns().catch(() => 0);
  root.append(h('div', { class: 'card topo-list' },
    h('div', { class: 'game-card', onclick: openChessLobby },
      h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#f3e3c3,#c9a26b)' }, '♟️'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Scacchi'),
        h('div', { class: 'muted small' }, 'Sfida qualcuno della cerchia, anche a squadre. Gli altri fanno il tifo!'), credit()),
      h('span', { class: 'btn small' }, turni ? `👉 ${turni}` : 'Gioca'))));
  // 🐭 Topolini Golosi: classifica per livello raggiunto
  const { data: prog } = await sb.from('game_progress').select('user_id,level').eq('game', 'topolini').in('user_id', ids).order('level', { ascending: false });
  const myLv = (prog || []).find((p) => p.user_id === S.me.id)?.level || 1;
  root.append(h('div', { class: 'card topo-list' },
    h('div', { class: 'game-card', onclick: openTopolini },
      h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#ffe0ec,#ffd1a8)' }, '🐭'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Topolini Golosi'),
        h('div', { class: 'muted small' }, 'Libera i topolini e fagli mangiare il disegno, colore per colore.'), credit()),
      h('span', { class: 'btn small' }, myLv > 1 ? `Liv. ${myLv}` : 'Gioca')),
    (prog || []).length ? h('div', { style: 'margin-top:12px' }, h('div', { class: 'muted small', style: 'font-weight:700' }, '🏆 Classifica livelli'),
      prog.map((p, i) => { const w = person(p.user_id);
        return h('div', { class: 'rank' }, h('div', { class: 'pos' }, ['🥇', '🥈', '🥉'][i] || i + 1), avatarEl(w, 'sm'),
          h('div', { style: 'flex:1;font-weight:700' }, w.username), h('div', { class: 'muted' }, `livello ${p.level}`)); }))
      : h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nessuno ha ancora giocato. Inizia tu!')));
  // 🐠 Palline d'Acquario (di Kamy): classifica per record di punti
  const { data: pal } = await sb.from('game_progress').select('user_id,level').eq('game', 'palline').in('user_id', ids).order('level', { ascending: false });
  const myBest = (pal || []).find((p) => p.user_id === S.me.id)?.level || 0;
  root.append(h('div', { class: 'card topo-list' },
    h('div', { class: 'game-card', onclick: openPalline },
      h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#bfeaff,#79d8f2)' }, '🐠'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, "Palline d'Acquario"),
        h('div', { class: 'muted small' }, 'Fai cadere le palline e fondi quelle uguali, fino alla più grande.'), credit('Kamy')),
      h('span', { class: 'btn small' }, myBest ? `🏆 ${myBest.toLocaleString('it-IT')}` : 'Gioca')),
    (pal || []).length ? h('div', { style: 'margin-top:12px' }, h('div', { class: 'muted small', style: 'font-weight:700' }, '🏆 Record della cerchia'),
      pal.map((p, i) => { const w = person(p.user_id);
        return h('div', { class: 'rank' }, h('div', { class: 'pos' }, ['🥇', '🥈', '🥉'][i] || i + 1), avatarEl(w, 'sm'),
          h('div', { style: 'flex:1;font-weight:700' }, w.username), h('div', { class: 'muted' }, `${p.level.toLocaleString('it-IT')} punti`)); }))
      : h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nessun record ancora. Inizia tu!')));
  // ⚔️ Valdorìa Online: gioco esterno di Kamy, si apre nel suo sito
  root.append(h('div', { class: 'card game-card', onclick: () => window.open('https://valdoria-1.onrender.com', '_blank', 'noopener') },
    h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#e3d6ff,#b9a3f0)' }, '⚔️'),
    h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Valdorìa Online'),
      h('div', { class: 'muted small' }, 'Il gioco di ruolo online a carte. Si apre nel suo sito: la prima volta può metterci fino a un minuto a svegliarsi.'), credit('Kamy')),
    h('span', { class: 'btn small ghost' }, 'Apri ↗')));
  root.append(h('div', { class: 'card game-card', onclick: openProposte }, h('div', { class: 'gico' }, '📮'),
    h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Hai fatto un gioco o un\'app?'),
      h('div', { class: 'muted small' }, 'Mandacelo! Se funziona lo aggiungiamo a Chiacchiere per tutti. Anche solo un\'idea va bene.')),
    h('span', { class: 'btn small ghost' }, 'Proponi')));
}

/* ============ UTILITÀ ============ */
function tabUtilita(root) {
  const polls = h('div', { id: 'polls' }, h('p', { class: 'muted small' }, 'Carico…'));
  root.append(
    h('div', { class: 'card santa-card', onclick: openSanta }, h('div', { class: 'santa-card-ico' }, '🎅'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Babbo Natale segreto'),
        h('div', { class: 'small' }, 'Estrazione segreta, budget e idee regalo su Amazon.'), credit(null, true)),
      h('span', { class: 'btn small white' }, 'Apri')),
    h('div', { class: 'card' }, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📊 Sondaggi'),
      h('button', { class: 'btn small', onclick: newPoll }, '➕ Nuovo')),
      h('p', { class: 'muted small', style: 'margin:4px 0 0' }, 'Dove andiamo stasera? Pizza o sushi? Decidete insieme.'), credit(), h('div', { style: 'height:8px' }), polls),
    h('div', { class: 'card game-card', onclick: openFilesList }, h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#e3f2fd,#90caf9)' }, '📁'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'File della cerchia'), h('div', { class: 'muted small' }, 'Tutti i documenti mandati in chat, in un posto solo.'), credit()),
      h('span', { class: 'btn small' }, 'Apri')),
    h('div', { class: 'card game-card', onclick: openTornei }, h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#d6f5d6,#8fd18f)' }, '⚽'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Torneo di calcio balilla'), h('div', { class: 'muted small' }, 'Iscrizioni, coppie portiere + attaccante, girone all\'italiana e finale.'), credit()),
      h('span', { class: 'btn small' }, 'Apri')),
    h('div', { class: 'card game-card', onclick: chiPaga }, h('div', { class: 'gico' }, '🎲'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Chi paga?'), h('div', { class: 'muted small' }, 'Estrae a sorte qualcuno della cerchia. Niente discussioni!'), credit()),
      h('span', { class: 'btn small' }, 'Estrai')),
    h('div', { class: 'card game-card', onclick: openProposte }, h('div', { class: 'gico' }, '📮'),
      h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, 'Ti serve qualcos\'altro?'), h('div', { class: 'muted small' }, 'Proponi un\'utilità o mandaci la tua app: la aggiungiamo per tutti.')),
      h('span', { class: 'btn small ghost' }, 'Proponi')));
  loadPolls(polls);
}

async function loadPolls(box) {
  if (!box) return;
  const { data, error } = await sb.from('polls').select('*, poll_votes(user_id,option)').eq('circle_id', S.circleId).order('created_at', { ascending: false }).limit(20);
  if (error) return box.replaceChildren(h('p', { class: 'error' }, errMsg(error)));
  if (!data.length) return box.replaceChildren(h('p', { class: 'muted small', style: 'margin:0' }, 'Nessun sondaggio. Creane uno!'));
  box.replaceChildren(...data.map(pollCard));
}
function pollCard(p) {
  const votes = p.poll_votes || [], tot = votes.length;
  const mine = votes.find((v) => v.user_id === S.me.id)?.option;
  const author = person(p.user_id);
  return h('div', { class: 'poll' },
    h('div', { class: 'row' }, h('b', { style: 'flex:1' }, p.question), p.closed ? h('span', { class: 'muted small' }, '🔒 chiuso') : null),
    h('div', { class: 'muted small', style: 'margin-bottom:6px' }, `di ${author.username} · ${tot} ${tot === 1 ? 'voto' : 'voti'}`),
    p.options.map((o, i) => {
      const n = votes.filter((v) => v.option === i).length, pct = tot ? Math.round((n / tot) * 100) : 0;
      const voters = votes.filter((v) => v.option === i).map((v) => person(v.user_id).avatar).join('');
      return h('button', { class: 'poll-opt' + (mine === i ? ' on' : ''), disabled: p.closed, onclick: async () => {
        const { error } = await sb.from('poll_votes').upsert({ poll_id: p.id, user_id: S.me.id, option: i });
        if (error) return toast(errMsg(error));
        afterPollChange();
      } }, h('span', { class: 'bar', style: `width:${pct}%` }), h('span', { class: 'lbl' }, o), h('span', { class: 'cnt' }, voters, ` ${pct}%`));
    }),
    h('button', { class: 'linkbtn small', onclick: () => sharePoll(p) }, '📤 Condividi'),
    p.user_id === S.me.id && !p.closed ? h('button', { class: 'linkbtn small', onclick: async () => {
      await sb.from('polls').update({ closed: true }).eq('id', p.id); afterPollChange();
    } }, 'Chiudi sondaggio') : null);
}
async function shareTopic(p) {
  const link = `${inviteLink(circle().invite_code)}&argomento=${p.id}`;
  const who = person(p.user_id).username;
  const text = `🔥 L'argomento di oggi su Chiacchiere, lanciato da ${who}:\n«${(p.body || '📷 foto').slice(0, 200)}»\n${p.polls ? '📊 C\'è anche un sondaggio!\n' : ''}\nDì la tua 👇`;
  if (navigator.share) { try { await navigator.share({ title: 'Argomento di oggi', text, url: link }); } catch {} }
  else { await navigator.clipboard.writeText(`${text}\n${link}`); toast('Link copiato! Incollalo su WhatsApp 👍'); }
}

// anteprima dell'argomento per chi arriva dal link (anche senza account)
async function topicPreviewCard(postId, code, mode) {
  const { data } = await sb.rpc('topic_preview', { p_post: postId, p_code: code });
  const t = data?.[0];
  if (!t) return null;
  const img = t.image_path ? sb.storage.from('foto').getPublicUrl(t.image_path).data.publicUrl : null;
  const poll = t.poll_id ? await pollPreviewCard(t.poll_id, code, mode) : null;
  if (poll) poll.style.cssText = 'margin:12px 0 0;box-shadow:none;background:rgba(255,255,255,.96);color:var(--ink)';
  return h('div', { class: 'card topic', style: 'margin-bottom:14px' },
    h('div', { class: 'topic-head' }, h('span', {}, `🔥 Argomento ${dayLabel(t.day) === 'Oggi' ? 'di oggi' : 'del giorno'}`)),
    h('div', { class: 'post-head' }, avatarEl({ avatar: t.avatar, color: t.color }),
      h('div', {}, h('div', { class: 'name' }, t.author), h('div', { class: 'muted small' }, `in «${t.circle_name}»`))),
    t.body ? h('div', { class: 'post-body' }, t.body) : null,
    img ? h('img', { class: 'post-img', src: img, alt: '' }) : null,
    poll,
    h('p', { style: 'margin:12px 0 0;font-weight:700' }, `💬 ${t.replies} ${t.replies === 1 ? 'risposta' : 'risposte'} · ${t.reactions} reazioni — ` +
      (mode === 'new' ? 'crea il profilo qui sotto per leggerle e dire la tua!' : 'accedi per leggerle e dire la tua!')));
}

async function sharePoll(p) {
  const link = `${inviteLink(circle().invite_code)}&sondaggio=${p.id}`;
  const text = `📊 ${p.question}\n${p.options.map((o) => '▫️ ' + o).join('\n')}\n\nVota qui 👇`;
  if (navigator.share) { try { await navigator.share({ title: 'Sondaggio', text, url: link }); } catch {} }
  else { await navigator.clipboard.writeText(`${text}\n${link}`); toast('Link copiato! Incollalo su WhatsApp 👍'); }
}

// anteprima del sondaggio per chi arriva dal link (anche senza account)
async function pollPreviewCard(pollId, code, mode) {
  const { data } = await sb.rpc('poll_preview', { p_poll: pollId, p_code: code });
  const p = data?.[0];
  if (!p) return null;
  let chosen = JSON.parse(localStorage.getItem('votoPendente') || 'null')?.option;
  const opts = h('div');
  const draw = () => opts.replaceChildren(...p.options.map((o, i) => {
    const n = p.counts[i] || 0, tot = p.total + (chosen != null ? 1 : 0);
    const mineN = n + (chosen === i ? 1 : 0), pct = tot ? Math.round((mineN / tot) * 100) : 0;
    return h('button', { type: 'button', class: 'poll-opt' + (chosen === i ? ' on' : ''), disabled: p.closed, onclick: () => {
      chosen = i; localStorage.setItem('votoPendente', JSON.stringify({ poll: pollId, option: i })); draw();
    } }, h('span', { class: 'bar', style: `width:${pct}%` }), h('span', { class: 'lbl' }, o), h('span', { class: 'cnt' }, `${pct}%`));
  }));
  draw();
  return h('div', { class: 'card', style: 'margin-bottom:14px' },
    h('div', { class: 'muted small' }, `📊 Sondaggio di ${p.author} · ${p.total} ${p.total === 1 ? 'voto' : 'voti'}`),
    h('h2', { style: 'margin:6px 0 10px' }, p.question), opts,
    h('p', { class: 'small', style: 'margin:8px 0 0;font-weight:700;color:var(--brand-dark)' },
      p.closed ? 'Questo sondaggio è chiuso.' : mode === 'new' ? '👆 Scegli, poi crea il profilo qui sotto: il tuo voto conta subito!' : '👆 Scegli, poi accedi: il tuo voto conta subito!'));
}

function newPoll() {
  const q = h('input', { class: 'input', maxlength: 200, placeholder: 'es. Dove andiamo sabato?' });
  const opts = h('div', { class: 'stack' });
  const addOpt = (v = '') => { if (opts.children.length < 6) opts.append(h('input', { class: 'input', maxlength: 60, placeholder: `Opzione ${opts.children.length + 1}`, value: v })); };
  addOpt(); addOpt();
  const err = h('div', { class: 'error' });
  openSheet(h('form', { onsubmit: async (e) => {
    e.preventDefault();
    const options = [...opts.querySelectorAll('input')].map((x) => x.value.trim()).filter(Boolean);
    if (q.value.trim().length < 2) return (err.textContent = 'Scrivi la domanda.');
    if (options.length < 2) return (err.textContent = 'Servono almeno 2 opzioni.');
    const { error } = await sb.from('polls').insert({ circle_id: S.circleId, user_id: S.me.id, question: q.value.trim(), options });
    if (error) return (err.textContent = errMsg(error));
    closeSheet(); toast('Sondaggio creato! 📊');
    sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `📊 Nuovo sondaggio: «${q.value.trim()}» — vota in Extra → Utilità!` }).then(() => {});
    loadPolls(document.getElementById('polls'));
  } },
    h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📊 Nuovo sondaggio'), h('button', { class: 'btn plain', type: 'button', onclick: closeSheet }, '✕')),
    h('div', { class: 'field', style: 'margin-top:12px' }, h('label', {}, 'Domanda'), q),
    h('div', { class: 'field' }, h('label', {}, 'Opzioni'), opts,
      h('button', { class: 'linkbtn', type: 'button', onclick: () => addOpt() }, '➕ Aggiungi opzione')),
    err, h('button', { class: 'btn block' }, 'Crea sondaggio')));
}

function chiPaga() {
  const people = [...S.members.values()];
  const chosen = new Set(people.map((p) => p.id));
  const stage = h('div', { class: 'wheel' }, '🎲');
  const list = h('div', { class: 'row wrap', style: 'justify-content:center;margin:12px 0' }, people.map((p) => {
    const b = h('button', { class: 'chip on', type: 'button', onclick: () => {
      chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id); b.classList.toggle('on');
    } }, `${p.avatar} ${p.username}`);
    return b;
  }));
  const go = h('button', { class: 'btn block', onclick: () => {
    const pool = people.filter((p) => chosen.has(p.id));
    if (pool.length < 2) return toast('Scegli almeno 2 persone');
    go.disabled = true; let i = 0, steps = 18 + Math.floor(Math.random() * pool.length);
    const tick = () => {
      const p = pool[i++ % pool.length];
      stage.replaceChildren(h('div', { style: 'font-size:64px' }, p.avatar), h('div', { style: 'font-size:1.3rem;font-weight:700' }, p.username));
      if (i < steps) return setTimeout(tick, 60 + i * 12);
      stage.classList.add('win'); go.disabled = false; go.textContent = 'Estrai di nuovo';
      share.style.display = '';
      share.onclick = async () => {
        const { error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🎲 Estrazione «Chi paga?»: tocca a ${p.username}! ${p.avatar}💸` });
        toast(error ? errMsg(error) : 'Mandato in chat 😈');
      };
    };
    stage.classList.remove('win'); share.style.display = 'none'; tick();
  } }, '🎲 Estrai');
  const share = h('button', { class: 'btn ghost block', style: 'margin-top:10px;display:none' }, '💬 Manda il verdetto in chat');
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '🎲 Chi paga?'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
    h('p', { class: 'muted small' }, 'Tocca i nomi per togliere chi non c\'è.'), list, stage, go, share));
}

/* ============ BABBO NATALE SEGRETO ============ */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));
const amazonLink = (q, lo, hi) => `https://www.amazon.it/s?k=${encodeURIComponent(q || 'idee regalo')}&rh=p_36%3A${lo * 100}-${hi * 100}`;
const daysTo = (d) => Math.ceil((Date.parse(d + 'T12:00:00') - Date.now()) / 864e5);

const AMZ_RE = /^https:\/\/([a-z0-9-]+\.)*(amazon\.[a-z.]+|amzn\.(eu|to|com|it))(\/|$)/i;
// pagina "condividi" di Amazon: il link è spesso dentro un testo, lo tiro fuori
const pickUrl = (t) => (String(t).match(/https:\/\/\S+/) || [''])[0].replace(/[)\].,]+$/, '');
function wishEditor(ev, me, onSaved) {
  const wish = h('textarea', { class: 'input', maxlength: 500, placeholder: 'es. Libri gialli, cose per il caffè, niente calzini 😅' });
  wish.value = me?.wishlist || '';
  const links = [0, 1].map((i) => { const x = h('input', { class: 'input', type: 'url', inputmode: 'url', placeholder: `🔗 Link Amazon ${i + 1} (facoltativo)` }); x.value = me?.wish_links?.[i] || ''; return x; });
  return h('div', { class: 'stack' },
    h('label', { style: 'margin-top:6px' }, '💭 Cosa ti piacerebbe ricevere?'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Indizi per chi ti farà il regalo. Tutto facoltativo.'),
    wish, ...links,
    h('p', { class: 'muted small', style: 'margin:0' }, 'Su Amazon apri il prodotto → tocca Condividi → Copia link, poi incollalo qui.'),
    h('button', { class: 'btn small', onclick: async () => {
      const urls = links.map((x) => pickUrl(x.value.trim())).filter(Boolean);
      const bad = urls.find((u) => !AMZ_RE.test(u));
      if (links.some((x) => x.value.trim() && !pickUrl(x.value.trim())) || bad) return toast('Incolla un link di Amazon (inizia con https://)', 3500);
      const { error } = await sb.from('santa_participants').update({ wishlist: wish.value.trim() || null, wish_links: urls }).eq('event_id', ev.id).eq('user_id', S.me.id);
      if (error) return toast(errMsg(error));
      toast('Desideri salvati 🎁'); onSaved?.();
    } }, 'Salva desideri'));
}

async function openSanta() {
  const box = h('div', {}, h('p', { class: 'muted center' }, 'Carico…'));
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '🎅 Babbo Natale segreto'),
    h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), box));
  await renderSanta(box);
}

async function renderSanta(box) {
  const { data: ev } = await sb.from('santa_events').select('*').eq('circle_id', S.circleId).maybeSingle();
  if (!ev) return fill(box, santaCreate(box));
  const [{ data: parts }, { data: mine }] = await Promise.all([
    sb.from('santa_participants').select('*').eq('event_id', ev.id).order('joined_at'),
    sb.from('santa_assignments').select('receiver').eq('event_id', ev.id).maybeSingle(),
  ]);
  const me = (parts || []).find((p) => p.user_id === S.me.id);
  const owner = ev.owner === S.me.id;
  const lo = Math.max(1, Math.round(ev.budget * 2 / 3)), hi = ev.budget;
  const info = h('div', { class: 'santa-info' },
    h('span', { class: 'pill' }, `💶 Budget ${ev.budget} €`),
    ev.exchange_date ? h('span', { class: 'pill' }, `📅 ${new Date(ev.exchange_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}${daysTo(ev.exchange_date) >= 0 ? ` · tra ${daysTo(ev.exchange_date)} giorni` : ''}`) : null,
    h('span', { class: 'pill' }, `👑 ${person(ev.owner).username}`));
  const note = ev.note ? h('p', { class: 'santa-note' }, ev.note) : null;
  const avatars = h('div', { class: 'row wrap', style: 'gap:6px' }, (parts || []).map((p) => h('div', { class: 'santa-who' + (p.bought ? ' done' : '') }, avatarEl(person(p.user_id), 'sm'), person(p.user_id).username, p.bought && ev.status === 'estratto' ? ' 🎁' : '')));
  const inviteBtn = h('button', { class: 'btn ghost block', onclick: async () => {
    const link = inviteLink(circle().invite_code) + '&apri=santa';
    const text = `🎅 Facciamo il Babbo Natale segreto! Budget ${ev.budget} €. Entra e dimmi se partecipi:`;
    if (navigator.share) { try { await navigator.share({ title: 'Babbo Natale segreto', text, url: link }); } catch {} }
    else { await navigator.clipboard.writeText(`${text} ${link}`); toast('Link copiato! Incollalo su WhatsApp 👍'); }
  } }, '📤 Invita gli amici a partecipare');

  if (ev.status === 'aperto') {
    const part = me
      ? h('div', { class: 'stack' },
          h('div', { class: 'done-tag', style: 'display:inline-block' }, '✓ Partecipi'),
          wishEditor(ev, me, () => renderSanta(box)),
          h('div', { class: 'row' }, h('div', { class: 'spacer' }),
            h('button', { class: 'linkbtn small', onclick: async () => {
              if (!(await askConfirm('Non partecipi più?', 'Puoi sempre rientrare finché non si fa l\'estrazione.', 'Sì, mi ritiro'))) return openSanta();
              await sb.from('santa_participants').delete().eq('event_id', ev.id).eq('user_id', S.me.id); openSanta();
            } }, 'Mi ritiro')))
      : h('div', { class: 'card center', style: 'background:#fff7f0;box-shadow:none' },
          h('p', { style: 'font-weight:700;font-size:1.1rem' }, 'Partecipi anche tu? 🎄'),
          h('button', { class: 'btn block', onclick: async () => {
            const { error } = await sb.from('santa_participants').insert({ event_id: ev.id, user_id: S.me.id });
            if (error) return toast(errMsg(error));
            toast('Sei dentro! 🎅'); renderSanta(box);
          } }, '🎅 Sì, partecipo!'));
    const n = (parts || []).length;
    fill(box, h('div', { class: 'santa-hero' }, h('div', { class: 'santa-big' }, '🎄'), h('b', {}, 'Iscrizioni aperte'),
        h('div', { class: 'small' }, `${n} ${n === 1 ? 'partecipante' : 'partecipanti'} finora`)),
      info, note, avatars, h('div', { style: 'margin-top:14px' }, part),
      h('div', { style: 'margin-top:14px' }, inviteBtn),
      owner ? h('div', { class: 'stack', style: 'margin-top:14px' },
        h('button', { class: 'btn block', disabled: n < 3, onclick: async () => {
          if (!(await askConfirm('🎲 Fare l\'estrazione?', `Partecipano in ${n}. Dopo non si potrà più entrare né uscire.`, 'Estrai!'))) return openSanta();
          const { error } = await sb.rpc('santa_draw', { e: ev.id });
          if (error) { toast(errMsg(error)); return openSanta(); }
          sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: '🎅 Estrazione fatta! Andate in Extra → Utilità → Babbo Natale segreto per scoprire a chi fate il regalo 🤫' }).then(() => {});
          toast('Estrazione fatta! 🎉'); openSanta();
        } }, n < 3 ? `🎲 Estrai (servono almeno 3 persone)` : `🎲 Estrai gli abbinamenti (${n})`),
        h('button', { class: 'linkbtn small', onclick: async () => {
          if (!(await askConfirm('Annullare il Babbo Natale segreto?', 'Si cancellano iscrizioni e desideri.', 'Sì, annulla'))) return openSanta();
          await sb.from('santa_events').delete().eq('id', ev.id); toast('Evento annullato'); openSanta();
        } }, 'Annulla l\'evento')) : null);
    return;
  }

  // ESTRAZIONE FATTA
  const bought = (parts || []).filter((p) => p.bought).length;
  const progress = h('p', { class: 'muted small center', style: 'margin:10px 0 0' }, `🎁 ${bought} su ${(parts || []).length} hanno già il regalo`);
  if (!me || !mine) {
    fill(box, h('div', { class: 'santa-hero' }, h('div', { class: 'santa-big' }, '🎅'), h('b', {}, 'Estrazione già fatta'),
      h('div', { class: 'small' }, 'Quest\'anno non partecipi, ma puoi fare il tifo!')), info, avatars, progress);
    return;
  }
  const rec = person(mine.receiver);
  const recP = (parts || []).find((p) => p.user_id === mine.receiver);
  const recWish = recP?.wishlist;
  const recLinks = (recP?.wish_links || []).filter((u) => AMZ_RE.test(u));
  const q = h('input', { class: 'input', placeholder: 'Cosa cerchi? es. tazza, libro, gioco…', value: '' });
  q.value = recWish ? recWish.split(/[,.\n]/)[0].trim().slice(0, 40) : '';
  const go = (term) => window.open(amazonLink(term, lo, hi), '_blank', 'noopener');
  fill(box, 
    h('div', { class: 'santa-hero secret' }, h('div', { class: 'small' }, '🤫 Shhh… devi fare il regalo a'),
      avatarEl(rec, 'big'), h('div', { class: 'santa-name' }, rec.username)),
    recWish ? h('div', { class: 'santa-note' }, h('b', {}, `💭 ${rec.username} desidera: `), recWish) : null,
    recLinks.length ? h('div', { class: 'stack', style: 'margin-bottom:10px' }, recLinks.map((u, i) =>
      h('a', { class: 'btn block amz', href: u, target: '_blank', rel: 'noopener noreferrer' }, `🎁 Desiderio ${i + 1}: vedi su Amazon`))) : null,
    !recWish && !recLinks.length ? h('p', { class: 'muted small center' }, `${rec.username} non ha lasciato indizi (per ora): vai d'istinto!`) : null,
    info,
    h('div', { class: 'card', style: 'margin-top:14px;box-shadow:none;background:#fff7f0' },
      h('h3', {}, `🔎 Idee tra ${lo} € e ${hi} €`),
      h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); go(q.value.trim()); } }, q, h('button', { class: 'btn small' }, 'Cerca')),
      h('div', { class: 'row wrap', style: 'margin-top:10px;gap:6px' },
        ['idee regalo', 'regalo per lei', 'regalo per lui', 'gadget divertenti', 'gioco da tavolo', 'kit caffè'].map((t) =>
          h('button', { class: 'chip on', type: 'button', onclick: () => go(t) }, t))),
      h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Si apre Amazon con i prezzi già filtrati.')),
    h('button', { class: 'btn block' + (me.bought ? ' ghost' : ''), style: 'margin-top:12px', onclick: async () => {
      const { error } = await sb.from('santa_participants').update({ bought: !me.bought }).eq('event_id', ev.id).eq('user_id', S.me.id);
      if (error) return toast(errMsg(error));
      toast(me.bought ? 'Ok, ancora da comprare' : 'Grande! Regalo pronto 🎁'); renderSanta(box);
    } }, me.bought ? '✓ Regalo comprato (tocca per annullare)' : '🎁 Ho comprato il regalo'),
    progress,
    h('details', { class: 'card', style: 'margin-top:14px;box-shadow:none;background:#fff7f0' },
      h('summary', { style: 'font-weight:700;cursor:pointer' }, '💭 I tuoi desideri (indizi per il tuo Babbo Natale)'),
      wishEditor(ev, me, () => renderSanta(box))));
}

function santaCreate(box) {
  let budget = 30;
  const budgets = h('div', { class: 'row wrap', style: 'gap:6px' }, [10, 20, 30, 50].map((b) => {
    const el = h('button', { type: 'button', class: 'chip' + (b === budget ? ' on' : ''), onclick: () => {
      budget = b; custom.value = ''; budgets.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); el.classList.add('on');
    } }, `${b} €`);
    return el;
  }));
  const custom = h('input', { class: 'input', type: 'number', min: 5, max: 500, placeholder: 'Altro importo €', style: 'margin-top:8px',
    oninput: () => { budgets.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); budget = +custom.value || 0; } });
  const date = h('input', { class: 'input', type: 'date', value: `${new Date().getFullYear()}-12-24` });
  const note = h('input', { class: 'input', maxlength: 300, placeholder: 'es. Scambio dei regali alla cena di Natale 🎄' });
  const err = h('div', { class: 'error' });
  return h('div', {},
    h('div', { class: 'santa-hero' }, h('div', { class: 'santa-big' }, '🎅🎁'),
      h('b', {}, 'Come funziona'),
      h('div', { class: 'small', style: 'text-align:left;margin-top:6px' },
        '1. Crei l\'evento e scegli il budget', h('br'), '2. Gli amici della cerchia dicono se partecipano', h('br'),
        '3. Fai l\'estrazione: ognuno scopre in segreto a chi fare il regalo', h('br'), '4. L\'app ti suggerisce idee su Amazon nel budget')),
    h('form', { style: 'margin-top:14px', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      if (budget < 5 || budget > 500) return (err.textContent = 'Scegli un budget tra 5 e 500 €');
      const { data, error } = await sb.from('santa_events').insert({ circle_id: S.circleId, owner: S.me.id, budget, exchange_date: date.value || null, note: note.value.trim() || null }).select('id').single();
      if (error) return (err.textContent = errMsg(error));
      await sb.from('santa_participants').insert({ event_id: data.id, user_id: S.me.id });
      sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🎅 Ho organizzato il Babbo Natale segreto! Budget ${budget} €. Partecipate? Extra → Utilità → Babbo Natale segreto` }).then(() => {});
      toast('Evento creato! 🎄'); renderSanta(box);
    } },
      h('div', { class: 'field' }, h('label', {}, '💶 Budget a testa'), budgets, custom),
      h('div', { class: 'field' }, h('label', {}, '📅 Giorno dello scambio'), date),
      h('div', { class: 'field' }, h('label', {}, '📝 Nota (facoltativa)'), note),
      err, h('button', { class: 'btn block' }, '🎄 Crea il Babbo Natale segreto')));
}

/* --- Posta delle proposte --- */
const STATUS = { 'nuova': ['📨', 'Ricevuta'], 'in valutazione': ['🔍', 'La stiamo provando'], 'aggiunta': ['🎉', 'Aggiunta all\'app!'], 'non adatta': ['🙏', 'Non adatta per ora'] };
function fileToBase64(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(f); });
}
async function openProposte() {
  let kind = 'gioco';
  const err = h('div', { class: 'error' });
  const title = h('input', { class: 'input', maxlength: 80, placeholder: 'es. Briscola online' });
  const desc = h('textarea', { class: 'input', maxlength: 3000, placeholder: 'Com\'è fatto, come si gioca, cosa ti piacerebbe…' });
  const link = h('input', { class: 'input', type: 'url', maxlength: 500, placeholder: 'https://… (facoltativo)' });
  const files = h('input', { type: 'file', multiple: true, class: 'input', style: 'padding:10px' });
  const kinds = h('div', { class: 'row wrap' }, [['gioco', '🎮 Gioco'], ['app', '🧰 App / utilità'], ['idea', '💡 Idea']].map(([k, l]) => {
    const b = h('button', { type: 'button', class: 'btn small' + (k === kind ? '' : ' ghost'), onclick: () => {
      kind = k; kinds.querySelectorAll('button').forEach((x) => x.classList.add('ghost')); b.classList.remove('ghost');
    } }, l);
    return b;
  }));
  const mine = h('div', {}, h('p', { class: 'muted small' }, 'Carico…'));
  const send = h('button', { class: 'btn block', type: 'submit' }, '📮 Invia proposta');
  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    const fl = [...files.files];
    if (title.value.trim().length < 2) return (err.textContent = 'Dai un nome alla tua proposta.');
    if (fl.length > 3) return (err.textContent = 'Massimo 3 file.');
    const big = fl.find((f) => f.size > 5 * 1024 * 1024);
    if (big) return (err.textContent = `«${big.name}» è più grande di 5 MB. Caricalo su Google Drive e metti il link.`);
    if (link.value && !/^https:\/\//i.test(link.value.trim())) return (err.textContent = 'Il link deve iniziare con https://');
    send.disabled = true; send.textContent = 'Invio…';
    try {
      const { data: sub, error } = await sb.from('submissions').insert({ user_id: S.me.id, kind, title: title.value.trim(),
        description: desc.value.trim() || null, link: link.value.trim() || null }).select('id').single();
      if (error) throw error;
      for (const f of fl) {
        const { error: fe } = await sb.from('submission_files').insert({ submission_id: sub.id, name: f.name, mime: f.type || null, size: f.size, data_base64: await fileToBase64(f) });
        if (fe) throw fe;
      }
      toast('Proposta inviata, grazie! 🙌');
      form.reset(); loadMine();
    } catch (ex) { err.textContent = errMsg(ex); }
    send.disabled = false; send.textContent = '📮 Invia proposta';
  } },
    h('div', { class: 'field' }, h('label', {}, 'Cosa ci mandi?'), kinds),
    h('div', { class: 'field' }, h('label', {}, 'Nome'), title),
    h('div', { class: 'field' }, h('label', {}, 'Descrizione'), desc),
    h('div', { class: 'field' }, h('label', {}, 'File'), files,
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Fino a 3 file da 5 MB: HTML, ZIP, codice, immagini. Per un APK manda anche il codice sorgente, o un link.')),
    h('div', { class: 'field' }, h('label', {}, 'Link'), link),
    err, send);
  async function loadMine() {
    const { data } = await sb.from('submissions').select('id,kind,title,status,reply,created_at').order('created_at', { ascending: false });
    if (!data?.length) return mine.replaceChildren(h('p', { class: 'muted small' }, 'Non hai ancora mandato niente.'));
    mine.replaceChildren(...data.map((s) => h('div', { class: 'rank', style: 'align-items:flex-start' },
      h('div', { style: 'font-size:22px' }, STATUS[s.status][0]),
      h('div', { style: 'flex:1' }, h('b', {}, s.title), h('div', { class: 'muted small' }, STATUS[s.status][1]),
        s.reply ? h('div', { class: 'comment', style: 'margin-top:6px' }, h('div', { class: 'bubble' }, h('b', {}, 'Risposta'), s.reply)) : null))));
  }
  loadMine();
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📮 Proponi un gioco o un\'app'),
    h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
  h('p', { class: 'muted' }, 'Gli diamo un\'occhiata, lo proviamo e, se va, lo aggiungiamo a Chiacchiere per tutti.'),
  form, h('h3', { style: 'margin-top:22px' }, 'Le tue proposte'), mine));
}

async function openTopolini() {
  const key = `topolini-${S.me.id}`;
  const { data } = await sb.from('game_progress').select('level').eq('user_id', S.me.id).eq('game', 'topolini').maybeSingle();
  const level = Math.max(+localStorage.getItem(key) || 1, data?.level || 1);
  const { startTopolini } = await import('./topolini.js?v=36');
  startTopolini({
    level,
    onWin: async (next) => {
      localStorage.setItem(key, next);
      await sb.from('game_progress').upsert({ user_id: S.me.id, game: 'topolini', level: next, updated_at: new Date().toISOString() });
      if ((next - 1) % 5 === 0) sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🐭 Ho finito il livello ${next - 1} di Topolini Golosi! Chi mi batte? 🧀` }).then(() => {});
    },
    onClose: () => { if (S.tab === 'giochi') render(); },
  });
}

// giochi e storie "esterni" girano in una finestra interna e ci mandano i risultati con postMessage
function openFrame({ src, title, bg, from, onMessage }) {
  const frame = h('iframe', { class: 'game-frame', src, allow: 'autoplay; accelerometer; gyroscope', title });
  const wrap = h('div', { class: 'game-wrap', style: bg ? `background:${bg}` : '' },
    h('div', { class: 'game-bar' }, h('button', { class: 'topo-x', 'aria-label': 'Chiudi', onclick: close }, '✕'),
      h('b', { style: 'flex:1;text-align:center' }, title), h('div', { style: 'width:44px' })),
    frame);
  document.body.append(wrap); document.body.style.overflow = 'hidden';
  const onMsg = (e) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || e.data?.from !== from) return;
    onMessage?.(e.data);
  };
  window.addEventListener('message', onMsg);
  function close() {
    window.removeEventListener('message', onMsg);
    wrap.remove(); document.body.style.overflow = '';
    if (S.tab === 'giochi') render();
  }
}

// 🐠 Palline d'Acquario: a fine partita ci manda il punteggio
function openPalline() {
  openFrame({
    src: `giochi/palline/index.html?v=${VERSIONE}&chiacchiere=1&nick=${encodeURIComponent(S.me.username)}`,
    title: "🐠 Palline d'Acquario", bg: '#06304f', from: 'palline',
    onMessage: async (d) => {
      if (d.type !== 'score') return;
      const sc = Math.floor(+d.score || 0);
      if (sc <= 0) return;
      const { data: mine } = await sb.from('game_progress').select('level').eq('user_id', S.me.id).eq('game', 'palline').maybeSingle();
      if (mine && mine.level >= sc) return;
      const ids = [...S.members.keys()].filter((id) => id !== S.me.id);
      const { data: top } = await sb.from('game_progress').select('level').eq('game', 'palline').in('user_id', ids).order('level', { ascending: false }).limit(1);
      await sb.from('game_progress').upsert({ user_id: S.me.id, game: 'palline', level: sc, updated_at: new Date().toISOString() });
      if (!top?.length || sc > top[0].level) {
        sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🐠 Nuovo record della cerchia a Palline d'Acquario: ${sc.toLocaleString('it-IT')} punti! Chi mi batte?` }).then(() => {});
      }
    },
  });
}

/* ============ STORIE (audio-libri game di Kamy) ============ */
const STORIE = [
  { id: 'bora', titolo: 'Il Carico della Bora', sopra: 'Trieste, 1910', ico: '🌬️', bg: '#1d2430', finali: 17,
    desc: "Un'indagine del Detective Kamy tra il porto e le raffiche di bora." },
  { id: 'moretta', titolo: 'La Moretta', sopra: 'Venezia, novembre 1991', ico: '🎭', bg: '#1a1620', finali: 12,
    desc: "Tre morti, una maschera muta, una città che affonda nella nebbia. L'ispettrice Giulia Sartori dà la caccia a un'assassina." },
  { id: 'valdaria', titolo: 'Ritorno a Valdaria', sopra: 'Appennino emiliano, ottobre 1978', ico: '🏚️', bg: '#161a16', finali: 7,
    desc: 'Sette pazienti dimessi dal manicomio non sono mai arrivati a casa. Il giornalista Matteo Lanza sale lassù per un giorno.' },
  { id: 'viaggio1911', titolo: 'Il viaggio di Baciccia', sopra: 'Italia, 1911', ico: '🚂', bg: '#241d14', finali: 28,
    desc: 'Manarola, notte del XX Settembre: venti città da attraversare in treno con poche lire in tasca.' },
];
async function tabStorie(root) {
  const ids = [...S.members.keys()];
  const { data } = await sb.from('game_progress').select('user_id,game,level').like('game', 'storia-%').in('user_id', ids);
  root.append(h('div', { class: 'card hero' }, h('h2', {}, '📚 Storie da ascoltare'),
    h('p', { style: 'margin:0' }, 'Audio-libri game: ascolti la storia e decidi tu come va avanti. Ogni scelta può portare a un finale diverso.')));
  for (const st of STORIE) {
    const readers = (data || []).filter((r) => r.game === 'storia-' + st.id).sort((a, b) => b.level - a.level);
    const mine = readers.find((r) => r.user_id === S.me.id)?.level || 0;
    root.append(h('div', { class: 'card topo-list' },
      h('div', { class: 'game-card', onclick: () => openStoria(st) },
        h('div', { class: 'gico', style: 'background:linear-gradient(135deg,#efe3d0,#d8c4a6)' }, st.ico),
        h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, st.titolo),
          h('div', { class: 'muted small' }, st.sopra), credit('Kamy')),
        h('span', { class: 'btn small' }, mine ? `${mine}/${st.finali}` : 'Ascolta')),
      h('p', { class: 'small', style: 'margin:10px 0 0' }, st.desc),
      readers.length ? h('div', { class: 'row wrap', style: 'gap:6px;margin-top:10px' }, readers.map((r) => {
        const w = person(r.user_id);
        return h('span', { class: 'santa-who' }, avatarEl(w, 'sm'), `${w.username} · ${r.level}/${st.finali} finali`);
      })) : h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Nessuno della cerchia l\'ha ancora finita.')));
  }
}
function openStoria(st) {
  openFrame({
    src: `giochi/storie/${st.id}/index.html?v=${VERSIONE}&chiacchiere=1`,
    title: `${st.ico} ${st.titolo}`, bg: st.bg, from: 'storia',
    onMessage: async (d) => {
      if (d.type !== 'finale' || !d.nuovo) return;
      const game = 'storia-' + st.id, n = Math.max(1, Math.floor(+d.trovati || 1)), tot = Math.floor(+d.totali || st.finali);
      const { data: mine } = await sb.from('game_progress').select('level').eq('user_id', S.me.id).eq('game', game).maybeSingle();
      if (mine && mine.level >= n) return;
      await sb.from('game_progress').upsert({ user_id: S.me.id, game, level: n, updated_at: new Date().toISOString() });
      sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id,
        body: n >= tot ? `📚 Ho scoperto TUTTI i ${tot} finali di «${st.titolo}»! 🏆` : `📚 Ho trovato un nuovo finale di «${st.titolo}» (${n} su ${tot}). Chi la prova?` }).then(() => {});
    },
  });
}

async function saveScore(game, score, detail) {
  const { error } = await sb.from('game_scores').insert({ user_id: S.me.id, game, score, detail });
  if (error && error.code !== '23505') toast(errMsg(error));
}

/* --- Parola del giorno --- */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wordOfDay(day) {
  const list = [...PAROLE]; const r = rng(20261126);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const n = Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse('2026-11-26T12:00:00Z')) / 864e5);
  return list[((n % list.length) + list.length) % list.length];
}
function evaluate(guess, sol) {
  const res = Array(5).fill('x'), left = {};
  for (let i = 0; i < 5; i++) { if (guess[i] === sol[i]) res[i] = 'g'; else left[sol[i]] = (left[sol[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) if (res[i] !== 'g' && left[guess[i]]) { res[i] = 'y'; left[guess[i]]--; }
  return res;
}
function gameParola() {
  const day = todayRome(), sol = wordOfDay(day), key = `parola-${day}-${S.me.id}`;
  let guesses = JSON.parse(localStorage.getItem(key) || '[]'), cur = '';
  const won = () => guesses.includes(sol), over = () => won() || guesses.length >= 6;
  const boardEl = h('div', { class: 'board' }), kbEl = h('div', { class: 'kb' }), msg = h('div', { class: 'center', style: 'min-height:28px;font-weight:700' });
  function draw() {
    boardEl.replaceChildren(...Array.from({ length: 6 }, (_, r) => {
      const g = guesses[r], ev = g ? evaluate(g, sol) : null, txt = g || (r === guesses.length ? cur : '');
      return h('div', { class: 'r' }, Array.from({ length: 5 }, (_, i) => h('div', { class: 'tile' + (ev ? ' ' + ev[i] : txt[i] ? ' filled' : '') }, txt[i] || '')));
    }));
    const st = {};
    guesses.forEach((g) => evaluate(g, sol).forEach((v, i) => { const c = g[i], o = st[c]; if (v === 'g' || (v === 'y' && o !== 'g') || !o) st[c] = v; }));
    kbEl.replaceChildren(...['qwertyuiop', 'asdfghjkl', '⌫zxcvbnm⏎'].map((row) => h('div', { class: 'kr' }, [...row].map((k) =>
      h('button', { class: 'key' + (k === '⌫' || k === '⏎' ? ' wide' : '') + (st[k] ? ' ' + st[k] : ''), onclick: () => press(k) }, k === '⏎' ? 'Invio' : k)))));
    if (over()) {
      kbEl.style.display = 'none';
      const n = won() ? guesses.length : 7;
      const grid = guesses.map((g) => evaluate(g, sol).map((v) => ({ g: '🟩', y: '🟨', x: '⬜' })[v]).join('')).join('\n');
      msg.replaceChildren(h('div', {}, won() ? `Bravo! L'hai trovata in ${n} ${n === 1 ? 'tentativo' : 'tentativi'} 🎉` : `Peccato! La parola era: ${sol.toUpperCase()}`),
        h('button', { class: 'btn ghost', style: 'margin-top:10px', onclick: async () => {
          const { error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body: `🔤 Parola del giorno ${won() ? n : 'X'}/6\n${grid}` });
          toast(error ? errMsg(error) : 'Risultato mandato in chat! 💬');
        } }, '💬 Manda il risultato in chat'));
    }
  }
  async function press(k) {
    if (over()) return;
    if (k === '⌫' || k === 'Backspace') cur = cur.slice(0, -1);
    else if (k === '⏎' || k === 'Enter') {
      if (cur.length < 5) { boardEl.children[guesses.length]?.classList.add('shake'); setTimeout(() => boardEl.children[guesses.length]?.classList.remove('shake'), 400); msg.textContent = 'Servono 5 lettere'; return; }
      guesses.push(cur); cur = ''; localStorage.setItem(key, JSON.stringify(guesses));
      if (over()) saveScore('parola', won() ? guesses.length : 7, { tentativi: guesses.length });
    } else if (/^[a-z]$/i.test(k) && cur.length < 5) cur += k.toLowerCase();
    msg.textContent = ''; draw();
  }
  const onKey = (e) => { if (e.ctrlKey || e.metaKey) return; press(e.key); };
  document.addEventListener('keydown', onKey);
  draw();
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '🔤 Parola del giorno'),
    h('button', { class: 'btn plain', onclick: closeSheet }, '✕')),
  h('p', { class: 'muted small' }, '🟩 lettera giusta al posto giusto · 🟨 c\'è ma in un altro posto · ⬜ non c\'è'),
  boardEl, msg, kbEl), () => { document.removeEventListener('keydown', onKey); if (S.tab === 'giochi') render(); });
}

/* --- Riflessi --- */
async function gameRiflessi() {
  const { data: done } = await sb.from('game_scores').select('score').eq('user_id', S.me.id).eq('game', 'riflessi').eq('day', todayRome()).maybeSingle();
  const ROUNDS = 5; let times = [], state = 'idle', t0 = 0, timer = null;
  const pad = h('div', { class: 'reflex-pad' }), info = h('p', { class: 'center muted' });
  const set = (cls, txt) => { pad.className = 'reflex-pad ' + cls; pad.textContent = txt; };
  function next() {
    state = 'wait'; set('wait', 'Aspetta il verde…');
    timer = setTimeout(() => { state = 'go'; t0 = performance.now(); set('go', 'TOCCA!'); }, 1200 + Math.random() * 2500);
  }
  function finish() {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    state = 'end'; set('', `Media: ${avg} ms\nTocca per rigiocare`);
    pad.style.whiteSpace = 'pre-line';
    if (!done) { saveScore('riflessi', avg, { tempi: times }); info.textContent = 'Punteggio salvato in classifica! 🏆'; }
    else info.textContent = `Allenamento: in classifica resta il tuo primo risultato (${done.score} ms).`;
  }
  pad.addEventListener('pointerdown', () => {
    if (state === 'idle' || state === 'end') { times = []; info.textContent = `Tentativo 1 di ${ROUNDS}`; next(); }
    else if (state === 'wait') { clearTimeout(timer); state = 'early'; set('', 'Troppo presto! 😅\nTocca per riprovare'); pad.style.whiteSpace = 'pre-line'; }
    else if (state === 'early') next();
    else if (state === 'go') {
      times.push(Math.round(performance.now() - t0));
      if (times.length >= ROUNDS) return finish();
      state = 'between'; set('', `${times.at(-1)} ms\nTocca per continuare`); pad.style.whiteSpace = 'pre-line';
      info.textContent = `Tentativo ${times.length + 1} di ${ROUNDS}`;
    } else if (state === 'between') next();
  });
  set('', 'Tocca per iniziare');
  info.textContent = done ? `Oggi hai già fatto ${done.score} ms: ora è solo allenamento.` : `${ROUNDS} tentativi, conta la media. Il primo giro va in classifica!`;
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '⚡ Riflessi'),
    h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), info, pad),
  () => { clearTimeout(timer); if (S.tab === 'giochi') render(); });
}

/* ============ AMICI ============ */
async function tabAmici(root) {
  const me = S.me.id;
  const [fr, inv] = await Promise.all([
    sb.from('friendships').select('requester,addressee,status'),
    sb.from('circle_invites').select('id,circle_id,inviter,circles(name)').eq('invitee', me),
  ]);
  const rel = fr.data || [];
  const otherOf = (r) => (r.requester === me ? r.addressee : r.requester);
  const ids = [...new Set([...rel.map(otherOf), ...(inv.data || []).map((i) => i.inviter)])];
  const people = new Map();
  if (ids.length) {
    const { data } = await sb.from('profiles').select('id,username,avatar,color').in('id', ids);
    (data || []).forEach((p) => people.set(p.id, p));
  }
  const pp = (id) => people.get(id) || person(id);
  const statusOf = (id) => {
    const r = rel.find((x) => otherOf(x) === id);
    if (!r) return 'none';
    if (r.status === 'accepted') return 'friend';
    return r.requester === me ? 'sent' : 'received';
  };
  const c = circle();

  // ricerca
  const results = h('div');
  let tmr;
  const q = h('input', { class: 'input', type: 'search', placeholder: 'Cerca una persona per nome…', autocapitalize: 'none',
    oninput: () => { clearTimeout(tmr); tmr = setTimeout(search, 300); } });
  async function search() {
    const term = q.value.trim();
    if (term.length < 2) return results.replaceChildren();
    const { data, error } = await sb.rpc('search_profiles', { q: term });
    if (error) return results.replaceChildren(h('p', { class: 'error' }, errMsg(error)));
    if (!data.length) return results.replaceChildren(h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nessuno con questo nome.'));
    data.forEach((p) => people.set(p.id, p));
    results.replaceChildren(...data.map((p) => personRow(p, actionFor(p.id))));
  }
  function actionFor(id) {
    const st = statusOf(id);
    if (st === 'friend') return h('span', { class: 'done-tag' }, '✓ Amici');
    if (st === 'sent') return h('span', { class: 'muted small' }, 'Richiesta inviata');
    if (st === 'received') return h('button', { class: 'btn small', onclick: () => respond(id, true) }, 'Accetta');
    return h('button', { class: 'btn small ghost', onclick: async (e) => {
      e.target.disabled = true;
      const { data, error } = await sb.rpc('send_friend_request', { target: id });
      if (error) { e.target.disabled = false; return toast(errMsg(error)); }
      toast(data === 'accepted' ? 'Ora siete amici! 🎉' : 'Richiesta inviata 👍'); render();
    } }, '➕ Amico');
  }
  async function respond(id, ok) {
    const { error } = await sb.rpc('respond_friend_request', { other: id, accept: ok });
    if (error) return toast(errMsg(error));
    toast(ok ? 'Ora siete amici! 🎉' : 'Richiesta rifiutata'); loadPending(); render();
  }
  const personRow = (p, action) => h('div', { class: 'rank' }, avatarEl(p, 'sm'), h('div', { style: 'flex:1;font-weight:700' }, p.username), action);

  const received = rel.filter((r) => r.status === 'pending' && r.addressee === me);
  const friends = rel.filter((r) => r.status === 'accepted').map(otherOf);
  const invites = inv.data || [];

  root.append(h('div', { class: 'card' }, h('h2', {}, '🔎 Trova persone'),
    h('p', { class: 'muted small' }, 'Si vede solo il nome. Nessuno entra nelle tue cerchie senza un tuo invito.'), q, results));

  if (invites.length || received.length) {
    root.append(h('div', { class: 'card', style: 'border-color:var(--brand)' }, h('h2', {}, '📬 Per te'),
      invites.map((i) => h('div', { class: 'rank' }, avatarEl(pp(i.inviter), 'sm'),
        h('div', { style: 'flex:1' }, h('b', {}, pp(i.inviter).username), ' ti invita in ', h('b', {}, `«${i.circles?.name || 'una cerchia'}»`)),
        h('button', { class: 'btn small', onclick: async () => {
          const { data, error } = await sb.rpc('respond_circle_invite', { inv: i.id, accept: true });
          if (error) return toast(errMsg(error));
          await loadCircles(); loadPending(); toast('Sei entrato nella cerchia! 🎉'); S.tab = 'oggi'; openCircle(data);
        } }, 'Entra'),
        h('button', { class: 'btn small plain', 'aria-label': 'Rifiuta', onclick: async () => {
          await sb.rpc('respond_circle_invite', { inv: i.id, accept: false }); loadPending(); render();
        } }, '✕'))),
      received.map((r) => h('div', { class: 'rank' }, avatarEl(pp(r.requester), 'sm'),
        h('div', { style: 'flex:1' }, h('b', {}, pp(r.requester).username), ' vuole essere tuo amico'),
        h('button', { class: 'btn small', onclick: () => respond(r.requester, true) }, 'Accetta'),
        h('button', { class: 'btn small plain', 'aria-label': 'Rifiuta', onclick: () => respond(r.requester, false) }, '✕')))));
  }

  root.append(h('div', { class: 'card' }, h('h2', {}, `💛 I tuoi amici (${friends.length})`),
    friends.length ? friends.map((id) => {
      const inCircle = S.members.has(id);
      return personRow(pp(id), inCircle ? h('span', { class: 'muted small' }, `già in «${c.name}»`)
        : h('button', { class: 'btn small ghost', onclick: async (e) => {
          e.target.disabled = true;
          const { error } = await sb.rpc('invite_to_circle', { c: S.circleId, target: id });
          if (error) { e.target.disabled = false; return toast(errMsg(error)); }
          e.target.textContent = 'Invitato ✓'; toast(`Invito mandato per «${c.name}»`);
        } }, `Invita in «${c.name}»`));
    }) : h('p', { class: 'muted small', style: 'margin:0' }, 'Ancora nessuno. Cerca un nome qui sopra!')));
}

/* ============ PROFILO ============ */
function tabProfilo(root) {
  const c = circle();
  let av = S.me.avatar, col = S.me.color;
  const prev = avatarEl(S.me, 'big');
  const save = h('button', { class: 'btn block', style: 'margin-top:14px;display:none', onclick: async () => {
    const { error } = await sb.from('profiles').update({ avatar: av, color: col }).eq('id', S.me.id);
    if (error) return toast(errMsg(error));
    Object.assign(S.me, { avatar: av, color: col }); S.members.set(S.me.id, S.me); toast('Salvato!'); render();
  } }, 'Salva');
  const refresh = () => { prev.textContent = av; prev.style.background = col; save.style.display = ''; };
  const link = inviteLink(c.invite_code);
  root.append(
    h('div', { class: 'card' }, h('div', { class: 'row' }, prev, h('div', {}, h('h2', { style: 'margin:0' }, S.me.username), h('div', { class: 'muted small' }, 'Questo è il tuo nome per accedere'))),
      h('label', { style: 'margin-top:16px' }, 'Faccina'),
      h('div', { class: 'emoji-grid' }, AVATARS.map((a) => { const b = h('button', { class: a === av ? 'on' : '', onclick: () => { av = a; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); refresh(); } }, a); return b; })),
      h('label', { style: 'margin-top:14px' }, 'Colore'),
      h('div', { class: 'colors' }, COLORS.map((x) => { const b = h('button', { class: x === col ? 'on' : '', style: `background:${x}`, 'aria-label': 'colore', onclick: () => { col = x; b.parentNode.querySelectorAll('button').forEach((y) => y.classList.remove('on')); b.classList.add('on'); refresh(); } }); return b; })),
      save),
    h('div', { class: 'card' }, h('h2', {}, `👥 ${c.name}`),
      h('p', { class: 'muted' }, 'Manda questo link ai tuoi amici: lo aprono, scelgono nome e password, e sono dentro.'),
      h('div', { class: 'invite-code' }, c.invite_code),
      h('button', { class: 'btn block', style: 'margin-top:12px', onclick: async () => {
        const text = `Vieni su Chiacchiere, il nostro social! 💬 Apri qui:`;
        if (navigator.share) { try { await navigator.share({ title: 'Chiacchiere', text, url: link }); } catch {} }
        else { await navigator.clipboard.writeText(`${text} ${link}`); toast('Link copiato! Incollalo su WhatsApp 👍'); }
      } }, '📤 Invita amici'),
      h('div', { style: 'margin-top:14px' }, [...S.members.values()].map((m) => h('div', { class: 'rank' }, avatarEl(m, 'sm'),
        h('div', { style: 'flex:1;font-weight:700' }, m.username), m.id === c.owner ? h('span', { class: 'muted small' }, '👑 fondatore') : null))),
      c.owner === S.me.id ? holdButton('🗑️ Tieni premuto per cancellare la cerchia', async () => {
        const { error } = await sb.rpc('delete_circle', { p_circle: c.id });
        if (error) return toast(errMsg(error));
        toast(`Cerchia «${c.name}» cancellata`); afterCircleGone();
      }) : h('button', { class: 'btn plain block', style: 'margin-top:12px', onclick: async () => {
        if (!(await askConfirm('🚪 Uscire dalla cerchia?', `Non vedrai più chat e post di «${c.name}». Potrai rientrare con un nuovo invito.`, 'Sì, esco'))) return;
        const { error } = await sb.rpc('leave_circle', { p_circle: c.id });
        if (error) return toast(errMsg(error));
        toast('Sei uscito dalla cerchia'); afterCircleGone();
      } }, '🚪 Esci dalla cerchia')),
    notifCard(),
    h('div', { class: 'card stack' },
      h('button', { class: 'btn ghost block', onclick: () => openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, 'Altre cerchie'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), circleForms())) }, '➕ Crea o entra in un\'altra cerchia'),
      !isStandalone() ? h('button', { class: 'btn ghost block', onclick: () => showInstall(true) }, '📲 Metti l\'app nella schermata Home') : null,
      h('p', { class: 'center credit' }, `Chiacchiere · versione ${VERSIONE}`),
      h('button', { class: 'btn plain block', onclick: async () => { if (await askConfirm('👋 Vuoi uscire?', 'Per rientrare ti serviranno il tuo nome e la password.', 'Sì, esci')) { await unsubscribePush(); sb.auth.signOut(); } } }, 'Esci')),
  );
}

// bottone "tieni premuto": si riempie in 2,5 secondi, se lasci prima non succede niente
function holdButton(label, onDone, ms = 2500) {
  const bar = h('span', { class: 'hold-bar' });
  const txt = h('span', { class: 'hold-txt' }, label);
  const b = h('button', { class: 'hold-btn', type: 'button' }, bar, txt);
  let t0 = 0, raf = 0, done = false;
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    bar.style.width = k * 100 + '%';
    if (k >= 1) { done = true; txt.textContent = 'Cancellata…'; navigator.vibrate?.(60); onDone(); return; }
    raf = requestAnimationFrame(tick);
  };
  const start = (e) => { if (done) return; e.preventDefault(); t0 = performance.now(); txt.textContent = 'Continua a tenere premuto…'; navigator.vibrate?.(15); raf = requestAnimationFrame(tick); };
  const stop = () => { if (done) return; cancelAnimationFrame(raf); bar.style.transition = 'width .25s'; bar.style.width = '0%'; setTimeout(() => (bar.style.transition = ''), 260); txt.textContent = label; };
  b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}
async function afterCircleGone() {
  localStorage.removeItem('cerchia');
  await loadCircles();
  if (!S.circles.length) { if (S.channel) sb.removeChannel(S.channel); S.channel = null; return renderNoCircle(); }
  S.tab = 'oggi'; openCircle(S.circles[0].id);
}

/* ============ NOTIFICHE PUSH ============ */
const PUSH_URL = `${SUPABASE_URL}/functions/v1/notifiche`;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function saveSub(sub) {
  const j = sub.toJSON();
  await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, user_id: S.me.id, p256dh: j.keys.p256dh, auth: j.keys.auth });
}
async function enablePush() {
  if (!pushSupported()) return toast(isIOS() ? 'Prima metti Chiacchiere nella Home, poi attiva le notifiche da lì 📲' : 'Questo browser non supporta le notifiche', 4000);
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Notifiche non permesse. Puoi attivarle dalle impostazioni del telefono.', 4000);
  try {
    const { publicKey } = await (await fetch(PUSH_URL + '?chiave=pubblica')).json();
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    await saveSub(sub);
    localStorage.setItem('notifiche', 'si');
    toast('🔔 Notifiche attive!'); if (S.tab === 'profilo') render();
  } catch (e) { toast('Non riesco ad attivarle: ' + errMsg(e), 4000); }
}
async function syncPush() {
  // se sono già permesse, ricollega questo telefono all'utente (anche dopo un cambio di account)
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return maybeAskPush();
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) await saveSub(sub); else if (localStorage.getItem('notifiche') === 'si') enablePush();
  } catch {}
}
async function unsubscribePush() {
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    localStorage.removeItem('notifiche');
  } catch {}
}
function maybeAskPush() {
  // chiede una volta sola, e su iPhone solo quando l'app è già nella Home
  if (!pushSupported() || Notification.permission !== 'default' || localStorage.getItem('chiestoNotifiche')) return;
  if (isIOS() && !isStandalone()) return;
  localStorage.setItem('chiestoNotifiche', '1');
  setTimeout(() => {
    if (document.getElementById('overlay')) return;
    openSheet(h('div', { class: 'center' }, h('div', { style: 'font-size:52px' }, '🔔'), h('h2', {}, 'Vuoi le notifiche?'),
      h('p', { class: 'muted' }, 'Ti avvisiamo quando qualcuno ti scrive in chat, risponde al dibattito o ti manda una richiesta di amicizia.'),
      h('button', { class: 'btn block', onclick: () => { closeSheet(); enablePush(); } }, '🔔 Sì, attivale'),
      h('button', { class: 'btn plain block', style: 'margin-top:6px', onclick: closeSheet }, 'Più tardi')));
  }, 1500);
}
function notifCard() {
  const on = pushSupported() && Notification.permission === 'granted' && localStorage.getItem('notifiche') === 'si';
  const blocked = pushSupported() && Notification.permission === 'denied';
  return h('div', { class: 'card' }, h('h2', {}, '🔔 Notifiche'),
    on ? h('p', { class: 'muted', style: 'margin:0' }, 'Attive su questo telefono ✓')
      : blocked ? h('p', { class: 'muted', style: 'margin:0' }, 'Bloccate: per riattivarle vai nelle impostazioni del telefono → notifiche → Chiacchiere.')
      : isIOS() && !isStandalone() ? h('p', { class: 'muted', style: 'margin:0' }, 'Su iPhone funzionano solo con l\'app nella schermata Home: installala e poi attivale da qui.')
      : h('div', {}, h('p', { class: 'muted' }, 'Ricevi un avviso per i messaggi in chat, le risposte al dibattito e le richieste di amicizia.'),
          h('button', { class: 'btn block', onclick: enablePush }, '🔔 Attiva le notifiche')),
    on ? h('button', { class: 'linkbtn small', onclick: async () => { await unsubscribePush(); toast('Notifiche disattivate'); render(); } }, 'Disattiva') : null);
}

/* ============ PRESSIONE LUNGA SUI MESSAGGI ============ */
function onLongPress(el, fn) {
  let timer = null, x = 0, y = 0;
  const cancel = () => { clearTimeout(timer); timer = null; el.classList.remove('pressing'); };
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // il tasto ▶ dei vocali resta normale
    x = e.clientX; y = e.clientY; el.classList.add('pressing');
    timer = setTimeout(() => { cancel(); navigator.vibrate?.(15); fn(); }, 450);
  });
  el.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.classList.add('pressable');
}
/* ---- file condivisi ---- */
const FILE_MAX = 25 * 1024 * 1024;
function fmtSize(b) { return b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`; }
function fileIcon(name = '', mime = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return '🎵';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'pages'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'ods', 'csv', 'numbers'].includes(ext)) return '📊';
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return '📽️';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  if (['apk'].includes(ext)) return '🤖';
  return '📄';
}
function fileBubble(m) {
  return h('div', { class: 'bubble file', onclick: () => openFile(m) },
    h('div', { class: 'file-row' }, h('div', { class: 'file-ico' }, fileIcon(m.file_name, m.file_mime)),
      h('div', { style: 'flex:1;min-width:0' }, h('b', { class: 'file-name' }, m.file_name), h('div', { class: 'small file-sub' }, `${fmtSize(m.file_size || 0)} · tocca per aprire`))),
    m.body ? h('div', { class: 'cap' }, m.body) : null);
}
async function openFile(m) {
  const box = h('div', { class: 'center' }, h('p', { class: 'muted' }, 'Scarico il file…'));
  openSheet(h('div', {}, h('div', { class: 'file-row', style: 'margin-bottom:12px' }, h('div', { class: 'file-ico' }, fileIcon(m.file_name, m.file_mime)),
    h('div', { style: 'flex:1;min-width:0' }, h('b', { class: 'file-name' }, m.file_name), h('div', { class: 'small muted' }, `${fmtSize(m.file_size || 0)} · da ${person(m.user_id).username}`))), box));
  const { data, error } = await sb.storage.from('file').download(m.file_path);
  if (error || !data) return fill(box, h('p', { class: 'error' }, 'Non riesco a scaricarlo: forse è stato cancellato.'));
  const file = new File([data], m.file_name, { type: m.file_mime || data.type || 'application/octet-stream' });
  const url = URL.createObjectURL(file);
  const canShare = navigator.canShare?.({ files: [file] });
  fill(box,
    canShare ? h('button', { class: 'btn block', onclick: async () => { try { await navigator.share({ files: [file] }); } catch (e) { if (e?.name !== 'AbortError') toast('Non riesco ad aprirlo'); } } }, '📤 Apri o salva') : null,
    h('a', { class: 'btn block ' + (canShare ? 'ghost' : ''), style: 'margin-top:8px', href: url, download: m.file_name }, '⬇️ Scarica'),
    /^(image\/|application\/pdf|text\/|video\/|audio\/)/.test(file.type) ? h('a', { class: 'btn plain block', style: 'margin-top:8px', href: url, target: '_blank', rel: 'noopener' }, '👁 Guarda qui') : null);
}
async function openFilesList() {
  const box = h('div', {}, h('p', { class: 'muted center' }, 'Carico…'));
  openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, '📁 File della cerchia'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), box));
  const { data } = await sb.from('messages').select('id,user_id,file_path,file_name,file_size,file_mime,body,created_at').eq('circle_id', S.circleId).not('file_path', 'is', null).order('created_at', { ascending: false }).limit(100);
  const list = data || [];
  fill(box, list.length ? h('div', { class: 'stack', style: 'margin-top:10px' }, list.map((m) => h('button', { class: 'cg-row', onclick: () => openFile(m) },
    h('div', { class: 'file-ico' }, fileIcon(m.file_name, m.file_mime)),
    h('div', { style: 'flex:1;min-width:0;text-align:left' }, h('b', { class: 'file-name' }, m.file_name),
      h('div', { class: 'small muted' }, `${fmtSize(m.file_size || 0)} · ${person(m.user_id).username} · ${new Date(m.created_at).toLocaleDateString('it-IT')}`)), '›')))
    : h('p', { class: 'muted center', style: 'margin-top:12px' }, 'Ancora nessun file. In chat tocca 📎 per mandarne uno.'));
}

// foto a tutto schermo
function openPhoto(url) {
  const v = h('div', { class: 'photo-view', onclick: () => v.remove() }, h('img', { src: url, alt: 'foto' }), h('button', { class: 'topo-x', 'aria-label': 'Chiudi' }, '✕'));
  document.body.append(v);
}
function messageMenu({ text, preview, mine, onDelete, audioPath, imageUrl }) {
  const canShare = !!navigator.share;
  const share = canShare && (text || audioPath || imageUrl) ? h('button', { class: 'menu-btn', onclick: async () => {
    closeSheet();
    try {
      if (imageUrl) {
        const blob = await (await fetch(imageUrl)).blob();
        const file = new File([blob], 'foto-chiacchiere.jpg', { type: 'image/jpeg' });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], ...(text ? { text } : {}) });
        else await navigator.share({ url: imageUrl });
      } else if (audioPath) {
        const blob = await getVoice(audioPath);
        if (!blob) return toast('Vocale non disponibile');
        const file = new File([blob], `vocale-chiacchiere.${blob.type.includes('webm') ? 'webm' : 'm4a'}`, { type: blob.type || 'audio/mp4' });
        if (!navigator.canShare?.({ files: [file] })) return toast('Questo telefono non permette di condividere i vocali');
        await navigator.share({ files: [file] });
      } else await navigator.share({ text });
    } catch (e) { if (e?.name !== 'AbortError') toast('Condivisione non riuscita'); }
  } }, '📤', h('span', {}, 'Condividi')) : null;
  const copy = text ? h('button', { class: 'menu-btn', onclick: async () => {
    closeSheet();
    try { await navigator.clipboard.writeText(text); toast('Copiato 📋'); }
    catch { toast('Non riesco a copiare su questo telefono'); }
  } }, '📋', h('span', {}, 'Copia')) : null;
  const del = mine ? h('button', { class: 'menu-btn danger', onclick: async () => {
    closeSheet();
    if (await askConfirm('🗑️ Eliminare il messaggio?', 'Sparisce per tutti. Non si può annullare.', 'Sì, elimina')) onDelete();
  } }, '🗑️', h('span', {}, 'Elimina')) : null;
  if (!copy && !del && !share) return;
  openSheet(h('div', {},
    h('div', { class: 'menu-preview' }, preview || ''),
    h('div', { class: 'menu-list' }, copy, share, del),
    h('button', { class: 'btn plain block', style: 'margin-top:6px', onclick: closeSheet }, 'Annulla')));
}

/* ============ FOGLIO / INSTALLAZIONE ============ */
function askConfirm(title, text, okLabel = 'Sì') {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); closeSheet(); };
    openSheet(h('div', { class: 'center' },
      h('h2', {}, title), text ? h('p', { class: 'muted' }, text) : null,
      h('button', { class: 'btn block', style: 'background:#d9534f;margin-top:6px', onclick: () => finish(true) }, okLabel),
      h('button', { class: 'btn plain block', style: 'margin-top:6px', onclick: () => finish(false) }, 'Annulla')),
    () => { if (!done) { done = true; resolve(false); } });
  });
}
let sheetClose = null;
function openSheet(content, onClose) {
  closeSheet();
  const ov = h('div', { class: 'overlay', id: 'overlay', onclick: (e) => { if (e.target === ov) closeSheet(); } }, h('div', { class: 'sheet' }, content));
  document.body.append(ov); document.body.style.overflow = 'hidden'; sheetClose = onClose;
}
function closeSheet() {
  const ov = document.getElementById('overlay'); if (!ov) return;
  ov.remove(); document.body.style.overflow = '';
  const f = sheetClose; sheetClose = null; f && f();
}

function maybeShowInstall() {
  if (isStandalone()) return;
  const first = localStorage.getItem('mostraInstall') === '1';
  const last = +localStorage.getItem('installVisto') || 0;
  if (first || Date.now() - last > 3 * 864e5) { localStorage.removeItem('mostraInstall'); setTimeout(() => showInstall(false), 700); }
}
function showInstall(manual) {
  localStorage.setItem('installVisto', Date.now());
  const remind = S.me ? h('div', { class: 'card', style: 'background:var(--brand-soft);border:none' },
    h('b', {}, '🔑 Ricordati:'), h('p', { style: 'margin:4px 0 0' }, 'quando apri l\'app dalla Home, entra con il nome ', h('b', {}, S.me.username), ' e la tua password.'))
    : localStorage.getItem('invito') ? h('div', { class: 'card', style: 'background:var(--brand-soft);border:none' },
      h('b', {}, '🔑 Il tuo codice invito:'), h('div', { class: 'invite-code', style: 'margin-top:6px;background:#fff' }, localStorage.getItem('invito')),
      h('p', { class: 'small', style: 'margin:6px 0 0' }, 'Se l\'app dalla Home non ti fa entrare subito nella cerchia, usa questo codice.')) : null;
  let body;
  if (isIOS()) {
    body = h('div', {},
      h('h2', {}, '📲 Metti Chiacchiere nella Home'),
      h('p', { class: 'muted' }, 'Così la apri come un\'app vera, con un tocco.'),
      h('ol', { class: 'steps' },
        h('li', {}, h('span', {}, 'Tocca il tasto ', h('span', { class: 'ios-ico' }, '⬆️'), ' Condividi (in basso, o dentro ', h('b', {}, '⋯'), ')')),
        h('li', {}, h('span', {}, 'Scorri e tocca ', h('b', {}, '«Aggiungi alla schermata Home»'), ' ', h('span', { class: 'ios-ico' }, '➕'))),
        h('li', {}, h('span', {}, 'Tocca ', h('b', {}, '«Aggiungi»'), ' in alto a destra. Fatto!'))),
      remind,
      h('p', { class: 'muted small' }, 'Non trovi il tasto? Apri il link con Safari.'),
      h('button', { class: 'btn block', onclick: closeSheet }, 'Ho capito'),
      h('div', { class: 'arrow-down' }, '👇'));
  } else if (S.installEvt) {
    body = h('div', {}, h('h2', {}, '📲 Installa Chiacchiere'), h('p', { class: 'muted' }, 'Avrai l\'icona sul telefono, come un\'app vera.'), remind,
      h('button', { class: 'btn block', onclick: async () => { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; closeSheet(); } }, 'Installa'),
      h('button', { class: 'btn plain block', onclick: closeSheet }, 'Più tardi'));
  } else {
    body = h('div', {}, h('h2', {}, '📲 Installa Chiacchiere'),
      h('p', {}, 'Apri il menu del browser (', h('b', {}, '⋮'), ' in alto a destra) e tocca ', h('b', {}, '«Installa app»'), ' o ', h('b', {}, '«Aggiungi a schermata Home»'), '.'), remind,
      h('button', { class: 'btn block', onclick: closeSheet }, 'Ho capito'));
  }
  openSheet(body);
}
