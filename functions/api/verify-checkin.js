const crypto = require('crypto')

const firestoreProjectId = process.env.FIRESTORE_PROJECT_ID
const firestoreToken = process.env.FIRESTORE_BEARER_TOKEN
const jwtSecret = process.env.CHECKIN_JWT_SECRET
const nonceCollection = process.env.FIRESTORE_CHECKIN_COLLECTION || 'checkinNonces'

const firestoreBase =
  firestoreProjectId &&
  `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents`

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + padLength, '=')
  const buffer = Buffer.from(padded, 'base64')
  return buffer.toString('utf8')
}

function verifyJwt(token) {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Token format is invalid.')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const data = `${encodedHeader}.${encodedPayload}`
  const expected = crypto
    .createHmac('sha256', jwtSecret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) {
    throw new Error('Token signature mismatch.')
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Token signature mismatch.')
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))
  const now = Math.floor(Date.now() / 1000)

  if (payload.exp && now > payload.exp) {
    throw new Error('Token has expired.')
  }

  return payload
}

function parseFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null
  const fields = doc.fields
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if ('stringValue' in value) return [key, value.stringValue]
      if ('booleanValue' in value) return [key, value.booleanValue]
      if ('integerValue' in value) return [key, Number(value.integerValue)]
      if ('timestampValue' in value) return [key, value.timestampValue]
      return [key, null]
    })
  )
}

async function fetchNonce(nonce) {
  const endpoint = `${firestoreBase}/${nonceCollection}/${encodeURIComponent(nonce)}`
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${firestoreToken}`,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to read nonce: ${response.status} ${response.statusText} ${errorText}`
    )
  }

  const body = await response.json()
  return parseFirestoreDocument(body)
}

async function markNonceConsumed(nonce, metadata) {
  const endpoint = `${firestoreBase}/${nonceCollection}/${encodeURIComponent(
    nonce
  )}?updateMask.fieldPaths=consumed&updateMask.fieldPaths=consumedAt&updateMask.fieldPaths=consumedIp&updateMask.fieldPaths=status&updateMask.fieldPaths=lastVerifiedAt&updateMask.fieldPaths=lastVerificationMessage`

  const body = {
    fields: {
      consumed: { booleanValue: true },
      consumedAt: { timestampValue: new Date().toISOString() },
      consumedIp: metadata.ip
        ? { stringValue: metadata.ip }
        : { stringValue: '' },
      status: { stringValue: metadata.status || 'consumed' },
      lastVerifiedAt: { timestampValue: new Date().toISOString() },
      lastVerificationMessage: { stringValue: metadata.message || 'Consumed' },
    },
  }

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${firestoreToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to mark nonce consumed: ${response.status} ${response.statusText} ${errorText}`
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

  const { token } = request.body || {}

  if (!token) {
    return response.status(400).json({
      status: 'error',
      message: 'A token is required for verification.',
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
        'FIRESTORE_PROJECT_ID and FIRESTORE_BEARER_TOKEN must be configured to verify tokens.',
    })
  }

  let payload
  try {
    payload = verifyJwt(token)
  } catch (error) {
    return response.status(401).json({
      status: 'error',
      message: error.message || 'Invalid token.',
    })
  }

  try {
    const nonceRecord = await fetchNonce(payload.nonce)

    if (!nonceRecord) {
      return response.status(400).json({
        status: 'error',
        message: 'Nonce not recognized or already purged.',
      })
    }

    if (nonceRecord.consumed) {
      return response.status(409).json({
        status: 'error',
        message: 'This check-in link has already been used.',
      })
    }

    if (
      nonceRecord.memberId !== payload.memberId ||
      nonceRecord.churchId !== payload.churchId ||
      nonceRecord.serviceDate !== payload.serviceDate
    ) {
      return response.status(400).json({
        status: 'error',
        message: 'Token payload does not match stored nonce.',
      })
    }

    const nowIso = new Date().toISOString()
    if (nonceRecord.expiresAt && nowIso > nonceRecord.expiresAt) {
      await markNonceConsumed(payload.nonce, {
        ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress,
        status: 'expired',
        message: 'Token expired before verification.',
      })

      return response.status(401).json({
        status: 'error',
        message: 'This check-in link has expired.',
      })
    }

    await markNonceConsumed(payload.nonce, {
      ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress,
      status: 'consumed',
      message: 'Verified and consumed.',
    })

    return response.status(200).json({
      status: 'success',
      data: {
        memberId: payload.memberId,
        churchId: payload.churchId,
        serviceDate: payload.serviceDate,
        serviceType: payload.serviceType || 'Service',
        nonce: payload.nonce,
      },
      message: 'Check-in verified successfully.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to verify token.',
    })
  }
}

module.exports = handler
