const { db, initError } = require('../lib/firestoreAdmin')
const { verifyJwt } = require('../lib/jwtHelpers')

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || ''

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use GET.',
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

  const token = request.query?.token

  if (!token) {
    return response.status(400).json({
      status: 'error',
      message: 'Invite token is required.',
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

    if (!churchId) {
      return response.status(400).json({
        status: 'error',
        message: 'Church ID is missing from the invite token.',
      })
    }

    const snapshot = await db.collection('churches').doc(churchId).get()

    if (!snapshot.exists) {
      return response.status(404).json({
        status: 'error',
        message: 'We could not find this church.',
      })
    }

    const data = snapshot.data() || {}

    return response.status(200).json({
      status: 'success',
      ok: true,
      church: {
        id: snapshot.id,
        name: data.name || data.churchName || snapshot.id,
        city: data.city || '',
        country: data.country || '',
      },
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
