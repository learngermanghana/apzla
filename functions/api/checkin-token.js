const crypto = require('crypto')

const firestoreProjectId = process.env.FIRESTORE_PROJECT_ID
const firestoreToken = process.env.FIRESTORE_BEARER_TOKEN
const jwtSecret = process.env.CHECKIN_JWT_SECRET
const nonceCollection = process.env.FIRESTORE_CHECKIN_COLLECTION || 'checkinNonces'
const tokenTtlMinutes = Number(process.env.CHECKIN_TOKEN_TTL_MINUTES) || 30
const notificationCollection =
  process.env.FIRESTORE_NOTIFICATION_COLLECTION || 'notifications'
const appBaseUrl = process.env.APP_BASE_URL

const firestoreBase =
  firestoreProjectId &&
  `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents`

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${signature}`
}

function buildFirestoreFields(fields) {
  const mapped = {}

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (typeof value === 'boolean') {
      mapped[key] = { booleanValue: value }
    } else if (typeof value === 'number') {
      mapped[key] = { integerValue: value }
    } else if (value instanceof Date) {
      mapped[key] = { timestampValue: value.toISOString() }
    } else if (key.toLowerCase().includes('at') && typeof value === 'string') {
      // Accept preformatted timestamps
      mapped[key] = { timestampValue: value }
    } else {
      mapped[key] = { stringValue: String(value) }
    }
  })

  return mapped
}

async function writeNonceRecord(nonce, payload) {
  const endpoint = `${firestoreBase}/${nonceCollection}?documentId=${encodeURIComponent(
    nonce
  )}`

  const body = {
    fields: buildFirestoreFields({
      nonce,
      ...payload,
      consumed: false,
      status: 'issued',
      issuedAt: new Date(),
    }),
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${firestoreToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to write nonce: ${response.status} ${response.statusText} ${errorText}`
    )
  }
}

async function queueNotification({ email, link, memberId, churchId, serviceDate }) {
  if (!email) return null

  const endpoint = `${firestoreBase}/${notificationCollection}`
  const body = {
    fields: buildFirestoreFields({
      channel: 'email',
      email,
      link,
      memberId,
      churchId,
      serviceDate,
      status: 'queued',
      type: 'checkin-link',
      createdAt: new Date(),
      subject: 'Your check-in link',
      message: `Tap to check in for service: ${link}`,
    }),
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${firestoreToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to queue notification: ${response.status} ${response.statusText} ${errorText}`
    )
  }
}

async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  const { memberId, churchId, serviceDate, serviceType, email, baseUrl } =
    request.body || {}

  if (!memberId || !churchId || !serviceDate) {
    return response.status(400).json({
      status: 'error',
      message: 'memberId, churchId, and serviceDate are required.',
    })
  }

  if (!jwtSecret) {
    return response.status(500).json({
      status: 'error',
      message: 'CHECKIN_JWT_SECRET environment variable is not configured.',
    })
  }

  if (!firestoreProjectId || !firestoreToken) {
    return response.status(500).json({
      status: 'error',
      message:
        'FIRESTORE_PROJECT_ID and FIRESTORE_BEARER_TOKEN must be configured to issue tokens.',
    })
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + tokenTtlMinutes * 60
  const nonce = crypto.randomUUID()

  const payload = {
    memberId,
    churchId,
    serviceDate,
    serviceType: serviceType || 'Service',
    nonce,
    iat: issuedAt,
    exp: expiresAt,
  }

  const token = signJwt(payload)

  try {
    await writeNonceRecord(nonce, {
      memberId,
      churchId,
      serviceDate,
      serviceType: payload.serviceType,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    })

    const normalizedBase = (baseUrl || appBaseUrl || '').replace(/\/$/, '')
    const checkinLink = normalizedBase
      ? `${normalizedBase}/checkin?token=${encodeURIComponent(token)}`
      : null

    if (email && checkinLink) {
      await queueNotification({
        email,
        link: checkinLink,
        memberId,
        churchId,
        serviceDate,
      })
    }

    return response.status(200).json({
      status: 'success',
      token,
      nonce,
      link: checkinLink,
      expiresAt,
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
