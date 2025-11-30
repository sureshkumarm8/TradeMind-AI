const CACHE_NAME = 'trademind-app-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/favicon.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  const keep = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (keep.includes(k) ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

// Navigation handler — network-first with cache fallback so start_url works offline
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin === self.location.origin) {
    // HTML navigation requests
    if (req.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const networkResp = await fetch(req);
          // keep cached index.html updated
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', networkResp.clone()).catch(() => {});
          return networkResp;
        } catch (err) {
          const cached = await caches.match('/index.html');
          return cached || Response.error();
        }
      })());
      return;
    }

    // For other GET requests use stale-while-revalidate
    if (req.method === 'GET') {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            try { cache.put(req, networkResp.clone()); } catch (e) { /* ignore */ }
          }
          return networkResp;
        }).catch(() => null);
        return cached || (await networkPromise) || (await caches.match('/index.html'));
      })());
      return;
    }
  }

  // Default: let browser handle (cross-origin, non-GET, etc.)
});