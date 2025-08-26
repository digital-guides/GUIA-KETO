
/* SW precache + auto-update (GUIA-KETO) */
const VERSION = "v3.0.0-1756181749";
const CACHE_NAME = `keto360-${VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./plan7dias.html",
  "./bono2-lista-compras.html",
  "./bono3-snacks.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

// Mensajería para saltar waiting desde la página (auto-update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await c.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Helpers
async function handleNavigation(req) {
  const url = new URL(req.url);
  // Para el plan: cache-first (mejor offline inmediato)
  if (url.pathname.endsWith('/plan7dias.html')) {
    const c = await caches.open(CACHE_NAME);
    const cached = await c.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      c.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached || caches.match('./offline.html');
    }
  }
  // Otros documentos: network-first con fallback
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const c = await caches.open(CACHE_NAME);
    c.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || caches.match('./offline.html');
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE_NAME);
  const cached = await c.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    c.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return cached;
  }
}

async function swr(req) {
  const c = await caches.open(CACHE_NAME);
  const cached = await c.match(req);
  const network = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => null);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // mismo-origen

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(handleNavigation(req));
    return;
  }
  if (req.destination === 'image') {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(swr(req));
});
