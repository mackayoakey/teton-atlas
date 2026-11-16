// Teton Atlas app shell cache. Map tiles and map data are NOT cached here.
// Saved terrain (offline terrain, 1 m terrain) and map text live in their own caches and must survive app updates.
const CACHE = 'teton-atlas-shell-v12';
const DEM_CACHE = 'teton-dem-offline';
const KEEP = [DEM_CACHE, 'teton-dem1m', 'teton-glyphs'];   // saved on request by the app; must survive updates
const SHELL = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-contour@0.1.1/dist/index.min.js',
  'https://unpkg.com/pmtiles@3.2.1/dist/pmtiles.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(SHELL.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})))
  ).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Saved terrain tiles: use the offline copy first, so contour lines and hillshade also work without a connection
  if (url.hostname === 's3.amazonaws.com' && url.pathname.startsWith('/elevation-tiles-prod/')) {
    e.respondWith(caches.open(DEM_CACHE).then(c => c.match(req.url)).then(hit => hit || fetch(req)));
    return;
  }
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
