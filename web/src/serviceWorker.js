const SERVICE_WORKER_PATH = "/service-worker.js";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
