// Service worker for PWA installability and caching
const CACHE_NAME = "b2bfashion-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;

  // Network-only for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for documents (HTML pages) — always get fresh content
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          if (response.status === 200)
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for static assets (scripts, styles, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          // Clone synchronously, before anything starts consuming the body.
          // Doing this inside a later promise chain is racy: if respondWith
          // has already started reading the body, .clone() throws
          // "Response body is already used".
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch((err) => {
          // If we have a cached copy we already returned it; otherwise
          // surface a generic error response so respondWith doesn't throw.
          if (cached) return cached;
          throw err;
        });

      // Return cached immediately, update in background
      return cached || networkFetch;
    })
  );
});
