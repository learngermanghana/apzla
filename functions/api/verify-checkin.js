const { admin, db, initError } = require('../lib/firestoreAdmin')
const { verifyJwt } = require('../lib/jwtHelpers')

const jwtSecret = process.env.CHECKIN_JWT_SECRET
const nonceCollection = process.env.FIRESTORE_CHECKIN_COLLECTION || 'checkinNonces'

function getTimestampMillis(timestamp) {
  if (!timestamp) return null
  // Firestore Timestamp or any object with toMillis()
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }

  // Some other Firestore date-like object
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }

  // Fallback: string / number that Date can parse
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? null : parsed
}

async function fetchNonce(nonce) {
  const doc = await db.collection(nonceCollection).doc(nonce).get()
  if (!doc.exists) {
    return null
  }

  return { id: doc.id, ...doc.data() }
}

async function markNonceConsumed(nonce, metadata) {
  const updateData = {
    consumed: true,
    consumedAt: admin.firestore.FieldValue.serverTimestamp(),
    consumedIp: metadata.ip || '',
    status: metadata.status || 'consumed',
    lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastVerificationMessage: metadata.message || 'Consumed',
  }

  await db.collection(nonceCollection).doc(nonce).update(updateData)
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

  let payload
  try {
    payload = verifyJwt(token, jwtSecret)
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

    const expiresAtMillis = getTimestampMillis(nonceRecord.expiresAt)
    if (expiresAtMillis && Date.now() > expiresAtMillis) {
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
