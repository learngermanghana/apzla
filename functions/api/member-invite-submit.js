const { admin, db, initError } = require('../lib/firestoreAdmin')
const { verifyJwt } = require('../lib/jwtHelpers')

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || ''

async function findExistingMember({ churchId, phone, email }) {
  if (!churchId) return null

  const normalizedPhone = phone?.trim()
  const normalizedEmail = email?.trim()?.toLowerCase()

  const queries = []

  if (normalizedPhone) {
    queries.push(
      db
        .collection('members')
        .where('churchId', '==', churchId)
        .where('phone', '==', normalizedPhone)
        .limit(1)
        .get()
    )
  }

  if (normalizedEmail) {
    queries.push(
      db
        .collection('members')
        .where('churchId', '==', churchId)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get()
    )
  }

  if (queries.length === 0) return null

  const snapshots = await Promise.all(queries)

  for (const snap of snapshots) {
    if (!snap.empty) {
      const doc = snap.docs[0]
      return { id: doc.id, data: doc.data() }
    }
  }

  return null
}

module.exports = async function handler(request, response) {
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

  if (!jwtSecret) {
    return response.status(500).json({
      status: 'error',
      message:
        'MEMBER_INVITE_JWT_SECRET (or CHECKIN_JWT_SECRET) environment variable is not configured.',
    })
  }

  const {
    token,
    firstName,
    lastName,
    phone,
    email,
    status,
    dateOfBirth,
    photoUrl,
  } = request.body || {}

  if (!token) {
    return response.status(400).json({
      status: 'error',
      message: 'Invite token is required.',
    })
  }

  const trimmedPhone = (phone || '').trim()
  const trimmedFirst = (firstName || '').trim()
  const trimmedLast = (lastName || '').trim()
  const trimmedEmail = (email || '').trim().toLowerCase()
  const trimmedDob = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : ''
  const trimmedPhotoUrl = typeof photoUrl === 'string' ? photoUrl.trim() : ''

  if (!trimmedFirst && !trimmedLast) {
    return response.status(400).json({
      status: 'error',
      message: 'Please enter at least a first or last name.',
    })
  }

  if (!trimmedPhone && !trimmedEmail) {
    return response.status(400).json({
      status: 'error',
      message: 'Please enter a phone number or email so we can contact you.',
    })
  }

  try {
    const payload = verifyJwt(token, jwtSecret)

    if (payload.type !== 'member-invite') {
      return response.status(400).json({
        status: 'error',
        message: 'This invite token is not valid for member signup.',
      })
    }

    const churchId = payload.churchId

    const existing = await findExistingMember({
      churchId,
      phone: trimmedPhone,
      email: trimmedEmail,
    })

    if (existing) {
      return response.status(200).json({
        status: 'success',
        ok: true,
        memberId: existing.id,
        message: 'You are already on the list. Thank you for staying connected.',
      })
    }

    const docRef = await db.collection('members').add({
      churchId,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      phone: trimmedPhone,
      email: trimmedEmail,
      status: status || 'VISITOR',
      ...(trimmedDob ? { dateOfBirth: trimmedDob } : {}),
      ...(trimmedPhotoUrl ? { photoUrl: trimmedPhotoUrl } : {}),
      source: 'INVITE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return response.status(200).json({
      status: 'success',
      ok: true,
      memberId: docRef.id,
      message: 'Your details were received. Welcome!',
    })
  } catch (error) {
    const message = error.message || 'Unable to process invite.'
    const statusCode = message.includes('expired') ? 410 : 400
    return response.status(statusCode).json({
      status: 'error',
      message,
    })
  }
}
