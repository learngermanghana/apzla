const SERVICE_WORKER_PATH = "/service-worker.js";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const TRUSTED_HOSTS = ["www.apzla.com", "apzla.com", "apzla.vercel.app", "apzla.app"];

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
      navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    } catch (error) {
      console.error("Service worker registration skipped:", error);
    }
  });
}
