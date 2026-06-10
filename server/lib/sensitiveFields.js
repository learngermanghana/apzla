const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'

const getKeyMaterial = () =>
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY ||
  process.env.SENSITIVE_FIELD_ENCRYPTION_KEY ||
  process.env.PAYSTACK_SECRET_KEY ||
  ''

const deriveKey = () => {
  const keyMaterial = getKeyMaterial()
  if (!keyMaterial) {
    const error = new Error('PAYOUT_ACCOUNT_ENCRYPTION_KEY environment variable is not configured.')
    error.statusCode = 500
    throw error
  }

  const trimmed = keyMaterial.trim()

  try {
    const decoded = Buffer.from(trimmed, 'base64')
    if (decoded.length === 32) return decoded
  } catch (error) {
    // Fall back to hashing below.
  }

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }

  return crypto.createHash('sha256').update(trimmed).digest()
}

const encryptSensitiveValue = (value) => {
  const plainText = typeof value === 'string' ? value.trim() : String(value || '').trim()
  if (!plainText) return null

  const key = deriveKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

const decryptSensitiveValue = (encryptedValue) => {
  if (!encryptedValue || typeof encryptedValue !== 'string') return ''

  const [version, ivBase64, tagBase64, encryptedBase64] = encryptedValue.split(':')
  if (version !== VERSION || !ivBase64 || !tagBase64 || !encryptedBase64) {
    const error = new Error('Invalid encrypted sensitive field format.')
    error.statusCode = 500
    throw error
  }

  const key = deriveKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

module.exports = {
  decryptSensitiveValue,
  encryptSensitiveValue,
}
