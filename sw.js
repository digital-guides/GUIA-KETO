
/* SW seguro para GUIA-KETO (sin precache externo) */
const VERSION = "v2.0.1-1756177428";
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
  "./manifest-icons/icon-192.png",
  "./manifest-icons/icon-512.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await c.addAll(CORE_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Navegaciones: network-first con fallback a cache y luego offline.html
async function handleNavigation(req) {
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

// Imágenes mismo-origen: cache-first
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

// Otros assets mismo-origen: stale-while-revalidate
async function swr(req) {
  const c = await caches.open(CACHE_NAME);
  const cached = await c.match(req);
  const network = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => null);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos mismo-origen
  if (url.origin !== self.location.origin) return;

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
