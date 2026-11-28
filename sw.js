// Service worker: rete prima, cache come riserva (solo file dell'app, mai i dati).
const CACHE = 'chiacchiere-v40';
const SHELL = ['./', './index.html', './css/style.css', './js/app.js', './js/parole.js', './js/topolini.js', './js/livelli-topolini.js', './giochi/palline/index.html', './js/vendor/supabase.js', './manifest.webmanifest', './icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('chiacchiere-v') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});

// ---- notifiche push ----
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Chiacchiere', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Chiacchiere', {
    body: d.body || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    tag: d.tag, renotify: !!d.tag, data: { url: d.url || './' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { try { await c.navigate(url); } catch {} return c.focus(); } }
    return clients.openWindow(url);
  })());
});
