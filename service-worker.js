const CACHE_NAME = 'trademind-app-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// Navigation Fallback Strategy (Network First -> Cache Fallback -> Offline Page)
self.addEventListener('fetch', event => {
  const req = event.request;
  
  // Navigation requests (HTML)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // 1. Try Network
        const networkResp = await fetch(req);
        // Update cache with fresh index.html if valid
        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
           const cache = await caches.open(CACHE_NAME);
           cache.put('./index.html', networkResp.clone());
        }
        return networkResp;
      } catch (error) {
        // 2. Network failed? Serve cached index.html (SPA Fallback)
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('./index.html');
        return cachedIndex || Response.error();
      }
    })());
    return;
  }

  // Asset requests (Images, JS, JSON) - Stale-While-Revalidate
  if (req.method === 'GET') {
     event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResp = await cache.match(req);
        
        const networkPromise = fetch(req).then(networkResp => {
           if(networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
              cache.put(req, networkResp.clone());
           }
           return networkResp;
        }).catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        return cachedResp || await networkPromise;
     })());
  }
});