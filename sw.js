// Keto Air Fryer 360° — Service Worker
// Bump VERSION on each deploy to force cache refresh.
const VERSION = 'v1.0.2-1756079057';
const CACHE_NAME = `keto360-${VERSION}`;

// Core files to precache (relative to the SW location)
const CORE_ASSETS = [
  'index.html',
  'offline.html',
  'manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// --- Strategies ---
async function networkFirst(req, opts = {}) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    if (opts.offlineFallback) {
      // Offline fallback only for HTML navigations
      return cache.match('offline.html') || new Response('Offline', { status: 503 });
    }
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => null);
  return cached || network;
}

// --- Routing ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always network-first for RAW GitHub images (avoid stale photos)
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(networkFirst(req));
    return;
  }

  // HTML pages / navigations: network-first with offline fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, { offlineFallback: true }));
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(req));
});
