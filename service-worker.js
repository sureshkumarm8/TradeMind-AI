
const CACHE_NAME = 'trademind-ai-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event: Handle requests
self.addEventListener('fetch', (event) => {
  // SPA Navigation Handler
  // If the request is a navigation (e.g. reloading the page, or going to start_url),
  // serve the index.html from cache. This ensures the app works offline even on deep links.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(event.request).catch(() => {
           // If network fails and not in cache (rare for index.html), strictly return index.html
           return caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Standard Stale-While-Revalidate or Cache-First for assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request);
      })
  );
});
