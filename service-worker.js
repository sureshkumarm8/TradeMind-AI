
const CACHE_NAME = 'trademind-ai-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately so the first load is controlled
  event.waitUntil(self.clients.claim());
  
  // Cleanup old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Navigation Requests (HTML) - Cache First, then Network
  // This ensures the app loads instantly and works offline, satisfying PWA requirements.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        // Return cached index.html if available
        if (cached) return cached;
        
        // If not in cache (first load), fetch from network
        return fetch(request)
          .then((response) => {
            return response;
          })
          .catch(() => {
             // If offline and not in cache, try matching root
             return caches.match('/');
          });
      })
    );
    return;
  }

  // 2. Asset Requests - Stale While Revalidate
  // Serve from cache immediately, then update in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Update cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(request, responseToCache);
           });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
