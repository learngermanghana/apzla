const { admin, db, initError } = require('./lib/firestoreAdmin')
const { verifyJwt } = require('./lib/jwtHelpers')

const jwtSecret = process.env.CHECKIN_JWT_SECRET

async function findMemberByPhone(churchId, phone) {
  const normalizedPhone = `${phone || ''}`.trim()
  if (!normalizedPhone) return null

  const snap = await db
    .collection('members')
    .where('churchId', '==', churchId)
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get()

  return snap.empty ? null : snap.docs[0]
}

async function upsertAttendance({ memberId, churchId, serviceDate, serviceType }) {
  const key = `${serviceDate}_${serviceType}_${memberId}`
  const ref = db.collection('memberAttendance').doc(key)

  const existing = await ref.get()
  if (existing.exists) {
    return { alreadyPresent: true }
  }

  await ref.set({
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
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  if (initError) {
    return res.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  const { token, phone } = req.body || {}

  if (!token || !phone) {
    return res.status(400).json({
      status: 'error',
      message: 'token and phone are required.',
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
    return res.status(401).json({
      status: 'error',
      message: error.message || 'Invalid token.',
    })
  }

  const { churchId, serviceDate, serviceType = 'Service', mode } = payload || {}

  if (!churchId || !serviceDate) {
    return res.status(400).json({
      status: 'error',
      message: 'Token payload missing required fields.',
    })
  }

  if (mode && mode !== 'SELF') {
    return res.status(400).json({
      status: 'error',
      message: 'Token mode is not valid for self check-in.',
    })
  }

  try {
    const memberDoc = await findMemberByPhone(churchId, phone)

    if (!memberDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'No member found for that phone number in this church.',
      })
    }

    const memberId = memberDoc.id
    const attendanceResult = await upsertAttendance({
      memberId,
      churchId,
      serviceDate,
      serviceType,
    })

    return res.status(200).json({
      status: 'success',
      data: { memberId, churchId, serviceDate, serviceType, ...attendanceResult },
      message: attendanceResult.alreadyPresent
        ? 'You are already checked in for this service.'
        : 'Check-in recorded successfully.',
    })
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Unable to verify self check-in.',
    })
  }
}

module.exports = handler
