const CACHE_NAME = "apzla-offline-v4";
const OFFLINE_URL = "/offline.html";
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  "/",
  "/manifest.webmanifest",
  "/icons/apzla-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    })()
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (e.g., Firebase streaming endpoints) so they
  // bypass the service worker entirely and avoid caching errors.
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;

  // Avoid interfering with source map requests so developer tools can fall
  // back to the network (or show the native 404) instead of receiving the
  // offline HTML page, which causes JSON parse errors in the console.
  if (event.request.url.endsWith(".map")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        // Fall back to any cached response to avoid rejecting the request,
        // which causes the browser to report an "unexpected error" from the
        // service worker. If nothing is cached, return a generic error
        // response instead of throwing so the promise resolves gracefully.
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return Response.error();
      }
    })()
  );
});
