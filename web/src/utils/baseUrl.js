const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const rawBaseUrl =
  import.meta.env.VITE_PUBLIC_BASE_URL ||
  (typeof window !== "undefined" && window.location?.origin) ||
  "https://apzla.vercel.app";

export const normalizeBaseUrl = (rawBaseUrlValue) => {
  const fallback = rawBaseUrl;
  const trimmed = (rawBaseUrlValue || "").trim();

  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.origin.replace(/\/$/, "");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to parse base URL, using fallback.", error?.message);
    return fallback;
  }
};

export const PREFERRED_BASE_URL = normalizeBaseUrl(rawBaseUrl);

const PREFERRED_HOSTNAME = (() => {
  try {
    return new URL(PREFERRED_BASE_URL).hostname.toLowerCase();
  } catch {
    return "";
  }
})();

const SHOULD_ENFORCE_HOST = (() => {
  const explicitSetting = import.meta.env.VITE_ENFORCE_PREFERRED_HOST;

  if (explicitSetting !== undefined) {
    return explicitSetting.toString().toLowerCase() === "true";
  }

  // If a public base URL is configured, favor enforcing it by default so that
  // requests land on the canonical host (e.g., www.apzla.com) unless explicitly
  // disabled via VITE_ENFORCE_PREFERRED_HOST.
  return Boolean(import.meta.env.VITE_PUBLIC_BASE_URL);
})();

export const enforcePreferredHost = () => {
  if (!SHOULD_ENFORCE_HOST) return;
  if (typeof window === "undefined" || !PREFERRED_HOSTNAME) return;

  const { hostname, pathname, search, hash } = window.location;
  const lowerHost = (hostname || "").toLowerCase();
  const isLocalHost = LOCAL_HOSTS.includes(lowerHost) || lowerHost.endsWith(".local");

  if (isLocalHost || lowerHost === PREFERRED_HOSTNAME) return;

  const destination = `${PREFERRED_BASE_URL}${pathname}${search}${hash}`;
  window.location.replace(destination);
};
