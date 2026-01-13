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
    if (!phoneUtil.isValidNumber(number)) {
      return null
    }

    return phoneUtil.format(number, PhoneNumberFormat.E164)
  } catch (error) {
    return null
  }
}

module.exports = { normalizePhone }
