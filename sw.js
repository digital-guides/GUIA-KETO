
/* SW FIX — paths aligned to repo root, precaches plan7dias.html */
const VERSION = "v2.0.3-1756178070";
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

  // same-origin only
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
