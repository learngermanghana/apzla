export const PREFERRED_BASE_URL = "https://www.apzla.com";

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
