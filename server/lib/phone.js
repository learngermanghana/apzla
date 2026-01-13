const { PhoneNumberUtil, PhoneNumberFormat } = require('google-libphonenumber')

const phoneUtil = PhoneNumberUtil.getInstance()
const DEFAULT_REGION = process.env.PHONE_DEFAULT_REGION || 'GH'

const normalizePhone = (value, defaultRegion = DEFAULT_REGION) => {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null

  const sanitized = trimmed.replace(/^00/, '+')

  try {
    const number = phoneUtil.parseAndKeepRawInput(sanitized, defaultRegion)
    if (phoneUtil.isValidNumber(number)) {
      return phoneUtil.format(number, PhoneNumberFormat.E164)
    }
  } catch (error) {
    // Fall through to manual normalization.
  }

  const digits = sanitized.replace(/\D/g, '')
  if (!digits) return null
  const countryCode = phoneUtil.getCountryCodeForRegion(defaultRegion)
  if (!countryCode) return null

  if (digits.startsWith('0')) {
    return `+${countryCode}${digits.slice(1)}`
  }

  const countryCodeString = String(countryCode)
  if (digits.startsWith(countryCodeString)) {
    return `+${digits}`
  }

  return `+${digits}`
}

module.exports = { normalizePhone }
