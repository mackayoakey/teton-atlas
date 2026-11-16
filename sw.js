// Teton Atlas app shell cache. Map tiles and map data are NOT cached here.
const CACHE = 'teton-atlas-shell-v5';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-contour@0.1.1/dist/index.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(SHELL.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})))
  ).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const ours = url.origin === self.location.origin;
  if (!ours && url.hostname !== 'unpkg.com') return; // tiles, Overpass, etc. go straight to the network
  if (ours) {
    // Network first for our own files so updates arrive; fall back to the cached copy offline
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else {
    // Library files from unpkg: cache first
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
  }
});
