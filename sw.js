/* SW Keto360 */
const VERSION = 'v1.0.0';
const CACHE_NAME = `keto360-{VERSION}`;
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./plan7dias.html",
  "./bono2-lista-compras.html",
  "./bono3-snacks.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./manifest-icons/icon-192.png",
  "./manifest-icons/icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))        
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResp = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResp.clone());
        return networkResp;
      } catch (err) {
        const cacheMatch = await caches.match(request);
        return cacheMatch || caches.match('./offline.html');
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then((networkResp) => {
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResp.clone()));
      return networkResp;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
