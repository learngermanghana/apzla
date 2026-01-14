import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();
const DEFAULT_REGION = import.meta.env.VITE_PHONE_DEFAULT_REGION || "GH";

export const normalizePhone = (value, defaultRegion = DEFAULT_REGION) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const sanitized = trimmed.replace(/^00/, "+");

  try {
    const number = phoneUtil.parseAndKeepRawInput(sanitized, defaultRegion);
    if (phoneUtil.isValidNumber(number)) {
      return phoneUtil.format(number, PhoneNumberFormat.E164);
    }
  } catch (error) {
    // Fall through to manual normalization.
  }

  const digits = sanitized.replace(/\D/g, "");
  if (!digits) return null;
  const countryCode = phoneUtil.getCountryCodeForRegion(defaultRegion);
  if (!countryCode) return null;

  if (digits.startsWith("0")) {
    return `+${countryCode}${digits.slice(1)}`;
  }

  const countryCodeString = String(countryCode);
  if (digits.startsWith(countryCodeString)) {
    return `+${digits}`;
  }

  return `+${digits}`;
};

export const formatPhoneForLink = (value, defaultRegion = DEFAULT_REGION) => {
  const normalized = normalizePhone(value, defaultRegion);
  return normalized ? normalized.replace(/\D/g, "") : "";
};
