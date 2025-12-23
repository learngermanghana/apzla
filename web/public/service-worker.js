const CACHE_NAME = "apzla-offline-v6"; // bump to force SW update
const OFFLINE_URL = "/offline.html";
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
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
      await Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)));
    })()
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.url.endsWith(".map")) return;

  // Optional: don't SW-cache Vite build assets at all (very safe)
  if (url.pathname.startsWith("/assets/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            try {
              await cache.put(event.request, response.clone());
            } catch (_) {}
          }
          return response;
        } catch (_) {
          const cached = await cache.match(event.request);
          return cached || (await cache.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);

      if (response && response.status === 200) {
        try {
          await cache.put(event.request, response.clone());
        } catch (_) {}
      }

      return response;
    })()
  );
});
