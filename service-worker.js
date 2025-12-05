const CACHE_NAME = 'trademind-app-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/index.tsx',
  '/App.tsx'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.warn('Failed to cache some resources:', err);
      // Cache essential files only if full caching fails
      return caches.open(CACHE_NAME).then(cache => 
        cache.addAll(['/', '/index.html', '/manifest.json'])
      );
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
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