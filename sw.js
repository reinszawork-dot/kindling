/* Kindling service worker: offline app shell + reminder notification clicks. */
const VERSION = 'kindling-v4';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'icon.svg',
  'js/app.js', 'js/util.js', 'js/data.js', 'js/store.js', 'js/stats.js', 'js/charts.js', 'js/ui.js', 'js/actions.js',
  'js/reminders.js', 'js/editor.js', 'js/habitrow.js', 'js/shell.js',
  'js/views/dashboard.js', 'js/views/habits.js', 'js/views/habit.js', 'js/views/analytics.js',
  'js/views/calendar.js', 'js/views/goals.js', 'js/views/achievements.js', 'js/views/settings.js',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: cache-first, they never change.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      c.put(req, res.clone());
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }
  if (url.origin !== location.origin) return;

  // App files: network-first so updates show immediately, cache when offline.
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch {
      return (await c.match(req, { ignoreSearch: true }))
        || (req.mode === 'navigate' ? c.match('index.html') : undefined)
        || new Response('Offline', { status: 503 });
    }
  })());
});

// Reminder notification clicked: focus the app and (optionally) mark the habit done.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { id, date } = e.notification.data || {};
  const markDone = e.action === 'done';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      const w = wins[0];
      if (markDone) w.postMessage({ type: 'kindling:done', id, date });
      return w.focus();
    }
    const url = new URL(self.registration.scope);
    if (markDone) { url.searchParams.set('done', id); url.searchParams.set('date', date); }
    return self.clients.openWindow(url.href);
  })());
});
