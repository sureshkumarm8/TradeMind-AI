
const CACHE_NAME = 'trademind-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install Phase: Cache static assets and take control immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force this SW to become the active one immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Activate Phase: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim() // Take control of all open pages immediately
    ])
  );
});

// 3. Fetch Phase: Network-first for API, Cache-first for Assets, Fallback for Navigation
self.addEventListener('fetch', (event) => {
  // Handle Navigation Requests (HTML) - Critical for PWA Start URL to work offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(event.request);
      }).catch(() => {
        // If both cache and network fail, show offline page (mapped to index.html here)
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Handle Asset Requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache Hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
