export const PREFERRED_BASE_URL = "https://www.apzla.com";
const PREFERRED_HOSTNAME = "www.apzla.com";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export const normalizeBaseUrl = (rawBaseUrl) => {
  const fallback = PREFERRED_BASE_URL;
  const trimmed = (rawBaseUrl || "").trim();

  if (!trimmed) return fallback;

  const sanitized = trimmed.replace(/\/$/, "");
  const lower = sanitized.toLowerCase();

  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("apzla.vercel.app") ||
    lower.includes("apzla.app") ||
    (lower.includes("apzla.com") && !lower.includes("www.apzla.com"))
  ) {
    return fallback;
  }

  return sanitized || fallback;
};

export const enforcePreferredHost = () => {
  if (typeof window === "undefined") return;

  const { hostname, pathname, search, hash } = window.location;
  const lowerHost = (hostname || "").toLowerCase();
  const isLocalHost = LOCAL_HOSTS.includes(lowerHost) || lowerHost.endsWith(".local");

  if (isLocalHost || lowerHost === PREFERRED_HOSTNAME) return;

  const shouldRedirect =
    lowerHost.includes("apzla.vercel.app") ||
    lowerHost.includes("apzla.app") ||
    (lowerHost.includes("apzla.com") && !lowerHost.includes(PREFERRED_HOSTNAME));

  if (!shouldRedirect) return;

  const destination = `${PREFERRED_BASE_URL}${pathname}${search}${hash}`;
  window.location.replace(destination);
};
