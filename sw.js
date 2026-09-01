const CACHE_NAME = 'eyana-geez-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// iOS Safari Bug Patch: Strips the redirected flag from responses
function cleanResponse(response) {
  if (!response || !response.redirected) return response;
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Install Event - Pre-cache core files cleanly
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(url).then((response) => {
            if (!response.ok) throw new Error(`Network response failed for ${url}`);
            // Clean the response before saving it to the cache storage
            return cache.put(url, cleanResponse(response));
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up any old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve cached files safely with stripped redirect flags
self.addEventListener('fetch', (event) => {
  // Only handle same-origin navigation or asset requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cleanResponse(networkResponse.clone()));
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match('./index.html').then((cachedResponse) => {
            return cleanResponse(cachedResponse);
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cleanResponse(cachedResponse);
      }
      return fetch(event.request);
    })
  );
});
