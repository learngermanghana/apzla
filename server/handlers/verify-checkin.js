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

async function recordNonceVerification(nonce, metadata) {
  const updateData = {
    consumed: false,
    consumedAt: null,
    consumedIp: metadata.ip || '',
    status: metadata.status || 'active',
    lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastVerificationMessage: metadata.message || 'Verified',
    lastServiceCode: metadata.serviceCode || '',
    lastPhone: metadata.phone || '',
    verificationCount: admin.firestore.FieldValue.increment(1),
  }

  await db.collection(nonceCollection).doc(nonce).set(updateData, { merge: true })
}

function normalizePhone(phoneRaw) {
  const p = `${phoneRaw || ''}`.trim()
  if (!p) return ''

  let digits = p.replace(/[^\d+]/g, '')

  if (digits.startsWith('+233')) digits = `0${digits.slice(4)}`
  if (digits.startsWith('233')) digits = `0${digits.slice(3)}`

  return digits
}

async function findMemberByPhone(churchId, phoneRaw) {
  const trimmed = `${phoneRaw || ''}`.trim()
  const normalized = normalizePhone(phoneRaw)
  if (!trimmed && !normalized) return null

  if (trimmed) {
    const snap = await db
      .collection('members')
      .where('churchId', '==', churchId)
      .where('phone', '==', trimmed)
      .limit(1)
      .get()

    if (!snap.empty) return snap.docs[0]
  }

  if (normalized && normalized !== trimmed) {
    const snap = await db
      .collection('members')
      .where('churchId', '==', churchId)
      .where('phone', '==', normalized)
      .limit(1)
      .get()

    if (!snap.empty) return snap.docs[0]
  }

  return null
}

async function getChurchName(churchId) {
  if (!churchId) return null
  const snap = await db.collection('churches').doc(churchId).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  return data.name || null
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

  const { token, phone, serviceCode } = request.body || {}

  if (!token || !phone || !serviceCode) {
    return response.status(400).json({
      status: 'error',
      message: 'token, phone, and serviceCode are required for verification.',
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
        message: 'Service not found for this check-in link.',
      })
    }

    if (
      nonceRecord.churchId !== payload.churchId ||
      nonceRecord.serviceDate !== payload.serviceDate
    ) {
      return response.status(400).json({
        status: 'error',
        message: 'Token payload does not match stored service details.',
      })
    }

    const expiresAtMillis = getTimestampMillis(nonceRecord.expiresAt)
    if (expiresAtMillis && Date.now() > expiresAtMillis) {
      await recordNonceVerification(payload.nonce, {
        ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress,
        status: 'expired',
        message: 'Token expired before verification.',
      })

      return response.status(401).json({
        status: 'error',
        message: 'This check-in link has expired.',
      })
    }

    const expectedCode = `${nonceRecord.serviceCode || ''}`.trim()
    if (!expectedCode) {
      return response.status(400).json({
        status: 'error',
        message: 'Service code is not configured for this check-in link.',
      })
    }

    if (`${serviceCode}`.trim() !== expectedCode) {
      return response.status(400).json({
        status: 'error',
        message: 'Service code is incorrect. Please confirm with your church.',
      })
    }

    const memberDoc = await findMemberByPhone(payload.churchId, phone)
    if (!memberDoc) {
      return response.status(404).json({
        status: 'error',
        message: 'No member found for that phone number in this church.',
      })
    }

    const memberData = memberDoc.data() || {}
    const memberName = `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim()
    const churchName = await getChurchName(payload.churchId)

    await recordNonceVerification(payload.nonce, {
      ip: request.headers['x-forwarded-for'] || request.socket?.remoteAddress,
      status: 'verified',
      message: 'Verified and recorded.',
      serviceCode: expectedCode,
      phone,
    })

    return response.status(200).json({
      status: 'success',
      data: {
        memberId: memberDoc.id,
        memberName: memberName || memberData.displayName || memberData.fullName || '',
        churchId: payload.churchId,
        churchName: churchName || '',
        serviceDate: payload.serviceDate,
        serviceType: payload.serviceType || 'Service',
        nonce: payload.nonce,
        phone,
        serviceCode: expectedCode,
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
