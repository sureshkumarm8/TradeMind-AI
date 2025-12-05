
const CACHE_NAME = 'trademind-app-v8';
// Only cache files we know exist. Do NOT cache png icons since we now use Data URIs in manifest.
// Caching missing files causes the Service Worker to fail installation.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .catch(err => console.error("SW Cache Error", err))
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
           cache.put('/index.html', networkResp.clone());
           cache.put('/', networkResp.clone()); // Explicitly cache root for PWA start_url check
        }
        return networkResp;
      } catch (error) {
        // 2. Network failed? Serve cached index.html (SPA Fallback)
        const cache = await caches.open(CACHE_NAME);
        // Try root first
        const cachedRoot = await cache.match('/');
        if (cachedRoot) return cachedRoot;
        // Try index.html
        const cachedIndex = await cache.match('/index.html');
        if (cachedIndex) return cachedIndex;
        
        return Response.error();
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