const crypto = require('crypto')
const { admin, db, initError } = require('./lib/firestoreAdmin')
const { signJwt } = require('./lib/jwtHelpers')

const jwtSecret = process.env.CHECKIN_JWT_SECRET
const nonceCollection = process.env.FIRESTORE_CHECKIN_COLLECTION || 'checkinNonces'
const tokenTtlMinutes = Number(process.env.CHECKIN_TOKEN_TTL_MINUTES) || 30
const defaultBaseUrl = 'https://www.apzla.com'
const appBaseUrl = process.env.APP_BASE_URL || defaultBaseUrl

async function writeNonceRecord(nonce, payload) {
  const data = {
    nonce,
    ...payload,
    consumed: false,
    status: 'issued',
    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await db.collection(nonceCollection).doc(nonce).set(data)
}

function buildCheckinLink(token, baseUrl) {
  const normalizedBase = (baseUrl || appBaseUrl || '').replace(/\/$/, '')
  if (!normalizedBase) return null

  return `${normalizedBase}/self-checkin?token=${encodeURIComponent(token)}`
}

async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  if (initError) {
    return response.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  const { churchId, serviceDate, serviceType, baseUrl } = request.body || {}

  if (!churchId || !serviceDate) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId and serviceDate are required.',
    })
  }

  if (!jwtSecret) {
    return response.status(500).json({
      status: 'error',
      message: 'CHECKIN_JWT_SECRET environment variable is not configured.',
    })
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + tokenTtlMinutes * 60
  const nonce = crypto.randomUUID()

  const payload = {
    mode: 'SELF',
    churchId,
    serviceDate,
    serviceType: serviceType || 'Service',
    nonce,
    iat: issuedAt,
    exp: expiresAt,
  }

  const token = signJwt(payload, jwtSecret)

  try {
    await writeNonceRecord(nonce, {
      mode: payload.mode,
      churchId,
      serviceDate,
      serviceType: payload.serviceType,
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt * 1000),
    })

    const checkinLink = buildCheckinLink(token, baseUrl)
    const qrImageUrl = checkinLink
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          checkinLink
        )}`
      : null

    return response.status(200).json({
      status: 'success',
      token,
      nonce,
      link: checkinLink,
      qrImageUrl,
      expiresAt,
      message: 'Self check-in token issued successfully.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to issue self check-in token.',
    })
  }
}

module.exports = handler
