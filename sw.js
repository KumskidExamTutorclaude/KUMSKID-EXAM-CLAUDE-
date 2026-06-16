// KUMSKID Service Worker — Basic offline support
const CACHE_NAME = 'kumskid-v2'; // bumped: forces old caches to be cleared on next deploy
const FILES_TO_CACHE = [
  '/index.html',
  '/manifest.json'
];

// Install — cache the core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first for pages (so updates always show), cache-first for everything else
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Only handle requests from our own origin — never intercept Supabase/API/Flutterwave calls
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isPageRequest = event.request.mode === 'navigate' ||
    event.request.url.endsWith('.html') ||
    event.request.url.endsWith('/');

  if (isPageRequest) {
    // NETWORK FIRST — always try to get the latest HTML so updates show immediately.
    // Only fall back to cache if the user is offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // CACHE FIRST — for static assets (icons, css, js bundles) where staleness doesn't matter
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
