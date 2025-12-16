const SERVICE_WORKER_PATH = "/service-worker.js";

function reloadWhenControllerChanges() {
  let hasRefreshed = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasRefreshed) return;
    hasRefreshed = true;
    window.location.reload();
  });
}

function activateUpdatedServiceWorker(registration) {
  const waitingWorker = registration.waiting;
  if (!waitingWorker) return false;

  reloadWhenControllerChanges();
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
  return true;
}

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
    navigator.serviceWorker
      .register(SERVICE_WORKER_PATH)
      .then((registration) => {
        if (activateUpdatedServiceWorker(registration)) return;

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              activateUpdatedServiceWorker(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
