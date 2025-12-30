const SERVICE_WORKER_PATH = "/service-worker.js";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  const isSecure = window.isSecureContext || window.location.protocol === "https:";

  // Avoid registration errors on insecure origins (e.g., http) except localhost.
  if (!isSecure && !isLocalhost) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
