/* SW con precache de 21 héroes (data: URIs se omiten porque ya son offline) */
const VERSION = 'v1.2.0-1756090819';
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

const PRECACHE_IMAGES = [
  "https://i.imgur.com/2dvlOvu.jpg",
  "https://i.imgur.com/G53q4y2.jpg",
  "https://i.imgur.com/WoYR1M7.jpg",
  "https://i.imgur.com/DggAAVo.jpg",
  "https://i.imgur.com/WfuQ0Ch.jpg",
  "https://i.imgur.com/dejwnbj.jpg",
  "https://i.imgur.com/tOp4z79.jpg",
  "https://i.imgur.com/QbUSdpe.jpg",
  "https://i.imgur.com/7PMidqb.jpg",
  "https://i.imgur.com/X6YA5ne.jpg",
  "https://i.imgur.com/HOS5zSe.jpg",
  "https://i.imgur.com/HBsaBpA.jpg",
  "https://i.imgur.com/6hVXqwi.jpg",
  "https://i.imgur.com/ARA0A8C.jpg",
  "https://i.imgur.com/fndDGbP.jpg",
  "https://i.imgur.com/FvCsYbR.jpg",
  "https://i.imgur.com/OjJ6OS9.jpg",
  "https://i.imgur.com/lmBO5Wu.jpg",
  "https://i.imgur.com/CaOvsId.jpg",
  "https://i.imgur.com/mnNQSu3.jpg"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await c.addAll([...CORE_ASSETS, ...PRECACHE_IMAGES]);
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navegaciones: network-first con offline fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(CACHE_NAME);
        c.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match('./offline.html');
      }
    })());
    return;
  }

  // Imágenes: cache-first
  if (req.destination === 'image') {
    event.respondWith((async () => {
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
    })());
    return;
  }

  // Otros assets: SWR
  event.respondWith((async () => {
    const c = await caches.open(CACHE_NAME);
    const cached = await c.match(req);
    const network = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => null);
    return cached || network;
  })());
});
