const { admin, db, initError } = require('../lib/firestoreAdmin')
const { verifyJwt } = require('../lib/jwtHelpers')

const jwtSecret = process.env.CHECKIN_JWT_SECRET

function parseBody(req) {
  if (!req || req.body == null) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  return (req.socket && req.socket.remoteAddress) || 'unknown'
}

// Adjust this if your stored phone format differs.
// This one removes spaces + hyphens, and trims.
function normalizePhone(phone) {
  return `${phone || ''}`.trim().replace(/[\s-]/g, '')
}

async function findMemberByPhone(churchId, phone) {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return null

  const snap = await db
    .collection('members')
    .where('churchId', '==', churchId)
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get()

  return snap.empty ? null : snap.docs[0]
}

async function upsertAttendanceTx(tx, { memberId, churchId, serviceDate, serviceType }) {
  const key = `${serviceDate}_${serviceType}_${memberId}`
  const ref = db.collection('memberAttendance').doc(key)

  const existing = await tx.get(ref)
  if (existing.exists) return { alreadyPresent: true }

  tx.set(ref, {
    memberId,
    churchId,
    serviceDate,
    serviceType,
    status: 'PRESENT',
    source: 'self-qr',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { alreadyPresent: false }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed. Use POST.' })
  }

  if (initError) {
    return res.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  const body = parseBody(req)

  // ✅ accept both payload styles
  const token = `${body.token || ''}`.trim()
  const phone = normalizePhone(body.phone || body.phoneNumber || '')
  const serviceCode = `${body.serviceCode || ''}`.trim()

  // ✅ REQUIRE ALL THREE
  if (!token || !phone || !serviceCode) {
    return res.status(400).json({
      status: 'error',
      message: 'token, phone (or phoneNumber), and serviceCode are required.',
    })
  }

  if (!jwtSecret) {
    return res.status(500).json({
      status: 'error',
      message: 'CHECKIN_JWT_SECRET environment variable is not configured.',
    })
  }

  let payload
  try {
    payload = verifyJwt(token, jwtSecret)
  } catch (error) {
    return res.status(401).json({ status: 'error', message: error.message || 'Invalid token.' })
  }

  const {
    churchId,
    serviceDate,
    serviceType = 'Service',
    mode,
    nonce,
  } = payload || {}

  // ✅ token must include nonce (your JWT sample includes it)
  if (!churchId || !serviceDate || !nonce) {
    return res.status(400).json({
      status: 'error',
      message: 'Token payload missing required fields (churchId, serviceDate, nonce).',
    })
  }

  if (mode && mode !== 'SELF') {
    return res.status(400).json({
      status: 'error',
      message: 'Token mode is not valid for self check-in.',
    })
  }

  // ✅ Validate member first (we need memberId for attendance)
  const memberDoc = await findMemberByPhone(churchId, phone)
  if (!memberDoc) {
    // You can keep this message generic if you prefer (to avoid phone enumeration)
    return res.status(404).json({
      status: 'error',
      message: 'No member found for that phone number in this church.',
    })
  }

  const memberId = memberDoc.id
  const clientIp = getClientIp(req)
  const nowMs = Date.now()

  try {
    const result = await db.runTransaction(async (tx) => {
      // ✅ Nonce doc is your service “session” record (shared QR)
      const nonceRef = db.collection('checkinNonces').doc(`${nonce}`)
      const nonceSnap = await tx.get(nonceRef)

      if (!nonceSnap.exists) {
        throw new Error('Invalid or expired check-in session.')
      }

      const nonceData = nonceSnap.data() || {}

      // ✅ Must match church + serviceCode + not closed + not expired
      if (nonceData.churchId && nonceData.churchId !== churchId) {
        throw new Error('Invalid check-in session.')
      }

      if (`${nonceData.serviceCode || ''}`.trim() !== serviceCode) {
        throw new Error('Invalid service code.')
      }

      // If you use `consumed` to mean “admin closed check-in”
      if (nonceData.consumed === true) {
        throw new Error('This service check-in is closed.')
      }

      const expiresAt = nonceData.expiresAt
      if (expiresAt && typeof expiresAt.toDate === 'function') {
        if (expiresAt.toDate().getTime() < nowMs) {
          throw new Error('This check-in link has expired.')
        }
      }

      // ✅ Rate limit: stop brute forcing service codes/phones
      const attemptKey = `${nonce}_${clientIp}`
      const attemptRef = db.collection('checkinAttempts').doc(attemptKey)
      const attemptSnap = await tx.get(attemptRef)
      const attemptData = attemptSnap.exists ? (attemptSnap.data() || {}) : {}

      const windowMs = 10 * 60 * 1000 // 10 minutes
      const lastAtMs = attemptData.lastAtMs || 0
      const count = attemptData.count || 0

      const withinWindow = (nowMs - lastAtMs) < windowMs
      const newCount = withinWindow ? (count + 1) : 1

      // Allow max 30 tries / 10 mins per IP per nonce
      if (newCount > 30) {
        throw new Error('Too many attempts. Please try again later.')
      }

      tx.set(attemptRef, { lastAtMs: nowMs, count: newCount }, { merge: true })

      // ✅ Upsert attendance (no duplicates)
      const attendanceResult = await upsertAttendanceTx(tx, {
        memberId,
        churchId,
        serviceDate,
        serviceType,
      })

      // ✅ optional: update stats on nonce doc (does NOT block others)
      tx.set(
        nonceRef,
        {
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          usedCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      )

      return attendanceResult
    })

    return res.status(200).json({
      status: 'success',
      data: { memberId, churchId, serviceDate, serviceType, ...result },
      message: result.alreadyPresent
        ? 'You are already checked in for this service.'
        : 'Check-in recorded successfully.',
    })
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Unable to verify self check-in.',
    })
  }
}

module.exports = handler
