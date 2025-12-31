export const formatChurchSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeChurchName = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, " ");

export const safeDecodeURIComponent = (value = "") => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};
