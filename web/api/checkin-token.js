const crypto = require('crypto')
const { admin, db, initError } = require('./lib/firestoreAdmin')
const { signJwt } = require('./lib/jwtHelpers')

const jwtSecret = process.env.CHECKIN_JWT_SECRET
const nonceCollection = process.env.FIRESTORE_CHECKIN_COLLECTION || 'checkinNonces'
const tokenTtlMinutes = Number(process.env.CHECKIN_TOKEN_TTL_MINUTES) || 30
const notificationCollection =
  process.env.FIRESTORE_NOTIFICATION_COLLECTION || 'notifications'
const defaultBaseUrl = 'https://www.apzla.com'
const appBaseUrl = process.env.APP_BASE_URL || defaultBaseUrl

function generateServiceCode() {
  // Generates a 6-digit string with leading zeros if necessary
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

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

async function queueNotification({ email, link, memberId, churchId, serviceDate }) {
  if (!email) return null

  const sanitizedMemberId = memberId ?? null

  const data = {
    channel: 'email',
    email,
    link,
    memberId: sanitizedMemberId,
    churchId,
    serviceDate,
    status: 'queued',
    type: 'checkin-link',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    subject: 'Your check-in link',
    message: `Tap to check in for service: ${link}`,
  }

  await db.collection(notificationCollection).add(data)
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

  const { churchId, serviceDate, serviceType, email, baseUrl } =
    request.body || {}

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

  const serviceCode = generateServiceCode()

  const payload = {
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
      churchId,
      serviceDate,
      serviceType: payload.serviceType,
      serviceCode,
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt * 1000),
    })

    const normalizedBase = (baseUrl || appBaseUrl || '').replace(/\/$/, '')
    const checkinLink = normalizedBase
      ? `${normalizedBase}/checkin?token=${encodeURIComponent(token)}`
      : null
    const qrImageUrl = checkinLink
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          checkinLink
        )}`
      : null

    if (email && checkinLink) {
      await queueNotification({
        email,
        link: checkinLink,
        churchId,
        serviceDate,
      })
    }

    return response.status(200).json({
      status: 'success',
      token,
      nonce,
      link: checkinLink,
      qrImageUrl,
      expiresAt,
      serviceCode,
      message: 'Check-in token issued successfully.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to issue token.',
    })
  }
}

module.exports = handler
