const SERVICE_WORKER_PATH = "/service-worker.js";
const CACHE_PREFIX = "apzla-offline-";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const TRUSTED_HOSTS = [
  "www.apzla.com",
  "apzla.com",
  "apzla.vercel.app",
  "apzla.app",
  "apzachurch.vercel.app",
];

async function cleanupStaleServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations.map(async (registration) => {
        const scriptUrl =
          registration.active?.scriptURL ||
          registration.waiting?.scriptURL ||
          registration.installing?.scriptURL;

        const isExpectedScript = scriptUrl?.includes(SERVICE_WORKER_PATH);

        if (!isExpectedScript) {
          await registration.unregister();
        }
      })
    );
  } catch (error) {
    console.error("Service worker cleanup failed:", error);
  }
}

async function cleanupStaleCaches() {
  if (!("caches" in window)) return;

  try {
    const keys = await caches.keys();
    const deletions = keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key));

    await Promise.all(deletions);
  } catch (error) {
    console.error("Cache cleanup failed:", error);
  }
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const { hostname, protocol } = window.location;
  const isLocalhost = LOCAL_HOSTS.includes(hostname);
  const isTrustedHost = isLocalhost || TRUSTED_HOSTS.includes(hostname);
  const isSecure = window.isSecureContext || protocol === "https:";

  // Avoid registration errors on insecure or untrusted origins.
  if (!isSecure || !isTrustedHost) return;

  window.addEventListener("load", () => {
    try {
      cleanupStaleServiceWorkers()
        .then(() => cleanupStaleCaches())
        .then(() => navigator.serviceWorker.register(SERVICE_WORKER_PATH))
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    } catch (error) {
      console.error("Service worker registration skipped:", error);
    }
  });
}
