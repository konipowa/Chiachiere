import { PAROLE } from './parole.js';

/* ============ CONFIG ============ */
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
  tab: 'oggi', channel: null, unread: 0, installEvt: null, feedTimer: null, sub: null,
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
const inviteLink = (code) => `${location.origin}${location.pathname}?invito=${code}`;
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
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

(function readInvite() {
  const code = new URLSearchParams(location.search).get('invito');
  if (code) {
    localStorage.setItem('invito', code.toUpperCase());
    history.replaceState(null, '', location.pathname);
  }
})();

sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') { cleanup(); renderAuth(); } });

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
async function renderAuth(mode) {
  const invite = localStorage.getItem('invito');
  mode = mode || (invite ? 'new' : 'login');
  let circleName = null;
  if (invite) {
    const { data } = await sb.rpc('circle_name_by_code', { p_code: invite });
    circleName = data;
  }
  let avatar = AVATARS[Math.floor(Math.random() * 8)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const err = h('div', { class: 'error' });
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
    form,
    h('p', { class: 'center' }, mode === 'new' ? 'Hai già un account? ' : 'Prima volta qui? ',
      h('button', { class: 'linkbtn', onclick: () => renderAuth(mode === 'new' ? 'login' : 'new') }, mode === 'new' ? 'Accedi' : 'Crea il tuo profilo')),
  ));
  setTimeout(() => (mode === 'login' && name.value ? pass : name).focus(), 50);
}

async function afterLogin() {
  const { data: me, error } = await sb.from('profiles').select('*').eq('id', S.user.id).single();
  if (error) throw error;
  S.me = me;
  const invite = localStorage.getItem('invito');
  if (invite) {
    const { data: cid, error: je } = await sb.rpc('join_circle', { p_code: invite });
    localStorage.removeItem('invito');
    if (je) toast(errMsg(je)); else { localStorage.setItem('cerchia', cid); toast('Sei entrato nella cerchia! 🎉'); }
  }
  await loadCircles();
  if (!S.circles.length) return renderNoCircle();
  await openCircle(localStorage.getItem('cerchia'));
  maybeShowInstall();
}

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
}
const circle = () => S.circles.find((c) => c.id === S.circleId);

function cleanup() {
  if (S.channel) sb.removeChannel(S.channel);
  Object.assign(S, { user: null, me: null, circles: [], circleId: null, channel: null, unread: 0 });
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
const TABS = [['oggi', '☀️', 'Oggi'], ['chat', '💬', 'Chat'], ['giochi', '🎮', 'Giochi'], ['profilo', '👤', 'Profilo']];
function render() {
  const c = circle();
  const picker = S.circles.length > 1
    ? h('select', { class: 'circle-pick', onchange: (e) => openCircle(e.target.value) },
        S.circles.map((x) => h('option', { value: x.id, selected: x.id === S.circleId }, x.name)))
    : h('div', { class: 'circle-pick' }, c.name);
  const content = h('div', { id: 'content' });
  const page = h('div', { class: 'page' + (S.tab === 'chat' ? ' chat-page' : '') },
    h('div', { class: 'topbar' }, h('div', { class: 'title' }, '💬 Chiacchiere'), picker), content);
  const nav = h('nav', { class: 'nav' }, h('div', { class: 'nav-inner' }, TABS.map(([id, ico, lbl]) =>
    h('button', { class: S.tab === id ? 'on' : '', onclick: () => { S.tab = id; if (id === 'chat') S.unread = 0; render(); window.scrollTo(0, 0); } },
      h('span', { class: 'ico' }, ico), lbl,
      id === 'chat' && S.unread ? h('span', { class: 'badge' }, S.unread > 9 ? '9+' : S.unread) : null))));
  $app.replaceChildren(page, nav);
  ({ oggi: tabOggi, chat: tabChat, giochi: tabGiochi, profilo: tabProfilo })[S.tab](content);
}

/* ============ TEMPO REALE ============ */
function subscribe() {
  if (S.channel) sb.removeChannel(S.channel);
  const cid = S.circleId;
  S.channel = sb.channel('cerchia-' + cid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `circle_id=eq.${cid}` }, (p) => {
      if (S.tab === 'chat') appendMsg(p.new, true);
      else if (p.new.user_id !== S.me.id) { S.unread++; updateBadge(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `circle_id=eq.${cid}` }, refreshFeedSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, refreshFeedSoon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshFeedSoon)
    .subscribe();
}
function updateBadge() {
  const b = document.querySelector('.nav button:nth-child(2)');
  if (!b) return;
  b.querySelector('.badge')?.remove();
  if (S.unread) b.append(h('span', { class: 'badge' }, S.unread > 9 ? '9+' : S.unread));
}
function refreshFeedSoon() {
  if (S.tab !== 'oggi') return;
  clearTimeout(S.feedTimer);
  S.feedTimer = setTimeout(() => { const f = document.getElementById('feed'); if (f) loadFeed(f); }, 400);
}

/* ============ OGGI ============ */
async function tabOggi(root) {
  const composer = h('div', { id: 'composer' });
  const feed = h('div', { id: 'feed' }, h('p', { class: 'muted center' }, 'Carico i post…'));
  root.append(composer, feed);
  renderComposer(composer);
  loadFeed(feed);
}

async function renderComposer(box) {
  const { data } = await sb.from('posts').select('id').eq('circle_id', S.circleId).eq('user_id', S.me.id).eq('day', todayRome()).maybeSingle();
  if (data) {
    box.replaceChildren(h('div', { class: 'card center' }, h('div', { style: 'font-size:32px' }, '✅'),
      h('b', {}, 'Hai già raccontato la tua giornata.'), h('p', { class: 'muted small', style: 'margin:4px 0 0' }, 'Domani puoi scrivere di nuovo. Intanto guarda cosa hanno scritto gli altri!')));
    return;
  }
  let photo = null;
  const ta = h('textarea', { class: 'input', placeholder: `Com'è andata oggi, ${S.me.username}?`, maxlength: 1000 });
  const preview = h('div');
  const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: async () => {
    const f = file.files[0]; if (!f) return;
    try { photo = await compressImage(f); } catch { return toast('Non riesco a leggere la foto.'); }
    const url = URL.createObjectURL(photo);
    preview.replaceChildren(h('div', { class: 'composer-photo' }, h('img', { src: url, class: 'post-img' }),
      h('button', { class: 'btn small white', type: 'button', onclick: () => { photo = null; preview.replaceChildren(); file.value = ''; } }, '✕ Togli')));
  } });
  const send = h('button', { class: 'btn', onclick: async () => {
    const body = ta.value.trim();
    if (!body && !photo) return toast('Scrivi qualcosa o aggiungi una foto 🙂');
    send.disabled = true; send.textContent = 'Pubblico…';
    try {
      let image_path = null;
      if (photo) {
        image_path = `${S.me.id}/${Date.now()}.jpg`;
        const up = await sb.storage.from('foto').upload(image_path, photo, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
      }
      const { error } = await sb.from('posts').insert({ circle_id: S.circleId, user_id: S.me.id, body: body || null, image_path });
      if (error) { if (error.code === '23505') throw new Error('Hai già scritto oggi!'); throw error; }
      toast('Pubblicato! 🎉');
      renderComposer(box); loadFeed(document.getElementById('feed'));
    } catch (e) { toast(errMsg(e)); send.disabled = false; send.textContent = 'Pubblica'; }
  } }, 'Pubblica');
  box.replaceChildren(h('div', { class: 'card' },
    h('h3', {}, '☀️ La tua giornata'),
    h('p', { class: 'muted small' }, 'Un post al giorno, senza filtri. Com\'è davvero.'),
    ta, preview,
    h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => file.click() }, '📷 Foto'), file,
      h('div', { class: 'spacer' }), send)));
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

async function loadFeed(feed) {
  const { data, error } = await sb.from('posts')
    .select('id,user_id,body,image_path,day,created_at,reactions(user_id,emoji),comments(count)')
    .eq('circle_id', S.circleId).order('created_at', { ascending: false }).limit(60);
  if (error) { feed.replaceChildren(h('p', { class: 'error center' }, errMsg(error))); return; }
  if (!data.length) {
    feed.replaceChildren(h('div', { class: 'empty' }, h('div', { class: 'big' }, '🌱'),
      h('p', {}, 'Ancora nessun post. Sii il primo a raccontare la tua giornata!')));
    return;
  }
  const open = new Set([...feed.querySelectorAll('.comments[data-open]')].map((x) => x.dataset.post));
  const out = []; let lastDay = null;
  for (const p of data) {
    if (p.day !== lastDay) { out.push(h('div', { class: 'day-sep' }, dayLabel(p.day))); lastDay = p.day; }
    out.push(postCard(p, open.has(p.id)));
  }
  feed.replaceChildren(...out);
}

function postCard(p, commentsOpen) {
  const who = person(p.user_id);
  const mine = p.user_id === S.me.id;
  const myReact = p.reactions.find((r) => r.user_id === S.me.id)?.emoji;
  const counts = {}; p.reactions.forEach((r) => (counts[r.emoji] = (counts[r.emoji] || 0) + 1));
  const nComments = p.comments?.[0]?.count || 0;
  const cbox = h('div', { class: 'comments', 'data-post': p.id, style: commentsOpen ? '' : 'display:none' });
  if (commentsOpen) { cbox.dataset.open = '1'; loadComments(p.id, cbox); }
  const imgUrl = p.image_path ? sb.storage.from('foto').getPublicUrl(p.image_path).data.publicUrl : null;
  return h('div', { class: 'card' },
    h('div', { class: 'post-head' }, avatarEl(who),
      h('div', {}, h('div', { class: 'name' }, who.username), h('div', { class: 'muted small' }, timeOf(p.created_at))),
      h('div', { class: 'spacer' }),
      mine ? h('button', { class: 'btn plain small', onclick: async () => {
        if (!confirm('Vuoi eliminare il tuo post di oggi?')) return;
        const { error } = await sb.from('posts').delete().eq('id', p.id);
        if (error) return toast(errMsg(error));
        if (p.image_path) sb.storage.from('foto').remove([p.image_path]);
        toast('Post eliminato'); const c = document.getElementById('composer'); if (c) renderComposer(c);
        loadFeed(document.getElementById('feed'));
      } }, '🗑️') : null),
    p.body ? h('div', { class: 'post-body' }, p.body) : null,
    imgUrl ? h('img', { class: 'post-img', src: imgUrl, loading: 'lazy', alt: '' }) : null,
    h('div', { class: 'reacts' },
      REACTIONS.map((e) => h('button', { class: 'react' + (myReact === e ? ' on' : ''), onclick: () => react(p.id, e, myReact) },
        e, counts[e] ? h('span', { class: 'n' }, counts[e]) : null)),
      h('button', { class: 'react', onclick: () => {
        const show = cbox.style.display === 'none';
        cbox.style.display = show ? '' : 'none';
        if (show) { cbox.dataset.open = '1'; loadComments(p.id, cbox); } else delete cbox.dataset.open;
      } }, '💬', h('span', { class: 'n' }, nComments || ''))),
    cbox);
}

async function react(postId, emoji, current) {
  const q = current === emoji
    ? sb.from('reactions').delete().eq('post_id', postId).eq('user_id', S.me.id)
    : sb.from('reactions').upsert({ post_id: postId, user_id: S.me.id, emoji });
  const { error } = await q;
  if (error) return toast(errMsg(error));
  loadFeed(document.getElementById('feed'));
}

async function loadComments(postId, box) {
  const { data } = await sb.from('comments').select('*').eq('post_id', postId).order('created_at');
  const inp = h('input', { class: 'input', placeholder: 'Scrivi un commento…', maxlength: 500, style: 'padding:10px 12px' });
  box.replaceChildren(
    ...(data || []).map((c) => { const w = person(c.user_id); return h('div', { class: 'comment' }, avatarEl(w, 'sm'),
      h('div', { class: 'bubble' }, h('b', {}, w.username), c.body)); }),
    h('form', { class: 'row', onsubmit: async (e) => {
      e.preventDefault(); const body = inp.value.trim(); if (!body) return;
      inp.value = '';
      const { error } = await sb.from('comments').insert({ post_id: postId, user_id: S.me.id, body });
      if (error) toast(errMsg(error)); else loadComments(postId, box);
    } }, inp, h('button', { class: 'btn small' }, 'Invia')));
}

/* ============ CHAT ============ */
async function tabChat(root) {
  const list = h('div', { class: 'chat', id: 'chat' }, h('p', { class: 'muted center' }, 'Carico i messaggi…'));
  const ta = h('textarea', { class: 'input', rows: 1, placeholder: 'Scrivi un messaggio…', maxlength: 1000,
    oninput: () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; },
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !isIOS()) { e.preventDefault(); sendMsg(); } } });
  async function sendMsg() {
    const body = ta.value.trim(); if (!body) return;
    ta.value = ''; ta.style.height = 'auto';
    const { data, error } = await sb.from('messages').insert({ circle_id: S.circleId, user_id: S.me.id, body }).select().single();
    if (error) { toast(errMsg(error)); ta.value = body; return; }
    appendMsg(data, true);
  }
  root.append(list, h('div', { class: 'chat-input' }, h('div', { class: 'inner' }, ta,
    h('button', { class: 'btn', onclick: sendMsg, 'aria-label': 'Invia' }, '➤'))));
  const { data, error } = await sb.from('messages').select('*').eq('circle_id', S.circleId).order('created_at', { ascending: false }).limit(100);
  if (error) return list.replaceChildren(h('p', { class: 'error' }, errMsg(error)));
  list.replaceChildren();
  if (!data.length) list.append(h('div', { class: 'empty', id: 'chat-empty' }, h('div', { class: 'big' }, '👋'), h('p', {}, 'Nessun messaggio. Rompi il ghiaccio!')));
  data.reverse().forEach((m) => appendMsg(m, false));
  window.scrollTo(0, document.body.scrollHeight);
}
function appendMsg(m, scroll) {
  const list = document.getElementById('chat'); if (!list) return;
  if (list.querySelector(`[data-id="${m.id}"]`)) return;
  document.getElementById('chat-empty')?.remove();
  const me = m.user_id === S.me.id, w = person(m.user_id);
  list.append(h('div', { class: 'msg' + (me ? ' me' : ''), 'data-id': m.id },
    me ? null : avatarEl(w, 'sm'),
    h('div', {}, me ? null : h('div', { class: 'who' }, w.username), h('div', { class: 'bubble' }, m.body), h('div', { class: 'time' }, timeOf(m.created_at)))));
  if (scroll) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

/* ============ GIOCHI ============ */
const GAMES = {
  parola: { name: 'Parola del giorno', ico: '🔤', desc: 'Indovina la parola di 5 lettere in 6 tentativi.', unit: (s) => (s > 6 ? 'non trovata' : `${s}/6`) },
  riflessi: { name: 'Riflessi', ico: '⚡', desc: 'Tocca appena diventa verde. Chi è più veloce?', unit: (s) => `${s} ms` },
};
async function tabGiochi(root) {
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
      h('div', { class: 'game-card', onclick: () => (key === 'parola' ? gameParola() : gameRiflessi()) },
        h('div', { class: 'gico' }, g.ico),
        h('div', { style: 'flex:1' }, h('h3', { style: 'margin:0' }, g.name), h('div', { class: 'muted small' }, g.desc)),
        mine ? h('span', { class: 'done-tag' }, '✓ ' + g.unit(mine.score)) : h('span', { class: 'btn small' }, 'Gioca')),
      board.length ? h('div', { style: 'margin-top:12px' }, board.map((s, i) => {
        const w = person(s.user_id);
        return h('div', { class: 'rank' }, h('div', { class: 'pos' }, ['🥇', '🥈', '🥉'][i] || i + 1), avatarEl(w, 'sm'),
          h('div', { style: 'flex:1;font-weight:700' }, w.username), h('div', { class: 'muted' }, g.unit(s.score)));
      })) : h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Nessuno ha ancora giocato oggi.')));
  }
  root.append(h('div', { class: 'card game-card disabled' }, h('div', { class: 'gico' }, '🐠'),
    h('div', {}, h('h3', { style: 'margin:0' }, "Palline d'Acquario"), h('div', { class: 'muted small' }, 'In arrivo presto, con la classifica degli amici!'))));
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
        h('div', { style: 'flex:1;font-weight:700' }, m.username), m.id === c.owner ? h('span', { class: 'muted small' }, '👑 fondatore') : null)))),
    h('div', { class: 'card stack' },
      h('button', { class: 'btn ghost block', onclick: () => openSheet(h('div', {}, h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, 'Altre cerchie'), h('button', { class: 'btn plain', onclick: closeSheet }, '✕')), circleForms())) }, '➕ Crea o entra in un\'altra cerchia'),
      !isStandalone() ? h('button', { class: 'btn ghost block', onclick: () => showInstall(true) }, '📲 Metti l\'app nella schermata Home') : null,
      h('button', { class: 'btn plain block', onclick: () => { if (confirm('Vuoi uscire? Per rientrare ti serviranno nome e password.')) sb.auth.signOut(); } }, 'Esci')),
  );
}

/* ============ FOGLIO / INSTALLAZIONE ============ */
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
  const remind = h('div', { class: 'card', style: 'background:var(--brand-soft);border:none' },
    h('b', {}, '🔑 Ricordati:'), h('p', { style: 'margin:4px 0 0' }, 'quando apri l\'app dalla Home, entra con il nome ', h('b', {}, S.me.username), ' e la tua password.'));
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
  } else if (manual) {
    body = h('div', {}, h('h2', {}, '📲 Installa Chiacchiere'),
      h('p', {}, 'Apri il menu del browser (', h('b', {}, '⋮'), ' in alto a destra) e tocca ', h('b', {}, '«Installa app»'), ' o ', h('b', {}, '«Aggiungi a schermata Home»'), '.'), remind,
      h('button', { class: 'btn block', onclick: closeSheet }, 'Ho capito'));
  } else return;
  openSheet(body);
}
