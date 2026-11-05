/* HtmlArts Service Worker — Local-First Offline Cache */
const CACHE_NAME = 'htmlarts-cache-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './HtmlArtsServer.html',
  './HtmlArtsClient.html',
  './PageServer.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[HtmlArts SW] Pre-caching core application shell');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[HtmlArts SW] Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[HtmlArts SW] Removing stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Stale-while-revalidate strategy for same-origin resources
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // Fallback to cache if network fails

        return cachedResponse || fetchPromise;
      })
    );
  }
});
